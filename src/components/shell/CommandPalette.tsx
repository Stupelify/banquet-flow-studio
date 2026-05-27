import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BOOKINGS, CUSTOMERS, HALLS, VENUES, customerById } from "@/lib/mock/data";
import { formatDate, formatINRShort } from "@/lib/format";

type Item = { id: string; label: string; sub: string; group: string; to: string };

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQ("");
  }, [open]);

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    for (const b of BOOKINGS.slice(0, 60)) {
      const c = customerById(b.customerId);
      out.push({ id: b.id, label: `${b.id} · ${b.functionName}`, sub: `${c.name} · ${formatDate(b.start)} · ${formatINRShort(b.hallCharges)}`, group: "Bookings", to: `/bookings?id=${b.id}` });
    }
    for (const c of CUSTOMERS) out.push({ id: c.id, label: c.name, sub: `${c.phone} · ${c.city}`, group: "Customers", to: `/customers?id=${c.id}` });
    for (const h of HALLS) out.push({ id: h.id, label: h.name, sub: `${VENUES.find((v) => v.id === h.venueId)?.name} · cap ${h.capacity}`, group: "Halls", to: `/venues` });
    for (const p of [
      { to: "/calendar", label: "Calendar — Hall Board" },
      { to: "/calendar?view=month", label: "Calendar — Month" },
      { to: "/calendar?view=week", label: "Calendar — Week" },
      { to: "/calendar?view=day", label: "Calendar — Day" },
      { to: "/payments", label: "Payments ledger" },
      { to: "/reports", label: "Reports" },
      { to: "/settings", label: "Settings" },
    ]) out.push({ id: p.to, label: p.label, sub: "Jump", group: "Pages", to: p.to });
    return out;
  }, []);

  const filtered = useMemo(() => {
    if (!q) return items.slice(0, 50);
    const lo = q.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(lo) || i.sub.toLowerCase().includes(lo)).slice(0, 50);
  }, [items, q]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-bg/70 backdrop-blur-xs flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="w-[640px] max-w-[92vw] bg-surface border border-border-strong shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter" && filtered[0]) { navigate({ to: filtered[0].to as any }); onClose(); }
          }}
          placeholder="Search bookings, customers, halls, pages…"
          className="w-full h-11 px-3 bg-transparent border-b border-border outline-none text-[13px]"
        />
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin">
          {filtered.map((it) => (
            <button
              key={it.group + it.id}
              onClick={() => { navigate({ to: it.to as any }); onClose(); }}
              className="w-full flex items-center px-3 py-2 border-b border-border/60 hover:bg-surface-2 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[12px] truncate">{it.label}</div>
                <div className="text-[10px] text-muted truncate mono">{it.sub}</div>
              </div>
              <span className="text-[9px] text-faint uppercase tracking-widest mono">{it.group}</span>
            </button>
          ))}
          {!filtered.length && <div className="p-4 text-center text-muted text-[11px]">No matches</div>}
        </div>
      </div>
    </div>
  );
}
