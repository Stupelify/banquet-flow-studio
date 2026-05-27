import { createFileRoute, Link } from "@tanstack/react-router";
import { BOOKINGS, ENQUIRIES, HALLS, customerById, bookingTotal, hallById } from "@/lib/mock/data";
import { formatDate, formatINR, formatINRShort, formatTime, relativeDur, dayKey } from "@/lib/format";
import { detectConflicts, statusToken } from "@/lib/calendar-utils";
import { useMemo } from "react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Bika Ops" }, { name: "description", content: "Operations overview: revenue, today's events, dues, conflicts." }] }),
  component: Dashboard,
});

function Dashboard() {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const todayK = dayKey(today);
  const todayB = BOOKINGS.filter((b) => dayKey(b.start) === todayK).sort((a,b) => +a.start - +b.start);
  const conflicts = detectConflicts(BOOKINGS.filter((b) => {
    const days = (b.start.getTime() - today.getTime()) / 86400000;
    return days >= 0 && days <= 7;
  }));
  const pencils = BOOKINGS.filter((b) => b.status === "pencil" && b.pencilExpiresAt && b.pencilExpiresAt.getTime() > Date.now());
  const overdueDues = BOOKINGS.filter((b) => {
    const t = bookingTotal(b);
    return b.status === "confirmed" && t.balance > 0 && b.start.getTime() < Date.now() + 7 * 86400000;
  });

  const last30 = BOOKINGS.filter((b) => Math.abs(b.start.getTime() - Date.now()) < 30 * 86400000);
  const revenue = last30.filter((b) => b.status === "confirmed").reduce((s, b) => s + bookingTotal(b).grand, 0);
  const received = last30.reduce((s, b) => s + bookingTotal(b).received, 0);
  const dueTotal = BOOKINGS.filter((b) => b.status === "confirmed").reduce((s, b) => s + bookingTotal(b).balance, 0);

  const funnel = {
    Lead: ENQUIRIES.filter((e) => e.stage === "Lead").length,
    Quotation: ENQUIRIES.filter((e) => e.stage === "Quotation").length,
    Pencil: ENQUIRIES.filter((e) => e.stage === "Pencil").length,
    Won: ENQUIRIES.filter((e) => e.stage === "Won").length,
  };

  const cashByDay = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (13 - i));
    const k = dayKey(d);
    return BOOKINGS.flatMap((b) => b.payments).filter((p) => dayKey(p.date) === k).reduce((s, p) => s + p.amount, 0);
  });
  const cashMax = Math.max(1, ...cashByDay);

  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-y-auto scrollbar-thin">
      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-px bg-border border-b border-border">
        <Kpi label="Revenue (30d)" value={formatINRShort(revenue)} sub="confirmed" />
        <Kpi label="Received (30d)" value={formatINRShort(received)} sub="all sources" />
        <Kpi label="Total dues" value={formatINRShort(dueTotal)} sub="open balance" color="var(--conflict)" />
        <Kpi label="Today" value={`${todayB.length}`} sub="events" />
        <Kpi label="Pencils" value={`${pencils.length}`} sub="expiring" color="var(--pencil)" />
        <Kpi label="Conflicts" value={`${conflicts.size}`} sub="7d ahead" color={conflicts.size > 0 ? "var(--conflict)" : undefined} />
      </div>

      <div className="grid grid-cols-12 gap-px bg-border">
        {/* Today */}
        <section className="col-span-12 lg:col-span-8 bg-bg p-4">
          <SectionHead title="Today" right={<Link to="/calendar" className="text-[10px] uppercase tracking-widest text-accent">Open timeline →</Link>} />
          {todayB.length === 0 ? <Empty>No events scheduled today.</Empty> : (
            <table className="w-full text-[11px]">
              <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
                <th className="text-left py-1.5 font-normal">Time</th>
                <th className="text-left py-1.5 font-normal">Function</th>
                <th className="text-left py-1.5 font-normal">Customer</th>
                <th className="text-left py-1.5 font-normal">Hall</th>
                <th className="text-right py-1.5 font-normal">Guests</th>
                <th className="text-right py-1.5 font-normal">Total</th>
                <th className="text-right py-1.5 font-normal">Status</th>
              </tr></thead>
              <tbody>
                {todayB.map((b) => {
                  const c = customerById(b.customerId);
                  const t = bookingTotal(b);
                  const tok = statusToken(b.status);
                  const isConflict = conflicts.has(b.id);
                  return (
                    <tr key={b.id} className={`border-b border-border/60 hover:bg-surface-2 ${isConflict ? "bg-[color-mix(in_oklab,var(--conflict)_5%,transparent)]" : ""}`}>
                      <td className="py-1.5 mono">{formatTime(b.start)}–{formatTime(b.end)}</td>
                      <td className="py-1.5 truncate max-w-[200px]">{b.functionName}</td>
                      <td className="py-1.5 truncate max-w-[140px] text-muted">{c.name}</td>
                      <td className="py-1.5 truncate max-w-[140px] text-muted">{b.hallIds.map((h) => hallById(h).name).join(", ")}</td>
                      <td className="py-1.5 text-right mono">{b.expectedGuests}</td>
                      <td className="py-1.5 text-right mono">{formatINRShort(t.grand)}</td>
                      <td className="py-1.5 text-right"><span className="mono text-[9px] uppercase px-1" style={{ color: tok.color, border: `1px solid ${tok.color}` }}>{tok.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* Alerts */}
        <section className="col-span-12 lg:col-span-4 bg-bg p-4">
          <SectionHead title="Alerts" />
          <div className="space-y-px">
            {conflicts.size > 0 && Array.from(conflicts.entries()).slice(0, 3).map(([id, others]) => {
              const b = BOOKINGS.find((x) => x.id === id)!;
              return (
                <div key={id} className="px-2 py-1.5 border-l-2" style={{ borderColor: "var(--conflict)", background: "color-mix(in oklab, var(--conflict) 5%, transparent)" }}>
                  <div className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--conflict)" }}>! Conflict</div>
                  <div className="text-[11px] truncate">{b.functionName} ⇄ {others.length} more on {formatDate(b.start)}</div>
                </div>
              );
            })}
            {pencils.slice(0, 4).map((b) => (
              <div key={b.id} className="px-2 py-1.5 border-l-2" style={{ borderColor: "var(--pencil)" }}>
                <div className="text-[10px] uppercase tracking-widest mono" style={{ color: "var(--pencil)" }}>Pencil · exp {relativeDur(b.pencilExpiresAt!.getTime())}</div>
                <div className="text-[11px] truncate">{b.functionName}</div>
              </div>
            ))}
            {overdueDues.slice(0, 4).map((b) => {
              const t = bookingTotal(b);
              return (
                <div key={b.id} className="px-2 py-1.5 border-l-2" style={{ borderColor: "var(--conflict)" }}>
                  <div className="text-[10px] uppercase tracking-widest mono text-muted">Due {formatDate(b.start)}</div>
                  <div className="text-[11px] truncate flex justify-between"><span>{b.functionName}</span><span className="mono">{formatINRShort(t.balance)}</span></div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Cash sparkline */}
        <section className="col-span-12 lg:col-span-6 bg-bg p-4">
          <SectionHead title="Cash inflow — last 14 days" right={<span className="mono text-[10px] text-muted">total {formatINRShort(cashByDay.reduce((a,b)=>a+b,0))}</span>} />
          <div className="flex items-end gap-1 h-32">
            {cashByDay.map((v, i) => (
              <div key={i} className="flex-1 bg-accent/20 border-t border-accent" style={{ height: `${Math.max(2, (v / cashMax) * 100)}%` }} title={formatINRShort(v)} />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] mono text-muted">
            <span>-13d</span><span>-7d</span><span>today</span>
          </div>
        </section>

        {/* Funnel */}
        <section className="col-span-12 lg:col-span-6 bg-bg p-4">
          <SectionHead title="Enquiry funnel" right={<Link to="/enquiries" className="text-[10px] uppercase tracking-widest text-accent">Open →</Link>} />
          {Object.entries(funnel).map(([k, v]) => {
            const max = Math.max(...Object.values(funnel));
            return (
              <div key={k} className="mb-2">
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="uppercase tracking-wider">{k}</span>
                  <span className="mono">{v}</span>
                </div>
                <div className="h-2 bg-surface-2">
                  <div className="h-full bg-accent" style={{ width: `${(v / max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="bg-bg p-3">
      <div className="text-[9px] uppercase tracking-widest text-faint mono">{label}</div>
      <div className="text-[20px] font-semibold mono mt-0.5" style={color ? { color } : undefined}>{value}</div>
      <div className="text-[10px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}
function SectionHead({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-[10px] uppercase tracking-widest text-muted mono">{title}</h2>
      {right}
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-muted text-[11px] py-4">{children}</div>;
}
