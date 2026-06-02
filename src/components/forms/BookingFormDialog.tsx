/**
 * Booking form — sectioned RHF + zod with multi-meal-pack accordion,
 * per-hall charges, additional items, % vs amount discounts, and a sticky
 * live billing panel powered by `computeBill()`.
 *
 * Layout:
 *   • Desktop (sm+): centered dialog, 3-col body + 1-col sticky billing rail.
 *   • Phone:         full-screen sheet, scroll body, sticky footer bar with
 *                    grand-total + due chip; tap to expand billing details.
 *
 * Slots are stored lowercase (`breakfast` | `lunch` | `hi-tea` | `dinner`)
 * to match the Bika enum; we render them via `mealSlotLabel()`.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray, useWatch, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HALLS, VENUES, BOOKINGS } from "@/lib/mock/data";
import { useOpsStore, newId } from "@/lib/api/store";
import type { Booking, MealPack, MealSlotId } from "@/lib/mock/types";
import { MEAL_SLOT_IDS, mealSlotLabel } from "@/lib/mock/types";
import { computeBill } from "@/lib/api/billing";
import { formatINR, formatINRShort } from "@/lib/format";

/* ───────────────────────────── schema ────────────────────────────── */

const packSchema = z.object({
  mealSlot: z.enum(["breakfast", "lunch", "hi-tea", "dinner"]),
  packName: z.string().trim().max(80).optional(),
  menuName: z.string().trim().min(1, "Menu name required").max(120),
  plates: z.coerce.number().int().min(0).max(20000),
  ratePerPlate: z.coerce.number().min(0),
  setupCost: z.coerce.number().min(0),
  extraCharges: z.coerce.number().min(0),
  hallRate: z.coerce.number().min(0),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

const hallSchema = z.object({
  hallId: z.string().min(1),
  charges: z.coerce.number().min(0),
});

const additionalSchema = z.object({
  description: z.string().trim().min(1, "Description").max(120),
  charges: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1).max(10000),
});

const schema = z.object({
  functionName: z.string().trim().min(1, "Function name is required").max(120),
  functionType: z.string().trim().min(1, "Function type is required").max(60),
  customerId: z.string().min(1, "Select a customer"),
  start: z.string().min(1, "Start required"),
  end: z.string().min(1, "End required"),
  expectedGuests: z.coerce.number().int().min(1).max(20000),
  confirmedGuests: z.coerce.number().int().min(0).max(20000),
  status: z.enum(["confirmed", "pencil", "quotation", "enquiry", "cancelled"]),
  halls: z.array(hallSchema).min(1, "Pick at least one hall"),
  packs: z.array(packSchema),
  additionalItems: z.array(additionalSchema),
  // discounts — % takes precedence over amount when both > 0
  discountAmount: z.coerce.number().min(0),
  discountPercentage: z.coerce.number().min(0).max(100),
  discountAmount2nd: z.coerce.number().min(0),
  discountPercentage2nd: z.coerce.number().min(0).max(100),
  advanceRequired: z.coerce.number().min(0),
  isQuotation: z.boolean(),
  isPencilBooking: z.boolean(),
  pencilExpiresAt: z.string().optional().or(z.literal("")),
  notes: z.string().max(2000).optional(),
  internalNotes: z.string().max(2000).optional(),
}).refine((v) => new Date(v.end) > new Date(v.start), {
  message: "End must be after start", path: ["end"],
});

type FormValues = z.infer<typeof schema>;

/* ───────────────────────────── helpers ────────────────────────────── */

const toLocalInput = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 16);
};

const blankPack = (slot: MealSlotId): z.infer<typeof packSchema> => ({
  mealSlot: slot,
  packName: "",
  menuName: `${mealSlotLabel(slot)} menu`,
  plates: 100,
  ratePerPlate: 600,
  setupCost: 0,
  extraCharges: 0,
  hallRate: 0,
  startTime: "",
  endTime: "",
  notes: "",
});

