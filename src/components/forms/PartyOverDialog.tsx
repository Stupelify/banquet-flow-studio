/**
 * Mark a booking as "party over": optional settlement discount + closing notes.
 * Triggers ops store's `partyOverBooking`, which stamps `partyOver: true` and
 * a settlement discount that flows into the live money stack.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOpsStore } from "@/lib/api/store";
import { useCurrentUser } from "@/lib/auth/store";
import type { Booking } from "@/lib/mock/types";
import { formatINR } from "@/lib/format";
import { bookingTotal } from "@/lib/mock/data";

export function PartyOverDialog({
  open, onOpenChange, booking,
}: { open: boolean; onOpenChange: (v: boolean) => void; booking: Booking | null }) {
  const finalize = useOpsStore((s) => s.partyOverBooking);
  const user = useCurrentUser();
  const [settle, setSettle] = useState<string>("0");
  const [notes, setNotes] = useState("");

  if (!booking) return null;
  const total = bookingTotal(booking);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    finalize(booking, {
      settlementDiscount: Number(settle) || 0,
      notes: notes || undefined,
      userName: user?.name ?? "You",
    });
    onOpenChange(false);
    setSettle("0"); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="mono uppercase tracking-widest text-[11px]">
            Mark party over — {booking.id}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 text-[12px]">
          <div className="border border-border p-3 mono bg-bg/30 grid grid-cols-2 gap-y-1 text-[11px]">
            <span className="text-muted">Grand total</span><span className="text-right">{formatINR(total.grand)}</span>
            <span className="text-muted">Received</span><span className="text-right text-confirmed">{formatINR(total.received)}</span>
            <span className="text-muted">Balance</span><span className="text-right text-conflict">{formatINR(total.balance)}</span>
          </div>
          <label className="block">
            <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">Settlement discount (₹)</div>
            <input
              type="number" min="0" step="1" value={settle}
              onChange={(e) => setSettle(e.target.value)}
              className="w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent mono"
            />
            <div className="text-[10px] text-muted mt-1">Applied as a settlement discount; reduces the closing balance.</div>
          </label>
          <label className="block">
            <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">Closing notes</div>
            <textarea
              rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything to remember about how the function closed…"
              className="w-full px-2 py-1.5 bg-bg border border-border text-[12px] outline-none focus:border-accent"
            />
          </label>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">Confirm party over</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
