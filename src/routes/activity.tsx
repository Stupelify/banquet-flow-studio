import { createFileRoute } from "@tanstack/react-router";
import { useBookings, useCustomerLookup } from "@/lib/mock/hooks";
import { useAuditLogs } from "@/lib/mock/hooks";
import { formatDateTime } from "@/lib/format";
import { useMemo } from "react";

export const Route = createFileRoute("/activity")({
  head: () => ({ meta: [{ title: "Activity — Bika Ops" }, { name: "description", content: "Audit trail of edits across the system." }] }),
  component: ActivityPage,
});

const FALLBACK_ACTIONS = ["created", "updated", "marked confirmed", "added payment", "changed hall", "edited pencil expiry"];
const FALLBACK_USERS = ["Suresh Iyer", "Anita Khan", "Vikram Patel", "Rakesh Mehta"];

function ActivityPage() {
  const live = useAuditLogs();
  const bookings = useBookings();
  const lookup = useCustomerLookup();

  const rows = useMemo(() => {
    const liveRows = live.map((l) => ({
      id: l.id,
      when: new Date(l.createdAt),
      user: l.userName ?? "—",
      action: `${l.action} ${l.resource}`,
      target: l.resourceId ?? "—",
      targetLabel: l.resourceLabel ?? "",
      ip: l.ipAddress ?? "local",
    }));
    const seedRows = bookings.slice(0, 60).map((b, i) => ({
      id: `LOG-SEED-${1000 + i}`,
      when: new Date(Date.now() - (i + live.length) * 3_600_000 * 2),
      user: FALLBACK_USERS[i % FALLBACK_USERS.length],
      action: FALLBACK_ACTIONS[i % FALLBACK_ACTIONS.length],
      target: b.id,
      targetLabel: `${b.functionName} · ${lookup(b.customerId).name}`,
      ip: `10.0.${(i * 13) % 256}.${(i * 7) % 256}`,
    }));
    return [...liveRows, ...seedRows];
  }, [live, bookings, lookup]);

  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-y-auto scrollbar-thin">
      <header className="px-4 py-3 border-b border-border flex items-baseline gap-4">
        <h1 className="text-[12px] uppercase tracking-widest mono">Activity log</h1>
        <span className="mono text-[11px] text-muted">{live.length} live · {rows.length} total</span>
      </header>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
          <th className="text-left py-1.5 px-3 font-normal">When</th>
          <th className="text-left py-1.5 font-normal">User</th>
          <th className="text-left py-1.5 font-normal">Action</th>
          <th className="text-left py-1.5 font-normal">Target</th>
          <th className="text-left py-1.5 font-normal">Details</th>
          <th className="text-left py-1.5 px-3 font-normal">IP</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-surface-2">
              <td className="py-1.5 px-3 mono">{formatDateTime(r.when)}</td>
              <td className="py-1.5">{r.user}</td>
              <td className="py-1.5 text-muted">{r.action}</td>
              <td className="py-1.5 mono">{r.target}</td>
              <td className="py-1.5 truncate max-w-[260px]">{r.targetLabel}</td>
              <td className="py-1.5 px-3 mono text-muted">{r.ip}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
