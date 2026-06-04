/**
 * Booking form — visual layout modelled after the Bika reference screenshot.
 *
 *   ┌─ Booking Form ───────────────────────────────────────────── × ┐
 *   │  Booking Details                                              │
 *   │  Primary Customer · Priority · Function Date                  │
 *   │  Function Type · Referred By · Second Customer                │
 *   │  [ ] Pencil Booking — temporary hall hold                     │
 *   │                                                                │
 *   │  Meal table (Breakfast / Lunch / Hi-Tea / Dinner)             │
 *   │  cols: Meal · Banquet · Hall · Time · Menu · Pax · Rate ·     │
 *   │        Hall Rate · Amount                                      │
 *   │                                                                │
 *   │  Total strip (mint) · Disc% · Discount · Net amount            │
 *   │  Extra items · Grand total                                    │
 *   │                                                                │
 *   │  Cancel · Submit                          [Finalize Version]   │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * The Bika meal-slot enum is stored lowercase (`breakfast` etc.) — see
 * `MealSlotId` — and the four meal rows are always rendered; toggling the
 * pill at row-start adds/removes the matching pack in the form state.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useForm, useFieldArray, useWatch, Controller, type Control, type UseFormRegister, type UseFormSetValue } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { HALLS, VENUES } from "@/lib/mock/data";
import { useOpsStore, newId } from "@/lib/api/store";
import { useCurrentUser } from "@/lib/auth/store";
import type { Booking, MealPack, MealSlotId } from "@/lib/mock/types";
import { MEAL_SLOT_IDS, mealSlotLabel } from "@/lib/mock/types";
import { computeBill } from "@/lib/api/billing";
import { formatINR } from "@/lib/format";

/* ───────────────────────────── schema ────────────────────────────── */

const packSchema = z.object({
  mealSlot: z.enum(["breakfast", "lunch", "hi-tea", "dinner"]),
  enabled: z.boolean(),
  venueId: z.string().optional().or(z.literal("")),
  hallId: z.string().optional().or(z.literal("")),
  menuName: z.string().max(120).optional().or(z.literal("")),
  plates: z.coerce.number().int().min(0).max(20000),
  ratePerPlate: z.coerce.number().min(0),
  hallRate: z.coerce.number().min(0),
  startTime: z.string().optional().or(z.literal("")),
  endTime: z.string().optional().or(z.literal("")),
});

const additionalSchema = z.object({
  description: z.string().trim().min(1, "Description").max(120),
  charges: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1).max(10000),
});

const schema = z.object({
  customerId: z.string().min(1, "Select a primary customer"),
  secondCustomerId: z.string().optional().or(z.literal("")),
  referredById: z.string().optional().or(z.literal("")),
  priority: z.coerce.number().min(0).max(99),
  functionType: z.string().trim().min(1, "Function type is required").max(60),
  functionDate: z.string().min(1, "Function date is required"),
  isPencilBooking: z.boolean(),
  packs: z.array(packSchema).length(4),
  additionalItems: z.array(additionalSchema),
  discountAmount: z.coerce.number().min(0),
  discountPercentage: z.coerce.number().min(0).max(100),
});

type FormValues = z.infer<typeof schema>;

/* ───────────────────────────── helpers ────────────────────────────── */

const ymd = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 10);
};

const DEFAULT_TIMES: Record<MealSlotId, { start: string; end: string }> = {
  breakfast: { start: "08:00", end: "10:00" },
  lunch:     { start: "12:00", end: "15:00" },
  "hi-tea":  { start: "16:00", end: "18:00" },
  dinner:    { start: "19:00", end: "22:00" },
};

const SLOT_BAR: Record<MealSlotId, string> = {
  breakfast: "bg-[#f59e0b]",
  lunch:     "bg-[#10b981]",
  "hi-tea":  "bg-[#06b6d4]",
  dinner:    "bg-[#6366f1]",
};

const blankRow = (slot: MealSlotId): z.infer<typeof packSchema> => ({
  mealSlot: slot,
  enabled: false,
  venueId: "",
  hallId: "",
  menuName: "",
  plates: 0,
  ratePerPlate: 0,
  hallRate: 0,
  startTime: DEFAULT_TIMES[slot].start,
  endTime: DEFAULT_TIMES[slot].end,
});

