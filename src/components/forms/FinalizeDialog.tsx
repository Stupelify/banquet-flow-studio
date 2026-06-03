/**
 * Confirm-and-snapshot the current booking state as a new version. The store
 * keeps a JSON copy in `versionHistory[]`; the History tab renders the list.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useOpsStore } from "@/lib/api/store";
import { useCurrentUser } from "@/lib/auth/store";
import type { Booking } from "@/lib/mock/types";

export function FinalizeDialog({
  open, onOpenChange, booking,
}: { open: boolean; onOpenChange: (v: boolean) => void; booking: Booking | null }) {
  const finalize = useOpsStore((s) => s.finalizeBooking);
  const user = useCurrentUser();
  const [reason, setReason] = useState("");
  if (!booking) return null;
  const nextV = (booking.versions ?? 0) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface border-border">
        <DialogHeader>
          <DialogTitle className="mono uppercase tracking-widest text-[11px]">
            Finalize → snapshot v{nextV}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            finalize(booking, { reason: reason || undefined, userName: user?.name ?? "You" });
            onOpenChange(false);
            setReason("");
          }}
          className="space-y-3 text-[12px]"
        >
          <p className="text-[11px] text-muted">
            Saves a complete snapshot of <span className="mono">{booking.id}</span> at v{nextV}.
            Continues edits keep moving forward; old snapshots stay visible in <em>History</em>.
          </p>
          <label className="block">
            <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">Reason (optional)</div>
            <input
              value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer signed quotation"
              className="w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent"
            />
          </label>
          <DialogFooter className="gap-2">
            <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Cancel</button>
            <button type="submit" className="px-3 py-1.5 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg">Snapshot</button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