const defaults = (): FormValues => ({
  functionName: "",
  functionType: "Reception",
  customerId: "",
  start: toLocalInput(new Date()),
  end: toLocalInput(new Date(Date.now() + 4 * 3_600_000)),
  expectedGuests: 100,
  confirmedGuests: 0,
  status: "confirmed",
  halls: [],
  packs: [],
  additionalItems: [],
  discountAmount: 0,
  discountPercentage: 0,
  discountAmount2nd: 0,
  discountPercentage2nd: 0,
  advanceRequired: 0,
  isQuotation: false,
  isPencilBooking: false,
  pencilExpiresAt: "",
  notes: "",
  internalNotes: "",
});

const fromBooking = (b: Booking): FormValues => ({
  functionName: b.functionName,
  functionType: b.functionType,
  customerId: b.customerId,
  start: toLocalInput(b.start),
  end: toLocalInput(b.end),
  expectedGuests: b.expectedGuests,
  confirmedGuests: b.confirmedGuests,
  status: b.status,
  halls: b.halls.length ? b.halls : b.hallIds.map((hallId) => ({ hallId, charges: 0 })),
  packs: b.packs.map((p) => ({
    mealSlot: p.mealSlot,
    packName: p.packName ?? "",
    menuName: p.menuName,
    plates: p.plates,
    ratePerPlate: p.ratePerPlate,
    setupCost: p.setupCost,
    extraCharges: p.extraCharges,
    hallRate: p.hallRate,
    startTime: p.startTime ?? "",
    endTime: p.endTime ?? "",
    notes: p.notes ?? "",
  })),
  additionalItems: b.additionalItems,
  discountAmount: b.discountAmount,
  discountPercentage: b.discountPercentage,
  discountAmount2nd: b.discountAmount2nd,
  discountPercentage2nd: b.discountPercentage2nd,
  advanceRequired: b.advanceRequired,
  isQuotation: b.isQuotation,
  isPencilBooking: b.isPencilBooking,
  pencilExpiresAt: b.pencilExpiresAt ? toLocalInput(b.pencilExpiresAt) : "",
  notes: b.notes ?? "",
  internalNotes: b.internalNotes ?? "",
});

/* ───────────────────────────── dialog ────────────────────────────── */

