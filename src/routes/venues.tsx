import { createFileRoute } from "@tanstack/react-router";
import { VENUES, HALLS, BOOKINGS, bookingTotal } from "@/lib/mock/data";
import { formatINR, formatINRShort, dayKey } from "@/lib/format";

export const Route = createFileRoute("/venues")({
  head: () => ({ meta: [{ title: "Venues — Bika Ops" }, { name: "description", content: "Banquets and halls." }] }),
  component: VenuesPage,
});

function VenuesPage() {
  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-y-auto scrollbar-thin p-4 space-y-6">
      {VENUES.map((v) => {
        const halls = HALLS.filter((h) => h.venueId === v.id);
        return (
          <section key={v.id}>
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="text-[14px] font-semibold">{v.name}</h2>
              <span className="mono text-[10px] text-muted uppercase tracking-widest">{v.city} · {halls.length} halls</span>
            </div>
            <table className="w-full text-[11px] border-y border-border">
              <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono">
                <th className="text-left py-1.5 px-2 font-normal">Hall</th>
                <th className="text-left py-1.5 font-normal">Floor</th>
                <th className="text-right py-1.5 font-normal">Capacity</th>
                <th className="text-right py-1.5 font-normal">Floating</th>
                <th className="text-right py-1.5 font-normal">Base price</th>
                <th className="text-right py-1.5 font-normal">Bookings (30d)</th>
                <th className="text-right py-1.5 font-normal pr-2">Revenue (30d)</th>
              </tr></thead>
              <tbody>
                {halls.map((h) => {
                  const upcoming = BOOKINGS.filter((b) => b.hallIds.includes(h.id) && Math.abs(b.start.getTime() - Date.now()) < 30 * 86400000);
                  const rev = upcoming.filter((b) => b.status === "confirmed").reduce((s, b) => s + bookingTotal(b).grand, 0);
                  return (
                    <tr key={h.id} className="border-b border-border/60 hover:bg-surface-2">
                      <td className="py-1.5 px-2 font-medium">{h.name}</td>
                      <td className="py-1.5 mono text-muted">F{h.floor}</td>
                      <td className="py-1.5 text-right mono">{h.capacity}</td>
                      <td className="py-1.5 text-right mono text-muted">{h.floatingCapacity}</td>
                      <td className="py-1.5 text-right mono">{formatINR(h.basePrice)}</td>
                      <td className="py-1.5 text-right mono">{upcoming.length}</td>
                      <td className="py-1.5 text-right mono pr-2">{formatINRShort(rev)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
