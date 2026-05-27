import { createFileRoute } from "@tanstack/react-router";
import { BOOKINGS, bookingTotal, HALLS } from "@/lib/mock/data";
import { formatINRShort } from "@/lib/format";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — Bika Ops" }, { name: "description", content: "Revenue, hall utilization, conversion." }] }),
  component: ReportsPage,
});

function ReportsPage() {
  const byType = new Map<string, number>();
  for (const b of BOOKINGS) byType.set(b.functionType, (byType.get(b.functionType) ?? 0) + bookingTotal(b).grand);
  const maxType = Math.max(...byType.values());

  const byHall = HALLS.map((h) => {
    const hrs = BOOKINGS.filter((b) => b.hallIds.includes(h.id)).reduce((s, b) => s + (b.end.getTime() - b.start.getTime()) / 3_600_000, 0);
    return { h, hrs };
  });
  const maxHrs = Math.max(...byHall.map((x) => x.hrs));

  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-y-auto scrollbar-thin p-4 grid grid-cols-1 lg:grid-cols-2 gap-px bg-border">
      <section className="bg-bg p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted mono mb-3">Revenue by function type</h2>
        <div className="space-y-2">
          {Array.from(byType.entries()).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k}>
              <div className="flex justify-between text-[11px] mb-0.5"><span>{k}</span><span className="mono">{formatINRShort(v)}</span></div>
              <div className="h-2 bg-surface-2"><div className="h-full bg-accent" style={{ width: `${(v / maxType) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-bg p-4">
        <h2 className="text-[10px] uppercase tracking-widest text-muted mono mb-3">Hall utilization (hours)</h2>
        <div className="space-y-2">
          {byHall.sort((a, b) => b.hrs - a.hrs).map(({ h, hrs }) => (
            <div key={h.id}>
              <div className="flex justify-between text-[11px] mb-0.5"><span>{h.name}</span><span className="mono">{hrs.toFixed(0)}h</span></div>
              <div className="h-2 bg-surface-2"><div className="h-full bg-confirmed" style={{ width: `${(hrs / maxHrs) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
