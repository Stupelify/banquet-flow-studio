/**
 * Create/edit booking dialog. RHF + zod, scoped to the user-editable fields
 * (master record + halls + notes + status). Pricing fields are derived from
 * money stack and edited via packs/halls separately.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { HALLS, VENUES } from "@/lib/mock/data";
import { useOpsStore, newId } from "@/lib/api/store";
import type { Booking } from "@/lib/mock/types";

const schema = z.object({
  functionName: z.string().trim().min(1, "Function name is required").max(120),
  functionType: z.string().trim().min(1, "Function type is required").max(60),
  customerId: z.string().min(1, "Select a customer"),
  start: z.string().min(1, "Start required"),
  end: z.string().min(1, "End required"),
  expectedGuests: z.coerce.number().int().min(1).max(20000),
  confirmedGuests: z.coerce.number().int().min(0).max(20000),
  hallIds: z.array(z.string()).min(1, "Pick at least one hall"),
  status: z.enum(["confirmed", "pencil", "quotation", "enquiry", "cancelled"]),
  hallCharges: z.coerce.number().min(0),
  taxPct: z.coerce.number().min(0).max(50),
  discount1: z.coerce.number().min(0),
  advanceRequired: z.coerce.number().min(0),
  notes: z.string().max(2000).optional(),
}).refine((v) => new Date(v.end) > new Date(v.start), { message: "End must be after start", path: ["end"] });

type FormValues = z.infer<typeof schema>;

const toLocalInput = (d: Date) => {
  const tz = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return tz.toISOString().slice(0, 16);
};

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
    defaultValues: {
      functionName: "", functionType: "Reception", customerId: customers[0]?.id ?? "",
      start: toLocalInput(new Date()),
      end: toLocalInput(new Date(Date.now() + 4 * 3_600_000)),
      expectedGuests: 100, confirmedGuests: 0,
      hallIds: [], status: "confirmed",
      hallCharges: 50000, taxPct: 18, discount1: 0, advanceRequired: 0,
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    if (booking) {
      form.reset({
        functionName: booking.functionName,
        functionType: booking.functionType,
        customerId: booking.customerId,
        start: toLocalInput(booking.start),
        end: toLocalInput(booking.end),
        expectedGuests: booking.expectedGuests,
        confirmedGuests: booking.confirmedGuests,
        hallIds: booking.hallIds,
        status: booking.status,
        hallCharges: booking.hallCharges,
        taxPct: booking.taxPct,
        discount1: booking.discount1,
        advanceRequired: booking.advanceRequired,
        notes: booking.notes ?? "",
      });
    } else {
      form.reset({
        functionName: "", functionType: "Reception", customerId: customers[0]?.id ?? "",
        start: toLocalInput(new Date()),
        end: toLocalInput(new Date(Date.now() + 4 * 3_600_000)),
        expectedGuests: 100, confirmedGuests: 0,
        hallIds: [], status: "confirmed",
        hallCharges: 50000, taxPct: 18, discount1: 0, advanceRequired: 0, notes: "",
      });
    }
  }, [open, booking, customers, form]);

  const onSubmit = (v: FormValues) => {
    const base: Booking = booking ?? {
      id: newId("BK"),
      source: "in-app",
      packs: [], extras: [], payments: [],
      discount2Pct: 0, settlementDiscount: 0, versions: 1,
    } as unknown as Booking;
    const next: Booking = {
      ...base,
      ...v,
      start: new Date(v.start),
      end: new Date(v.end),
      notes: v.notes || undefined,
      packs: base.packs ?? [],
      extras: base.extras ?? [],
      payments: base.payments ?? [],
      discount2Pct: base.discount2Pct ?? 0,
      settlementDiscount: base.settlementDiscount ?? 0,
      versions: (base.versions ?? 1) + (isNew ? 0 : 1),
    };
    upsertBooking(next, { isNew });
    onOpenChange(false);
  };

  const hallIds = form.watch("hallIds");
  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="mono uppercase tracking-widest text-[11px]">
            {isNew ? "New booking" : `Edit ${booking?.id}`}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 text-[12px]">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Function name" err={errors.functionName?.message}>
              <input className={inp} {...form.register("functionName")} placeholder="e.g. Sharma Reception" />
            </Field>
            <Field label="Function type" err={errors.functionType?.message}>
              <input className={inp} {...form.register("functionType")} placeholder="Wedding, Birthday…" />
            </Field>
            <Field label="Customer" err={errors.customerId?.message}>
              <select className={inp} {...form.register("customerId")}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select className={inp} {...form.register("status")}>
                <option value="confirmed">Confirmed</option>
                <option value="pencil">Pencil</option>
                <option value="quotation">Quotation</option>
                <option value="enquiry">Enquiry</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label="Start" err={errors.start?.message}>
              <input type="datetime-local" className={inp} {...form.register("start")} />
            </Field>
            <Field label="End" err={errors.end?.message}>
              <input type="datetime-local" className={inp} {...form.register("end")} />
            </Field>
            <Field label="Expected guests" err={errors.expectedGuests?.message}>
              <input type="number" className={inp} {...form.register("expectedGuests")} />
            </Field>
            <Field label="Confirmed guests" err={errors.confirmedGuests?.message}>
              <input type="number" className={inp} {...form.register("confirmedGuests")} />
            </Field>
            <Field label="Hall charges (₹)">
              <input type="number" className={inp} {...form.register("hallCharges")} />
            </Field>
            <Field label="Tax %">
              <input type="number" className={inp} {...form.register("taxPct")} />
            </Field>
            <Field label="Discount (₹)">
              <input type="number" className={inp} {...form.register("discount1")} />
            </Field>
            <Field label="Advance required (₹)">
              <input type="number" className={inp} {...form.register("advanceRequired")} />
            </Field>
          </div>

          <Field label="Halls" err={errors.hallIds?.message as string | undefined}>
            <div className="border border-border max-h-40 overflow-y-auto scrollbar-thin bg-bg">
              {VENUES.map((v) => (
                <div key={v.id} className="border-b border-border/60 last:border-0">
                  <div className="px-2 py-1 mono text-[10px] uppercase tracking-widest text-muted bg-surface-2/40">{v.name}</div>
                  {HALLS.filter((h) => h.venueId === v.id).map((h) => {
                    const checked = hallIds.includes(h.id);
                    return (
                      <label key={h.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-surface-2 text-[11px]">
                        <input
                          type="checkbox" checked={checked}
                          onChange={(e) => {
                            const next = e.target.checked ? [...hallIds, h.id] : hallIds.filter((x) => x !== h.id);
                            form.setValue("hallIds", next, { shouldValidate: true });
                          }}
                        />
                        <span>{h.name}</span>
                        <span className="ml-auto mono text-[10px] text-muted">cap {h.capacity}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          </Field>

          <Field label="Notes">
            <textarea rows={2} className={inp} {...form.register("notes")} />
          </Field>

          <DialogFooter className="gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">
              {isNew ? "Create booking" : "Save changes"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inp = "w-full h-8 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent";

function Field({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">{label}</div>
      {children}
      {err && <div className="text-[10px] text-conflict mt-0.5">{err}</div>}
    </label>
  );
}
