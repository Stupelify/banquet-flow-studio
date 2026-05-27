import { createFileRoute } from "@tanstack/react-router";
import { BOOKINGS, customerById } from "@/lib/mock/data";
import { formatDate, formatINR } from "@/lib/format";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — Bika Ops" }, { name: "description", content: "Global payment ledger across all bookings." }] }),
  component: PaymentsPage,
});

function PaymentsPage() {
  const rows = BOOKINGS.flatMap((b) => b.payments.map((p) => ({ ...p, booking: b, customer: customerById(b.customerId) })))
    .sort((a, b) => +b.date - +a.date);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-y-auto scrollbar-thin">
      <header className="px-4 py-3 border-b border-border flex items-baseline gap-4">
        <h1 className="text-[12px] uppercase tracking-widest mono">Payments ledger</h1>
        <span className="mono text-[11px] text-muted">{rows.length} transactions · total {formatINR(total)}</span>
      </header>
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-2/40 text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
          <th className="text-left py-1.5 px-3 font-normal">Date</th>
          <th className="text-left py-1.5 font-normal">Booking</th>
          <th className="text-left py-1.5 font-normal">Customer</th>
          <th className="text-left py-1.5 font-normal">Method</th>
          <th className="text-left py-1.5 font-normal">Ref</th>
          <th className="text-left py-1.5 font-normal">Received by</th>
          <th className="text-right py-1.5 px-3 font-normal">Amount</th>
        </tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-surface-2">
              <td className="py-1.5 px-3 mono">{formatDate(r.date)}</td>
              <td className="py-1.5 mono">{r.booking.id}</td>
              <td className="py-1.5 truncate max-w-[160px]">{r.customer.name}</td>
              <td className="py-1.5">{r.method}</td>
              <td className="py-1.5 mono text-muted">{r.ref}</td>
              <td className="py-1.5 text-muted">{r.receivedBy}</td>
              <td className="py-1.5 px-3 text-right mono">{formatINR(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