export function BookingFormDialog({
  open, onOpenChange, booking, customers,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  booking?: Booking | null;
  customers: { id: string; name: string; phone: string }[];
}) {
  const upsertBooking = useOpsStore((s) => s.upsertBooking);
  const isNew = !booking;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(),
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    form.reset(booking ? fromBooking(booking) : { ...defaults(), customerId: customers[0]?.id ?? "" });
    setOpenPack(null);
  }, [open, booking, customers, form]);

  const [openPack, setOpenPack] = useState<MealSlotId | null>(null);
  const [showBill, setShowBill] = useState(false);

  const onSubmit = (v: FormValues) => {
    const packs: MealPack[] = v.packs.map((p) => ({
      mealSlot: p.mealSlot,
      slot: mealSlotLabel(p.mealSlot),
      packName: p.packName || undefined,
      menuName: p.menuName,
      plates: p.plates,
      ratePerPlate: p.ratePerPlate,
      setupCost: p.setupCost,
      extraCharges: p.extraCharges,
      hallRate: p.hallRate,
      startTime: p.startTime || undefined,
      endTime: p.endTime || undefined,
      items: [],
      notes: p.notes || undefined,
    }));
    const start = new Date(v.start);
    const end = new Date(v.end);
    const hallCharges = v.halls.reduce((s, h) => s + h.charges, 0);
    const additionalItems = v.additionalItems;
    const next: Booking = {
      ...(booking ?? {}),
      id: booking?.id ?? newId("BK"),
      source: booking?.source ?? "in-app",
      functionName: v.functionName,
      functionType: v.functionType,
      customerId: v.customerId,
      start,
      end,
      status: v.status,
      halls: v.halls,
      hallIds: v.halls.map((h) => h.hallId),
      hallCharges,
      expectedGuests: v.expectedGuests,
      confirmedGuests: v.confirmedGuests,
      packs,
      additionalItems,
      extras: additionalItems.map((x) => ({ label: x.description, amount: x.charges * x.quantity })),
      discountAmount: v.discountAmount,
      discountPercentage: v.discountPercentage,
      discountAmount2nd: v.discountAmount2nd,
      discountPercentage2nd: v.discountPercentage2nd,
      discount1: v.discountAmount,
      discount2Pct: v.discountPercentage2nd,
      settlementDiscount: booking?.settlementDiscount ?? 0,
      taxPct: booking?.taxPct ?? 0,
      advanceRequired: v.advanceRequired,
      isQuotation: v.isQuotation,
      isPencilBooking: v.isPencilBooking,
      pencilExpiresAt: v.pencilExpiresAt ? new Date(v.pencilExpiresAt) : undefined,
      payments: booking?.payments ?? [],
      notes: v.notes || undefined,
      internalNotes: v.internalNotes || undefined,
      versions: (booking?.versions ?? 0) + (isNew ? 1 : 1),
    } as Booking;
    upsertBooking(next, { isNew });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-full h-[100dvh] rounded-none p-0 sm:max-w-5xl sm:h-[90vh] sm:rounded-sm bg-surface border-border flex flex-col gap-0"
      >
        <DialogTitle className="sr-only">{isNew ? "New booking" : `Edit ${booking?.id}`}</DialogTitle>
        <Header isNew={isNew} bookingId={booking?.id} />
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-0"
        >
          <div className="overflow-y-auto scrollbar-thin p-3 sm:p-4 space-y-4 pb-32 lg:pb-4">
            <FunctionSection form={form} customers={customers} />
            <HallsSection form={form} />
            <PacksSection form={form} openPack={openPack} setOpenPack={setOpenPack} />
            <ExtrasSection form={form} />
            <DiscountsSection form={form} />
            <NotesSection form={form} />
          </div>

          {/* Desktop sticky billing rail */}
          <aside className="hidden lg:flex flex-col border-l border-border bg-surface-2/30 overflow-y-auto scrollbar-thin">
            <BillingPanel form={form} />
            <FormFooter onCancel={() => onOpenChange(false)} isNew={isNew} />
          </aside>

          {/* Phone sticky bottom bar */}
          <MobileFooter
            form={form}
            isNew={isNew}
            onCancel={() => onOpenChange(false)}
            showBill={showBill}
            setShowBill={setShowBill}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────────── header ────────────────────────────── */

function Header({ isNew, bookingId }: { isNew: boolean; bookingId?: string }) {
  return (
    <header className="shrink-0 px-3 sm:px-4 py-2.5 border-b border-border flex items-center justify-between">
      <div className="min-w-0">
        <div className="mono text-[10px] uppercase tracking-widest text-faint">
          {isNew ? "New booking" : `Edit booking`}
        </div>
        <div className="mono text-[11px] text-muted truncate">{bookingId ?? "auto-id on save"}</div>
      </div>
    </header>
  );
}

/* ─────────────────────────── sections ────────────────────────────── */

type F = ReturnType<typeof useForm<FormValues>>;

function FunctionSection({ form, customers }: { form: F; customers: { id: string; name: string; phone: string }[] }) {
  const { register, formState: { errors }, control } = form;
  const isPencil = useWatch({ control, name: "isPencilBooking" });
  return (
    <Section title="Function">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Function name" err={errors.functionName?.message}>
          <input className={inp} placeholder="e.g. Sharma Reception" {...register("functionName")} />
        </Field>
        <Field label="Function type" err={errors.functionType?.message}>
          <input className={inp} placeholder="Wedding, Birthday…" {...register("functionType")} />
        </Field>
        <Field label="Customer" err={errors.customerId?.message}>
          <select className={inp} {...register("customerId")}>
            <option value="">— Select —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={inp} {...register("status")}>
            <option value="confirmed">Confirmed</option>
            <option value="pencil">Pencil</option>
            <option value="quotation">Quotation</option>
            <option value="enquiry">Enquiry</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <Field label="Start" err={errors.start?.message}>
          <input type="datetime-local" className={inp} {...register("start")} />
        </Field>
        <Field label="End" err={errors.end?.message}>
          <input type="datetime-local" className={inp} {...register("end")} />
        </Field>
        <Field label="Expected guests" err={errors.expectedGuests?.message}>
          <input type="number" inputMode="numeric" className={inp} {...register("expectedGuests")} />
        </Field>
        <Field label="Confirmed guests" err={errors.confirmedGuests?.message}>
          <input type="number" inputMode="numeric" className={inp} {...register("confirmedGuests")} />
        </Field>
        <Field label="Flags" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            <Toggle control={control} name="isQuotation" label="Quotation only" />
            <Toggle control={control} name="isPencilBooking" label="Pencil booking" />
            {isPencil && (
              <label className="flex items-center gap-1.5">
                <span className="text-[10px] mono uppercase tracking-widest text-muted">Expires</span>
                <input type="datetime-local" className={inp + " w-44"} {...register("pencilExpiresAt")} />
              </label>
            )}
          </div>
        </Field>
      </div>
    </Section>
  );
}

function HallsSection({ form }: { form: F }) {
  const { control, formState: { errors }, register, getValues, setValue, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "halls" });
  const start = watch("start");
  const end = watch("end");

  const selectedIds = new Set(fields.map((f) => f.hallId));

  const clashes = useMemo(() => {
    if (!start || !end) return new Set<string>();
    const s = +new Date(start);
    const e = +new Date(end);
    const out = new Set<string>();
    for (const b of BOOKINGS) {
      const bs = +b.start, be = +b.end;
      if (be <= s || bs >= e) continue;
      for (const id of b.hallIds) out.add(id);
    }
    return out;
  }, [start, end]);

  return (
    <Section
      title={`Halls (${fields.length})`}
      hint={errors.halls?.message as string | undefined}
    >
      {/* hall picker */}
      <div className="border border-border bg-bg max-h-44 overflow-y-auto scrollbar-thin">
        {VENUES.map((v) => (
          <div key={v.id} className="border-b border-border/60 last:border-0">
            <div className="px-2 py-1 mono text-[10px] uppercase tracking-widest text-muted bg-surface-2/40">{v.name}</div>
            {HALLS.filter((h) => h.venueId === v.id).map((h) => {
              const checked = selectedIds.has(h.id);
              const clash = clashes.has(h.id);
              return (
                <label key={h.id} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-surface-2 text-[11px] min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        append({ hallId: h.id, charges: h.basePrice ?? 0 });
                      } else {
                        const idx = getValues("halls").findIndex((x) => x.hallId === h.id);
                        if (idx >= 0) remove(idx);
                      }
                    }}
                  />
                  <span className="truncate">{h.name}</span>
                  {clash && !checked && (
                    <span className="ml-1 mono text-[9px] uppercase tracking-widest text-conflict">clash</span>
                  )}
                  <span className="ml-auto mono text-[10px] text-muted shrink-0">cap {h.capacity}</span>
                </label>
              );
            })}
          </div>
        ))}
      </div>

      {/* selected halls with charges */}
      {fields.length > 0 && (
        <div className="mt-2 border border-border">
          <div className="grid grid-cols-[1fr_auto_auto] gap-2 px-2 py-1 mono text-[9px] uppercase tracking-widest text-faint bg-surface-2/40">
            <span>Hall</span><span>Charge ₹</span><span></span>
          </div>
          {fields.map((f, i) => {
            const hall = HALLS.find((h) => h.id === f.hallId);
            return (
              <div key={f.id} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center px-2 py-1.5 border-t border-border/60">
                <span className="text-[12px] truncate">{hall?.name ?? f.hallId}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={inp + " w-28 text-right"}
                  {...register(`halls.${i}.charges`)}
                  onChange={(e) => setValue(`halls.${i}.charges`, Number(e.target.value) || 0, { shouldValidate: true })}
                />
                <button type="button" onClick={() => remove(i)} className="text-muted hover:text-conflict text-[11px] mono uppercase tracking-widest px-1">×</button>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function PacksSection({
  form, openPack, setOpenPack,
}: {
  form: F;
  openPack: MealSlotId | null;
  setOpenPack: (s: MealSlotId | null) => void;
}) {
  const { control, register, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "packs" });
  const packs = useWatch({ control, name: "packs" });

  const usedSlots = new Set((fields ?? []).map((f) => f.mealSlot as MealSlotId));
  const availableSlots = MEAL_SLOT_IDS.filter((s) => !usedSlots.has(s));

  return (
    <Section title={`Meal packs (${fields.length})`} hint={errors.packs?.message as string | undefined}>
      {fields.length === 0 && (
        <div className="text-[11px] text-muted mb-2">No packs yet. Add one for each meal you'll serve.</div>
      )}
      <div className="space-y-1.5">
        {fields.map((field, i) => {
          const slot = field.mealSlot as MealSlotId;
          const p = packs?.[i];
          const subtotal = p
            ? (p.plates ?? 0) * (p.ratePerPlate ?? 0) + (p.setupCost ?? 0) + (p.extraCharges ?? 0) + (p.hallRate ?? 0)
            : 0;
          const isOpen = openPack === slot;
          return (
            <div key={field.id} className="border border-border bg-bg">
              <button
                type="button"
                onClick={() => setOpenPack(isOpen ? null : slot)}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-left hover:bg-surface-2 min-h-[40px]"
              >
                <span className="mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 border border-border text-fg">
                  {mealSlotLabel(slot)}
                </span>
                <span className="text-[11px] text-muted truncate min-w-0">
                  {p?.menuName || "—"} · {p?.plates ?? 0} pax
                </span>
                <span className="ml-auto mono text-[11px] font-medium shrink-0">{formatINRShort(subtotal)}</span>
                <span className="mono text-[10px] text-muted shrink-0">{isOpen ? "▴" : "▾"}</span>
              </button>
              {isOpen && (
                <div className="border-t border-border p-2.5 space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field label="Pack name (optional)">
                      <input className={inp} placeholder="e.g. Veg Premium" {...register(`packs.${i}.packName`)} />
                    </Field>
                    <Field label="Menu name" err={errors.packs?.[i]?.menuName?.message}>
                      <input className={inp} {...register(`packs.${i}.menuName`)} />
                    </Field>
                    <Field label="Plates (PAX)">
                      <input type="number" inputMode="numeric" className={inp} {...register(`packs.${i}.plates`)} />
                    </Field>
                    <Field label="Rate / plate">
                      <input type="number" inputMode="numeric" className={inp} {...register(`packs.${i}.ratePerPlate`)} />
                    </Field>
                    <Field label="Setup cost">
                      <input type="number" inputMode="numeric" className={inp} {...register(`packs.${i}.setupCost`)} />
                    </Field>
                    <Field label="Extra charges">
                      <input type="number" inputMode="numeric" className={inp} {...register(`packs.${i}.extraCharges`)} />
                    </Field>
                    <Field label="Hall rate (per pack)">
                      <input type="number" inputMode="numeric" className={inp} {...register(`packs.${i}.hallRate`)} />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Start">
                        <input type="time" className={inp} {...register(`packs.${i}.startTime`)} />
                      </Field>
                      <Field label="End">
                        <input type="time" className={inp} {...register(`packs.${i}.endTime`)} />
                      </Field>
                    </div>
                  </div>
                  <Field label="Pack notes">
                    <textarea rows={2} className={inp} {...register(`packs.${i}.notes`)} />
                  </Field>
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] text-muted">Pack subtotal</span>
                    <span className="mono text-[12px] font-medium">{formatINR(subtotal)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { remove(i); if (openPack === slot) setOpenPack(null); }}
                    className="text-[10px] mono uppercase tracking-widest text-conflict hover:underline"
                  >Remove pack</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {availableSlots.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSlots.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { append(blankPack(s)); setOpenPack(s); }}
              className="px-2 py-1 mono text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2"
            >+ {mealSlotLabel(s)}</button>
          ))}
        </div>
      )}
    </Section>
  );
}

function ExtrasSection({ form }: { form: F }) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "additionalItems" });
  return (
    <Section title={`Additional items (${fields.length})`}>
      {fields.length === 0 && <div className="text-[11px] text-muted mb-2">Decor, DJ, valet, etc.</div>}
      <div className="space-y-1.5">
        {fields.map((f, i) => (
          <div key={f.id} className="grid grid-cols-[1fr_5rem_5rem_auto] gap-2 items-center">
            <input className={inp} placeholder="Description" {...register(`additionalItems.${i}.description`)} />
            <input type="number" inputMode="numeric" className={inp + " text-right"} placeholder="Qty" {...register(`additionalItems.${i}.quantity`)} />
            <input type="number" inputMode="numeric" className={inp + " text-right"} placeholder="₹" {...register(`additionalItems.${i}.charges`)} />
            <button type="button" onClick={() => remove(i)} className="text-muted hover:text-conflict mono text-[12px] px-1">×</button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => append({ description: "", charges: 0, quantity: 1 })}
        className="mt-2 px-2 py-1 mono text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2"
      >+ Add item</button>
    </Section>
  );
}

function DiscountsSection({ form }: { form: F }) {
  const { register, control, setValue } = form;
  const dPct  = useWatch({ control, name: "discountPercentage" });
  const dPct2 = useWatch({ control, name: "discountPercentage2nd" });
  return (
    <Section title="Discounts & advance">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Meals discount">
          <div className="flex gap-1.5">
            <input
              type="number" inputMode="numeric" className={inp + " flex-1"}
              placeholder="₹ amount" disabled={(dPct ?? 0) > 0}
              {...register("discountAmount")}
            />
            <span className="text-faint self-center mono text-[10px]">or</span>
            <input
              type="number" inputMode="numeric" className={inp + " w-20"}
              placeholder="%" max={100}
              {...register("discountPercentage", { onChange: (e) => {
                if (Number(e.target.value) > 0) setValue("discountAmount", 0);
              } })}
            />
          </div>
        </Field>
        <Field label="Extras discount">
          <div className="flex gap-1.5">
            <input
              type="number" inputMode="numeric" className={inp + " flex-1"}
              placeholder="₹ amount" disabled={(dPct2 ?? 0) > 0}
              {...register("discountAmount2nd")}
            />
            <span className="text-faint self-center mono text-[10px]">or</span>
            <input
              type="number" inputMode="numeric" className={inp + " w-20"}
              placeholder="%" max={100}
              {...register("discountPercentage2nd", { onChange: (e) => {
                if (Number(e.target.value) > 0) setValue("discountAmount2nd", 0);
              } })}
            />
          </div>
        </Field>
        <Field label="Advance required (₹)">
          <input type="number" inputMode="numeric" className={inp} {...register("advanceRequired")} />
        </Field>
      </div>
    </Section>
  );
}

function NotesSection({ form }: { form: F }) {
  const { register } = form;
  return (
    <Section title="Notes">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Field label="Customer-facing notes">
          <textarea rows={3} className={inp} {...register("notes")} />
        </Field>
        <Field label="Internal notes">
          <textarea rows={3} className={inp} {...register("internalNotes")} />
        </Field>
      </div>
    </Section>
  );
}

/* ───────────────────────── billing panel ────────────────────────── */

function useLiveBill(form: F) {
  const v = useWatch({ control: form.control });
  return useMemo(() => computeBill({
    packs: ((v.packs ?? []) as MealPack[]),
    additionalItems: ((v.additionalItems ?? []) as { description?: string; charges?: number; quantity?: number }[])
      .map((x) => ({ description: x.description ?? "", charges: Number(x.charges ?? 0), quantity: Number(x.quantity ?? 1) })),
    discountAmount: v.discountAmount ?? 0,
    discountPercentage: v.discountPercentage ?? 0,
    discountAmount2nd: v.discountAmount2nd ?? 0,
    discountPercentage2nd: v.discountPercentage2nd ?? 0,
    payments: [],
  }), [v]);
}

function BillingPanel({ form }: { form: F }) {
  const bill = useLiveBill(form);
  const advance = useWatch({ control: form.control, name: "advanceRequired" }) ?? 0;
  const packs = (useWatch({ control: form.control, name: "packs" }) ?? []) as MealPack[];
  return (
    <div className="p-3 flex-1 mono text-[11px]">
      <div className="mono text-[9px] uppercase tracking-widest text-faint mb-3">Live billing</div>
      {packs.map((p, i) => (
        <Row key={i} k={`${mealSlotLabel(p.mealSlot)} · ${p.plates ?? 0}×${formatINR(p.ratePerPlate ?? 0)}`} v={formatINR(bill.packAmounts[i] ?? 0)} />
      ))}
      <Row k="Meals subtotal" v={formatINR(bill.mealsSubtotal)} muted />
      {bill.mealsDiscount > 0 && <Row k="− Meals discount" v={`- ${formatINR(bill.mealsDiscount)}`} color="var(--conflict)" />}
      {bill.extrasSubtotal > 0 && <Row k="+ Extras" v={formatINR(bill.extrasSubtotal)} />}
      <div className="h-px bg-border my-2" />
      <Row k="GRAND TOTAL" v={formatINR(bill.grandTotal)} bold />
      {bill.extrasDiscount > 0 && <Row k="− Extras discount" v={`- ${formatINR(bill.extrasDiscount)}`} color="var(--conflict)" />}
      <Row k="Final amount" v={formatINR(bill.finalAmount)} bold />
      <div className="h-px bg-border my-2" />
      <Row k="Advance required" v={formatINR(advance)} />
      <Row k="Due" v={formatINR(bill.dueAmount)} color={bill.dueAmount > 0 ? "var(--conflict)" : "var(--confirmed)"} bold />
    </div>
  );
}

/* ─────────────────────────── footers ────────────────────────────── */

function FormFooter({ onCancel, isNew }: { onCancel: () => void; isNew: boolean }) {
  return (
    <div className="shrink-0 border-t border-border p-3 flex gap-2 bg-surface">
      <button type="button" onClick={onCancel} className="flex-1 h-9 px-3 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
      <button type="submit" className="flex-1 h-9 px-3 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">
        {isNew ? "Create" : "Save"}
      </button>
    </div>
  );
}

function MobileFooter({
  form, isNew, onCancel, showBill, setShowBill,
}: {
  form: F; isNew: boolean; onCancel: () => void;
  showBill: boolean; setShowBill: (b: boolean) => void;
}) {
  const bill = useLiveBill(form);
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-surface z-10">
      {showBill && (
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin border-b border-border">
          <BillingPanel form={form} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowBill(!showBill)}
        className="w-full px-3 py-2 flex items-center justify-between border-b border-border hover:bg-surface-2"
      >
        <span className="mono text-[10px] uppercase tracking-widest text-muted">Bill</span>
        <span className="mono text-[11px]">
          Total <strong>{formatINRShort(bill.finalAmount)}</strong>
          <span className={`ml-2 ${bill.dueAmount > 0 ? "text-conflict" : "text-confirmed"}`}>
            Due {formatINRShort(bill.dueAmount)}
          </span>
        </span>
        <span className="mono text-[10px] text-muted">{showBill ? "▾" : "▴"}</span>
      </button>
      <div className="flex gap-2 p-2">
        <button type="button" onClick={onCancel} className="flex-1 h-11 px-3 text-[11px] uppercase tracking-widest mono border border-border">Cancel</button>
        <button type="submit" className="flex-1 h-11 px-3 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">
          {isNew ? "Create" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── primitives ─────────────────────────── */

const inp = "w-full h-9 sm:h-8 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent rounded-none";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-surface p-3">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="mono text-[10px] uppercase tracking-widest text-faint">{title}</h3>
        {hint && <span className="text-[10px] text-conflict">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({
  label, children, err, className,
}: { label: string; children: React.ReactNode; err?: string; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">{label}</div>
      {children}
      {err && <div className="text-[10px] text-conflict mt-0.5">{err}</div>}
    </label>
  );
}

function Toggle({ control, name, label }: { control: F["control"]; name: "isQuotation" | "isPencilBooking"; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <button
          type="button"
          onClick={() => field.onChange(!field.value)}
          className={`px-2 h-8 mono text-[10px] uppercase tracking-widest border ${field.value ? "border-accent text-fg bg-accent/10" : "border-border text-muted"}`}
        >{field.value ? "✓ " : ""}{label}</button>
      )}
    />
  );
}

function Row({ k, v, color, bold, muted }: { k: string; v: string; color?: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-0.5">
      <span className={`${muted ? "text-muted" : ""} ${bold ? "font-medium" : ""}`}>{k}</span>
      <span className={`${bold ? "font-medium" : ""}`} style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}
