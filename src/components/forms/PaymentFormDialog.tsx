/**
 * Add a payment to a booking. Writes a `BookingPayment` (API shape) to the
 * store; hooks merge it into the booking's `payments` array on render.
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOpsStore, newId, PAYMENT_METHODS } from "@/lib/api/store";
import { formatINR } from "@/lib/format";

const schema = z.object({
  amount: z.coerce.number().positive("Amount must be > 0").max(100_00_00_000, "Too large"),
  method: z.enum(["cash", "upi", "card", "cheque", "bank_transfer"]),
  reference: z.string().trim().max(64).optional().or(z.literal("")),
  paymentDate: z.string().min(1, "Date required"),
  narration: z.string().trim().max(500).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export function PaymentFormDialog({
  open, onOpenChange, bookingId, balanceHint,
}: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  bookingId: string;
  balanceHint?: number;
}) {
  const addPayment = useOpsStore((s) => s.addPayment);
  const userId = useOpsStore((s) => s.currentUser.id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: balanceHint && balanceHint > 0 ? balanceHint : 0,
      method: "upi", reference: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      narration: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      amount: balanceHint && balanceHint > 0 ? balanceHint : 0,
      method: "upi", reference: "",
      paymentDate: new Date().toISOString().slice(0, 10),
      narration: "",
    });
  }, [open, balanceHint, form]);

  const onSubmit = (v: FormValues) => {
    addPayment({
      id: newId("PAY"),
      bookingId,
      receivedBy: userId,
      amount: v.amount,
      method: v.method,
      paymentMethod: v.method,
      reference: v.reference || null,
      narration: v.narration || null,
      paymentDate: new Date(v.paymentDate).toISOString(),
      clearingDate: null,
      createdAt: new Date().toISOString(),
    });
    onOpenChange(false);
  };

  const errors = form.formState.errors;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-[100dvh] rounded-none p-0 sm:max-w-xl sm:h-auto sm:rounded-sm bg-surface border-border flex flex-col gap-0">
        <DialogHeader className="px-3 sm:px-4 py-2.5 border-b border-border shrink-0">
          <DialogTitle className="mono uppercase tracking-widest text-[11px] text-left">
            Record payment · {bookingId}
            {balanceHint != null && <span className="ml-2 text-muted normal-case tracking-normal">balance {formatINR(balanceHint)}</span>}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-4 py-3 space-y-3 text-[12px]">
            <F label="Amount (₹)" err={errors.amount?.message}>
              <input type="number" step="0.01" inputMode="decimal" className={inp + " text-[16px] h-11 mono font-medium"} {...form.register("amount")} autoFocus />
            </F>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <F label="Method">
                <select className={inp} {...form.register("method")}>
                  {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </F>
              <F label="Date" err={errors.paymentDate?.message}>
                <input type="date" className={inp} {...form.register("paymentDate")} />
              </F>
            </div>
            <F label="Reference / txn id" err={errors.reference?.message}>
              <input className={inp} {...form.register("reference")} placeholder="UPI ref, cheque no., …" />
            </F>
            <F label="Narration" err={errors.narration?.message}>
              <textarea rows={3} className={inp + " h-auto py-1.5"} {...form.register("narration")} />
            </F>
          </div>
          <DialogFooter className="px-3 sm:px-4 py-2.5 border-t border-border gap-2 shrink-0 bg-surface">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">Record payment</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const inp = "w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent";
function F({ label, children, err }: { label: string; children: React.ReactNode; err?: string }) {
  return (
    <label className="block">
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">{label}</div>
      {children}
      {err && <div className="text-[10px] text-conflict mt-0.5">{err}</div>}
    </label>
  );
}