const defaults = (): FormValues => ({
  customerId: "",
  secondCustomerId: "",
  referredById: "",
  priority: 0,
  functionType: "",
  functionDate: ymd(new Date()),
  isPencilBooking: false,
  packs: MEAL_SLOT_IDS.map(blankRow),
  additionalItems: [],
  discountAmount: 0,
  discountPercentage: 0,
});

const fromBooking = (b: Booking): FormValues => {
  const byId = new Map(b.packs.map((p) => [p.mealSlot, p] as const));
  const rowVenueFor = (p: MealPack | undefined): string => {
    const hall = HALLS.find((h) => p?.items && false /* placeholder */); // never
    void hall;
    return "";
  };
  void rowVenueFor;
  // Try to derive venue/hall from booking-level halls for legacy data.
  const firstHall = b.halls[0]?.hallId ?? b.hallIds[0] ?? "";
  const firstVenue = HALLS.find((h) => h.id === firstHall)?.venueId ?? "";
  return {
    customerId: b.customerId,
    secondCustomerId: b.secondCustomerId ?? "",
    referredById: b.referredById ?? "",
    priority: b.priority ?? 0,
    functionType: b.functionType,
    functionDate: ymd(b.start),
    isPencilBooking: b.isPencilBooking,
    packs: MEAL_SLOT_IDS.map((slot) => {
      const p = byId.get(slot);
      if (!p) return blankRow(slot);
      return {
        mealSlot: slot,
        enabled: true,
        venueId: firstVenue,
        hallId: firstHall,
        menuName: p.menuName ?? "",
        plates: p.plates,
        ratePerPlate: p.ratePerPlate,
        hallRate: p.hallRate,
        startTime: p.startTime ?? DEFAULT_TIMES[slot].start,
        endTime: p.endTime ?? DEFAULT_TIMES[slot].end,
      };
    }),
    additionalItems: b.additionalItems,
    discountAmount: b.discountAmount,
    discountPercentage: b.discountPercentage,
  };
};

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
  const finalizeBooking = useOpsStore((s) => s.finalizeBooking);
  const user = useCurrentUser();
  const isNew = !booking;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(),
    mode: "onBlur",
  });

  useEffect(() => {
    if (!open) return;
    form.reset(booking ? fromBooking(booking) : { ...defaults(), customerId: customers[0]?.id ?? "" });
  }, [open, booking, customers, form]);

  const onSubmit = (v: FormValues) => {
    const activeRows = v.packs.filter((p) => p.enabled);
    const packs: MealPack[] = activeRows.map((p) => ({
      mealSlot: p.mealSlot,
      slot: mealSlotLabel(p.mealSlot),
      menuName: p.menuName || `${mealSlotLabel(p.mealSlot)} menu`,
      plates: p.plates,
      ratePerPlate: p.ratePerPlate,
      setupCost: 0,
      extraCharges: 0,
      hallRate: p.hallRate,
      startTime: p.startTime || undefined,
      endTime: p.endTime || undefined,
      items: [],
    }));
    const allHallIds = Array.from(new Set(activeRows.map((p) => p.hallId).filter(Boolean) as string[]));
    const halls = allHallIds.map((id) => ({ hallId: id, charges: 0 }));
    const start = new Date(`${v.functionDate}T${activeRows[0]?.startTime || "08:00"}:00`);
    const end = new Date(`${v.functionDate}T${activeRows[activeRows.length - 1]?.endTime || "22:00"}:00`);
    const guestMax = Math.max(0, ...activeRows.map((p) => p.plates));
    const next: Booking = {
      ...(booking ?? {}),
      id: booking?.id ?? newId("BK"),
      source: booking?.source ?? "in-app",
      functionName: `${customers.find((c) => c.id === v.customerId)?.name ?? ""} · ${v.functionType}`.trim(),
      functionType: v.functionType,
      customerId: v.customerId,
      secondCustomerId: v.secondCustomerId || undefined,
      referredById: v.referredById || undefined,
      priority: v.priority || undefined,
      start,
      end,
      status: v.isPencilBooking ? "pencil" : (booking?.status ?? "confirmed"),
      halls,
      hallIds: allHallIds,
      hallCharges: 0,
      expectedGuests: guestMax || (booking?.expectedGuests ?? 0),
      confirmedGuests: booking?.confirmedGuests ?? 0,
      packs,
      additionalItems: v.additionalItems,
      extras: v.additionalItems.map((x) => ({ label: x.description, amount: x.charges * x.quantity })),
      discountAmount: v.discountAmount,
      discountPercentage: v.discountPercentage,
      discountAmount2nd: booking?.discountAmount2nd ?? 0,
      discountPercentage2nd: booking?.discountPercentage2nd ?? 0,
      discount1: v.discountAmount,
      discount2Pct: 0,
      settlementDiscount: booking?.settlementDiscount ?? 0,
      taxPct: booking?.taxPct ?? 0,
      advanceRequired: booking?.advanceRequired ?? 0,
      isQuotation: booking?.isQuotation ?? false,
      isPencilBooking: v.isPencilBooking,
      pencilExpiresAt: booking?.pencilExpiresAt,
      payments: booking?.payments ?? [],
      notes: booking?.notes,
      internalNotes: booking?.internalNotes,
      versions: (booking?.versions ?? 0) + 1,
    } as Booking;
    upsertBooking(next, { isNew });
    return next;
  };

  const handleSubmit = form.handleSubmit((v) => {
    onSubmit(v);
    onOpenChange(false);
  });

  const handleFinalize = form.handleSubmit((v) => {
    const saved = onSubmit(v);
    finalizeBooking(saved, { reason: "Finalize from booking form", userName: user?.name ?? "You" });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] sm:h-[95vh] sm:max-w-[1200px] rounded-none sm:rounded-lg p-0 bg-surface border-border flex flex-col gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{isNew ? "New booking" : `Edit ${booking?.id}`}</DialogTitle>

        <header className="shrink-0 px-4 sm:px-6 py-3 border-b border-border flex items-center justify-between bg-surface">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight">Booking Form</h2>
            {!isNew && <div className="mono text-[10px] uppercase tracking-widest text-faint">{booking?.id}</div>}
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="p-4 sm:p-6 space-y-5">
            <BookingDetailsCard form={form} customers={customers} />
            <MealTable form={form} />
            <TotalsStrip form={form} />
            <ExtrasSection form={form} />
            <GrandTotalRow form={form} />
          </div>
        </form>

        <footer className="shrink-0 border-t border-border bg-surface px-4 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-[12px] font-medium border border-border bg-surface hover:bg-surface-2 rounded-md"
          >Cancel</button>
          <button
            type="button"
            onClick={handleSubmit}
            className="h-10 px-5 text-[12px] font-medium bg-confirmed text-white rounded-md hover:opacity-90 inline-flex items-center gap-2"
          >
            <span aria-hidden>💾</span> Submit
          </button>
          <div className="ml-auto">
            <button
              type="button"
              disabled={isNew}
              onClick={handleFinalize}
              className="h-10 px-5 text-[12px] font-medium bg-confirmed text-white rounded-md hover:opacity-90 inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              title={isNew ? "Save the booking first to finalize a version" : "Snapshot the current state as a new version"}
            >
              <span aria-hidden>✓</span> Finalize Version
            </button>
          </div>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────── booking details ────────────────────────────── */

type F = ReturnType<typeof useForm<FormValues>>;

function BookingDetailsCard({ form, customers }: { form: F; customers: { id: string; name: string; phone: string }[] }) {
  const { register, control, formState: { errors }, setValue } = form;
  const customerId = useWatch({ control, name: "customerId" });
  const secondCustomerId = useWatch({ control, name: "secondCustomerId" });
  const referredById = useWatch({ control, name: "referredById" });
  return (
    <section className="border border-border bg-surface rounded-lg p-4 sm:p-5 space-y-4">
      <h3 className="text-[15px] font-semibold tracking-tight">Booking Details</h3>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_minmax(80px,0.4fr)_1fr] gap-3">
        <Field label="Primary Customer" required err={errors.customerId?.message}>
          <div className="flex items-center gap-2">
            <CustomerSearch value={customerId} onChange={(id) => setValue("customerId", id, { shouldValidate: true })} customers={customers} placeholder="Type customer name or number" />
            <button type="button" className="shrink-0 h-10 px-3 text-[12px] border border-border rounded-full bg-surface hover:bg-surface-2 inline-flex items-center gap-1">
              <span className="text-confirmed">+</span> Add Customer
            </button>
          </div>
        </Field>
        <Field label="Priority">
          <input type="number" min={0} max={99} className={pillInp + " text-center"} {...register("priority")} />
        </Field>
        <Field label="Function Date" required err={errors.functionDate?.message}>
          <input type="date" className={pillInp} {...register("functionDate")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Field label="Function Type" required err={errors.functionType?.message}>
          <select className={pillInp} {...register("functionType")}>
            <option value="">Select function type</option>
            {["Wedding", "Reception", "Engagement", "Mehndi", "Sangeet", "Tilak", "Birthday", "Anniversary", "Corporate", "Other"].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Referred By">
          <CustomerSearch value={referredById ?? ""} onChange={(id) => setValue("referredById", id)} customers={customers} placeholder="Type customer name or number" allowEmpty />
        </Field>
        <Field label="Second Customer">
          <CustomerSearch value={secondCustomerId ?? ""} onChange={(id) => setValue("secondCustomerId", id)} customers={customers} placeholder="Type customer name or number" allowEmpty />
        </Field>
      </div>

      <Controller
        control={control}
        name="isPencilBooking"
        render={({ field }) => (
          <label className={`flex items-center gap-2 px-3 py-2.5 rounded-md border cursor-pointer transition-colors ${field.value ? "border-confirmed bg-confirmed/5" : "border-border bg-surface-2/40 hover:bg-surface-2"}`}>
            <input type="checkbox" checked={field.value} onChange={(e) => field.onChange(e.target.checked)} className="size-4" />
            <span className="text-confirmed" aria-hidden>✎</span>
            <span className="text-[13px] font-medium">Pencil Booking</span>
            <span className="text-[12px] text-muted">— temporary hall hold</span>
          </label>
        )}
      />
    </section>
  );
}

function CustomerSearch({
  value, onChange, customers, placeholder, allowEmpty,
}: {
  value: string;
  onChange: (id: string) => void;
  customers: { id: string; name: string; phone: string }[];
  placeholder: string;
  allowEmpty?: boolean;
}) {
  // Lightweight: a styled select for now; native search keeps it phone-friendly.
  return (
    <div className="relative flex-1 min-w-0">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-[13px]">⌕</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={pillInp + " pl-8 pr-3 appearance-none"}
      >
        <option value="">{placeholder}</option>
        {allowEmpty && value && <option value="">— Clear —</option>}
        {customers.map((c) => (
          <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
        ))}
      </select>
    </div>
  );
}

/* ──────────────────────────── meal table ────────────────────────────── */

function MealTable({ form }: { form: F }) {
  const { control, register, setValue } = form;
  const packs = useWatch({ control, name: "packs" }) ?? [];

  return (
    <section className="border border-border rounded-lg overflow-hidden bg-surface">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[1000px] text-[12px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
              <th className="text-left font-normal px-3 py-2 w-[140px]">Meal</th>
              <th className="text-left font-normal px-2 py-2 w-[140px]">Banquet</th>
              <th className="text-left font-normal px-2 py-2 w-[140px]">Hall</th>
              <th className="text-left font-normal px-2 py-2 w-[180px]">Time</th>
              <th className="text-left font-normal px-2 py-2">Menu</th>
              <th className="text-right font-normal px-2 py-2 w-[80px]">Pax</th>
              <th className="text-right font-normal px-2 py-2 w-[100px]">Rate/Plate</th>
              <th className="text-right font-normal px-2 py-2 w-[100px]">Hall Rate</th>
              <th className="text-right font-normal px-3 py-2 w-[110px]">Amount</th>
            </tr>
          </thead>
          <tbody>
            {MEAL_SLOT_IDS.map((slot, i) => (
              <MealRow
                key={slot}
                index={i}
                slot={slot}
                row={packs[i]}
                register={register}
                control={control}
                setValue={setValue}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MealRow({
  index, slot, row, register, control, setValue,
}: {
  index: number; slot: MealSlotId;
  row: FormValues["packs"][number] | undefined;
  register: UseFormRegister<FormValues>;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}) {
  const enabled = row?.enabled ?? false;
  const plates = row?.plates ?? 0;
  const rate = row?.ratePerPlate ?? 0;
  const hallRate = row?.hallRate ?? 0;
  const amount = enabled ? plates * rate + hallRate : 0;
  const venueId = row?.venueId ?? "";

  const hallsForVenue = HALLS.filter((h) => !venueId || h.venueId === venueId);

  return (
    <tr className={`border-b border-border/60 last:border-0 ${enabled ? "bg-surface" : "bg-surface-2/30"}`}>
      <td className="relative pl-3 pr-2 py-2.5 align-middle">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${SLOT_BAR[slot]}`} aria-hidden />
        <div className="flex flex-col gap-1.5 pl-2">
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name={`packs.${index}.enabled`}
              render={({ field }) => (
                <button
                  type="button"
                  role="switch"
                  aria-checked={field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${field.value ? "bg-confirmed" : "bg-border"}`}
                >
                  <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${field.value ? "translate-x-4" : "translate-x-0.5"}`} />
                </button>
              )}
            />
            <span className="text-[13px] font-medium">{mealSlotLabel(slot)}</span>
          </div>
        </div>
      </td>
      <td className="px-2 py-2.5 align-middle">
        <select
          className={cellInp}
          value={venueId}
          onChange={(e) => {
            const newVenue = e.target.value;
            setValue(`packs.${index}.venueId`, newVenue, { shouldDirty: true });
            const currHall = row?.hallId;
            if (currHall && !HALLS.find((h) => h.id === currHall && h.venueId === newVenue)) {
              setValue(`packs.${index}.hallId`, "", { shouldDirty: true });
            }
            if (!enabled) setValue(`packs.${index}.enabled`, true);
          }}
          disabled={!enabled}
        >
          <option value="">Select...</option>
          {VENUES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-2.5 align-middle">
        <select
          className={cellInp}
          {...register(`packs.${index}.hallId`)}
          disabled={!enabled}
        >
          <option value="">—</option>
          {hallsForVenue.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </td>
      <td className="px-2 py-2.5 align-middle">
        <div className="flex items-center gap-1.5">
          <input type="time" className={cellInp + " w-[78px] tabular-nums"} {...register(`packs.${index}.startTime`)} disabled={!enabled} />
          <span className="text-muted">–</span>
          <input type="time" className={cellInp + " w-[78px] tabular-nums"} {...register(`packs.${index}.endTime`)} disabled={!enabled} />
        </div>
      </td>
      <td className="px-2 py-2.5 align-middle">
        <input
          type="text"
          placeholder={enabled ? `${mealSlotLabel(slot)} menu` : "Set menu..."}
          className={cellInp + " text-[12px]"}
          {...register(`packs.${index}.menuName`)}
          disabled={!enabled}
        />
      </td>
      <td className="px-2 py-2.5 align-middle">
        <input type="number" inputMode="numeric" min={0} className={cellInp + " text-right tabular-nums"} {...register(`packs.${index}.plates`)} disabled={!enabled} />
      </td>
      <td className="px-2 py-2.5 align-middle">
        <input type="number" inputMode="numeric" min={0} className={cellInp + " text-right tabular-nums"} {...register(`packs.${index}.ratePerPlate`)} disabled={!enabled} />
      </td>
      <td className="px-2 py-2.5 align-middle">
        <input type="number" inputMode="numeric" min={0} className={cellInp + " text-right tabular-nums"} {...register(`packs.${index}.hallRate`)} disabled={!enabled} />
      </td>
      <td className="px-3 py-2.5 align-middle text-right tabular-nums font-medium">
        {enabled ? formatINR(amount) : <span className="text-muted">—</span>}
      </td>
    </tr>
  );
}

/* ─────────────────────────── totals / extras ────────────────────────────── */

function useTotals(form: F) {
  const v = useWatch({ control: form.control });
  return useMemo(() => {
    const activePacks: MealPack[] = (v.packs ?? []).filter((p) => p?.enabled).map((p) => ({
      mealSlot: p!.mealSlot as MealSlotId,
      slot: mealSlotLabel(p!.mealSlot as MealSlotId),
      menuName: p!.menuName ?? "",
      plates: Number(p!.plates ?? 0),
      ratePerPlate: Number(p!.ratePerPlate ?? 0),
      setupCost: 0,
      extraCharges: 0,
      hallRate: Number(p!.hallRate ?? 0),
      items: [],
    }));
    return computeBill({
      packs: activePacks,
      additionalItems: ((v.additionalItems ?? []) as { description?: string; charges?: number; quantity?: number }[])
        .map((x) => ({ description: x.description ?? "", charges: Number(x.charges ?? 0), quantity: Number(x.quantity ?? 1) })),
      discountAmount: Number(v.discountAmount ?? 0),
      discountPercentage: Number(v.discountPercentage ?? 0),
      discountAmount2nd: 0,
      discountPercentage2nd: 0,
      payments: [],
    });
  }, [v]);
}

function TotalsStrip({ form }: { form: F }) {
  const { register, control, setValue } = form;
  const bill = useTotals(form);
  const dPct = useWatch({ control, name: "discountPercentage" }) ?? 0;
  return (
    <div className="space-y-0 rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-3 bg-confirmed/10">
        <span className="text-[13px] font-medium">Total</span>
        <span className="mono text-[14px] font-semibold tabular-nums">{formatINR(bill.mealsSubtotal)}</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-[hsl(0_70%_96%)] dark:bg-conflict/10">
        <span className="px-3 py-1 rounded-full bg-[hsl(15_25%_25%)] text-white text-[11px] font-medium">Capture Selected Portion</span>
        <div className="ml-auto flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 text-[12px]">
            <span className="text-muted">Disc %</span>
            <input
              type="number" min={0} max={100} step={0.1}
              className={pillInpSm + " w-20 text-right tabular-nums"}
              {...register("discountPercentage", { onChange: (e) => { if (Number(e.target.value) > 0) setValue("discountAmount", 0); } })}
            />
          </label>
          <label className="flex items-center gap-2 text-[12px]">
            <span className="text-muted">Discount</span>
            <input
              type="number" min={0}
              disabled={dPct > 0}
              className={pillInpSm + " w-28 text-right tabular-nums"}
              {...register("discountAmount")}
            />
          </label>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-3 bg-confirmed/5">
        <span className="text-[13px] font-medium">Net Amount</span>
        <span className="mono text-[14px] font-semibold tabular-nums">{formatINR(bill.mealsSubtotal - bill.mealsDiscount)}</span>
      </div>
    </div>
  );
}

function ExtrasSection({ form }: { form: F }) {
  const { control, register } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "additionalItems" });
  return (
    <section className="border border-border rounded-lg bg-surface">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <span className="text-[13px] font-medium">Extra Items</span>
        <button
          type="button"
          onClick={() => append({ description: "", charges: 0, quantity: 1 })}
          className="h-8 px-3 text-[11px] border border-border rounded-full bg-surface hover:bg-surface-2 inline-flex items-center gap-1"
        ><span className="text-confirmed">+</span> Add</button>
      </div>
      {fields.length === 0 ? (
        <div className="px-4 py-3 text-[11px] text-muted">Decor, DJ, valet, etc.</div>
      ) : (
        <div className="divide-y divide-border">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-[1fr_5rem_6rem_auto] gap-2 items-center px-4 py-2">
              <input className={cellInp} placeholder="Description" {...register(`additionalItems.${i}.description`)} />
              <input type="number" min={1} className={cellInp + " text-right tabular-nums"} placeholder="Qty" {...register(`additionalItems.${i}.quantity`)} />
              <input type="number" min={0} className={cellInp + " text-right tabular-nums"} placeholder="₹" {...register(`additionalItems.${i}.charges`)} />
              <button type="button" onClick={() => remove(i)} className="text-muted hover:text-conflict text-[14px] px-1">×</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GrandTotalRow({ form }: { form: F }) {
  const bill = useTotals(form);
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-confirmed/10 border border-border">
      <span className="text-[14px] font-semibold">Grand Total</span>
      <span className="mono text-[16px] font-bold tabular-nums">{formatINR(bill.grandTotal)}</span>
    </div>
  );
}

/* ─────────────────────────── primitives ─────────────────────────── */

const pillInp = "w-full h-10 px-3 bg-bg border border-border text-[13px] outline-none focus:border-confirmed rounded-full";
const pillInpSm = "h-9 px-3 bg-bg border border-border text-[12px] outline-none focus:border-confirmed rounded-full";
const cellInp = "w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-confirmed rounded-md disabled:opacity-50 disabled:cursor-not-allowed";

function Field({
  label, required, err, children,
}: { label: string; required?: boolean; err?: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[12px] font-medium mb-1.5 text-fg">
        {label}{required && <span className="text-conflict ml-0.5">*</span>}
      </div>
      {children}
      {err && <div className="text-[10px] text-conflict mt-1">{err}</div>}
    </div>
  );
}
