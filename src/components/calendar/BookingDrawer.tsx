import { BOOKINGS, customerById, hallById } from "@/lib/mock/data";
import { bookingTotal } from "@/lib/mock/data";
import { formatDate, formatINR, formatINRShort, formatTime, relativeDur } from "@/lib/format";
import { statusToken } from "@/lib/calendar-utils";

export function BookingDrawer({ bookingId, onClose, conflictIds = [] }: { bookingId: string | null; onClose: () => void; conflictIds?: string[] }) {
  if (!bookingId) return null;
  const b = BOOKINGS.find((x) => x.id === bookingId);
  if (!b) return null;
  const c = customerById(b.customerId);
  const total = bookingTotal(b);
  const tok = statusToken(b.status);
  const advancePct = total.grand > 0 ? Math.min(100, Math.round((total.received / total.grand) * 100)) : 0;

  return (
    <aside className="fixed top-11 right-0 bottom-0 w-[420px] max-w-[92vw] bg-surface border-l border-border-strong z-30 flex flex-col">
      <header className="h-10 px-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="mono text-[10px] text-muted">{b.id}</span>
          <span className="text-[10px] uppercase tracking-widest mono px-1.5 py-0.5 border" style={{ color: tok.color, borderColor: tok.color }}>{tok.label}</span>
        </div>
        <button onClick={onClose} className="size-7 grid place-items-center text-muted hover:text-fg">✕</button>
      </header>
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3 border-b border-border">
          <h2 className="text-[15px] font-semibold leading-tight">{b.functionName}</h2>
          <div className="mt-1 text-[11px] text-muted">{b.functionType}</div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-faint mono">Date</div>
              <div className="mono">{formatDate(b.start)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-faint mono">Time</div>
              <div className="mono">{formatTime(b.start)} — {formatTime(b.end)}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-faint mono">Guests</div>
              <div className="mono">{b.expectedGuests} <span className="text-faint">exp</span></div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-faint mono">Source</div>
              <div className="mono uppercase">{b.source}</div>
            </div>
          </div>
        </div>

        {b.pencilExpiresAt && (
          <div className="px-3 py-2 border-b border-border flex items-center justify-between" style={{ background: "color-mix(in oklab, var(--pencil) 6%, transparent)" }}>
            <span className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--pencil)" }}>Pencil expires</span>
            <span className="mono text-[11px]" style={{ color: "var(--pencil)" }}>{relativeDur(b.pencilExpiresAt.getTime())}</span>
          </div>
        )}

        {conflictIds.length > 0 && (
          <div className="px-3 py-2 border-b border-border" style={{ background: "color-mix(in oklab, var(--conflict) 8%, transparent)" }}>
            <div className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--conflict)" }}>! Hall conflict</div>
            <div className="text-[11px] mt-1">Overlaps with {conflictIds.join(", ")}</div>
          </div>
        )}

        <section className="p-3 border-b border-border">
          <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Customer</div>
          <div className="text-[12px] font-medium">{c.name}</div>
          <div className="text-[11px] text-muted mono mt-0.5">{c.phone}</div>
          {c.altPhone && <div className="text-[11px] text-muted mono">{c.altPhone}</div>}
          <div className="text-[11px] text-muted">{c.city} · {c.community}</div>
        </section>

        <section className="p-3 border-b border-border">
          <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Halls ({b.hallIds.length})</div>
          {b.hallIds.map((hid) => {
            const h = hallById(hid);
            return (
              <div key={hid} className="flex justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                <span>{h.name}</span>
                <span className="mono text-muted">cap {h.capacity} · {formatINRShort(h.basePrice)}</span>
              </div>
            );
          })}
        </section>

        <section className="p-3 border-b border-border">
          <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Meal packs</div>
          {b.packs.map((p, i) => (
            <div key={i} className="text-[11px] py-1 border-b border-border/50 last:border-0">
              <div className="flex justify-between">
                <span className="font-medium">{p.slot}</span>
                <span className="mono">{p.plates} × {formatINR(p.ratePerPlate)}</span>
              </div>
              <div className="text-muted text-[10px]">{p.menuName}</div>
            </div>
          ))}
        </section>

        <section className="p-3 border-b border-border mono">
          <div className="text-[9px] uppercase tracking-widest text-faint mb-2">Money</div>
          <Row k="Subtotal" v={formatINR(total.sub)} />
          {b.discount1 > 0 && <Row k="Discount" v={`- ${formatINR(b.discount1)}`} color="var(--conflict)" />}
          {b.discount2Pct > 0 && <Row k={`Discount ${b.discount2Pct}%`} v={`- ${formatINR((total.afterD1 * b.discount2Pct) / 100)}`} color="var(--conflict)" />}
          <Row k={`GST ${b.taxPct}%`} v={`+ ${formatINR(total.tax)}`} />
          <div className="h-px bg-border my-2" />
          <Row k="GRAND TOTAL" v={formatINR(total.grand)} bold />
          <div className="mt-3 space-y-1">
            <Row k="Advance required" v={formatINR(b.advanceRequired)} />
            <Row k="Received" v={formatINR(total.received)} color="var(--confirmed)" />
            <Row k="Balance" v={formatINR(total.balance)} color={total.balance > 0 ? "var(--conflict)" : "var(--confirmed)"} bold />
            <div className="h-1.5 bg-surface-2 mt-1.5">
              <div className="h-full bg-confirmed" style={{ width: `${advancePct}%` }} />
            </div>
            <div className="text-[10px] text-muted text-right">{advancePct}% paid</div>
          </div>
        </section>

        {b.payments.length > 0 && (
          <section className="p-3 border-b border-border">
            <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Payment ledger</div>
            {b.payments.map((p) => (
              <div key={p.id} className="flex justify-between text-[11px] py-1 border-b border-border/50 last:border-0 mono">
                <span>{formatDate(p.date)}</span>
                <span className="text-muted flex-1 px-2 truncate">{p.method} · {p.ref}</span>
                <span>{formatINR(p.amount)}</span>
              </div>
            ))}
          </section>
        )}

        {b.notes && (
          <section className="p-3 border-b border-border">
            <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">Notes</div>
            <p className="text-[11px]">{b.notes}</p>
          </section>
        )}
      </div>
      <footer className="border-t border-border p-2 flex gap-1 shrink-0">
        <button className="flex-1 py-2 text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2">Edit</button>
        <button className="flex-1 py-2 text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2">Mark Paid</button>
        <button className="flex-1 py-2 text-[10px] uppercase tracking-widest bg-accent text-accent-fg">Print</button>
      </footer>
    </aside>
  );
}

function Row({ k, v, color, bold }: { k: string; v: string; color?: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-[11px] ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted uppercase tracking-tight text-[10px]">{k}</span>
      <span style={color ? { color } : undefined}>{v}</span>
    </div>
  );
}
