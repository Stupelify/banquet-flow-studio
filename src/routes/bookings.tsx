import { useMemo, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { useBookings, useCustomerLookup, useCustomers, bookingTotal, staticHallById as hallById } from "@/lib/mock/hooks";
import { useOpsStore } from "@/lib/api/store";
import { formatDate, formatINR, formatINRShort, formatTime, relativeDur } from "@/lib/format";
import { statusToken } from "@/lib/calendar-utils";
import type { Booking } from "@/lib/mock/types";
import { BookingFormDialog } from "@/components/forms/BookingFormDialog";
import { PaymentFormDialog } from "@/components/forms/PaymentFormDialog";

const searchSchema = z.object({ id: z.string().optional(), status: z.string().optional(), q: z.string().optional() });

export const Route = createFileRoute("/bookings")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Bookings — Bika Ops" }, { name: "description", content: "All bookings — master-detail with money stack, halls, meal packs, payments." }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const search = useSearch({ from: "/bookings" });
  const nav = Route.useNavigate();
  const bookings = useBookings();
  const customers = useCustomers();
  const customerLookup = useCustomerLookup();
  const deleteBooking = useOpsStore((s) => s.deleteBooking);

  const [q, setQ] = useState(search.q ?? "");
  const [statusFilter, setStatusFilter] = useState<string>(search.status ?? "all");
  const [editing, setEditing] = useState<Booking | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    return bookings
      .filter((b) => statusFilter === "all" || b.status === statusFilter)
      .filter((b) => {
        if (!q) return true;
        const lo = q.toLowerCase();
        const c = customerLookup(b.customerId);
        return b.functionName.toLowerCase().includes(lo) || b.id.toLowerCase().includes(lo) || c.name.toLowerCase().includes(lo);
      })
      .sort((a, b) => +b.start - +a.start);
  }, [bookings, q, statusFilter, customerLookup]);

  const selectedId = search.id ?? filtered[0]?.id ?? null;
  const selected = selectedId ? bookings.find((b) => b.id === selectedId) ?? null : null;

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-2.75rem)] overflow-hidden flex-col lg:flex-row">
      {/* Master */}
      <div className={`${selectedId ? "hidden lg:flex" : "flex"} w-full lg:w-[420px] shrink-0 border-r border-border flex-col bg-surface`}>
        <div className="p-2 border-b border-border space-y-2">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bookings, customers…"
              className="flex-1 h-8 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent"
            />
            <button
              onClick={() => setCreating(true)}
              className="h-8 px-2 text-[11px] uppercase tracking-widest mono bg-accent text-accent-fg whitespace-nowrap"
            >+ New</button>
          </div>
          <div className="flex gap-px overflow-x-auto scrollbar-thin">
            {(["all", "confirmed", "pencil", "quotation", "enquiry", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 text-[10px] uppercase tracking-widest mono border ${statusFilter === s ? "border-accent text-fg" : "border-border text-muted hover:text-fg"}`}
              >{s}</button>
            ))}
          </div>
          <div className="text-[10px] mono text-muted">{filtered.length} results</div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filtered.map((b) => {
            const c = customerLookup(b.customerId);
            const total = bookingTotal(b);
            const sel = b.id === selectedId;
            const tok = statusToken(b.status);
            const paidPct = total.grand > 0 ? Math.round((total.received / total.grand) * 100) : 0;
            return (
              <button
                key={b.id}
                onClick={() => nav({ search: { ...search, id: b.id } })}
                className={`block w-full text-left px-3 py-2 border-b border-border/60 hover:bg-surface-2 ${sel ? "bg-surface-2" : ""}`}
                style={sel ? { borderLeft: `2px solid ${tok.color}` } : { borderLeft: "2px solid transparent" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="mono text-[10px] text-muted">{b.id}</span>
                  <span className="mono text-[10px]">{formatDate(b.start)}</span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2">
                  <span className="text-[12px] font-medium truncate">{b.functionName}</span>
                  <span className="mono text-[11px] shrink-0">{formatINRShort(total.grand)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[10px]">
                  <span className="text-muted truncate">{c.name} · {b.hallIds.map((h) => hallById(h).name).join(", ")}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="mono text-[9px] uppercase tracking-widest px-1" style={{ color: tok.color, border: `1px solid ${tok.color}` }}>{tok.label}</span>
                  {b.status === "pencil" && b.pencilExpiresAt && (
                    <span className="mono text-[9px]" style={{ color: tok.color }}>exp {relativeDur(b.pencilExpiresAt.getTime())}</span>
                  )}
                  <span className={`mono text-[9px] ml-auto ${total.balance > 0 ? "text-conflict" : "text-confirmed"}`}>
                    {paidPct}% paid
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail */}
      <div className={`${selected ? "flex" : "hidden lg:flex"} flex-1 min-w-0`}>
        {selected ? (
          <BookingDetail
            booking={selected}
            onBack={() => nav({ search: { ...search, id: undefined } })}
            onEdit={() => setEditing(selected)}
            onDelete={() => { if (confirm(`Delete booking ${selected.id}?`)) { deleteBooking(selected.id); nav({ search: { ...search, id: undefined } }); } }}
            lookup={customerLookup}
          />
        ) : (
          <div className="flex-1 grid place-items-center text-muted">Select a booking</div>
        )}
      </div>

      <BookingFormDialog
        open={creating || !!editing}
        onOpenChange={(o) => { if (!o) { setCreating(false); setEditing(null); } }}
        booking={editing}
        customers={customers.map((c) => ({ id: c.id, name: c.name, phone: c.phone }))}
      />
    </div>
  );
}

function BookingDetail({
  booking: b, onBack, onEdit, onDelete, lookup,
}: {
  booking: Booking;
  onBack?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  lookup: (id: string) => ReturnType<typeof useCustomerLookup> extends (id: string) => infer R ? R : never;
}) {
  const c = lookup(b.customerId);
  const total = bookingTotal(b);
  const tok = statusToken(b.status);
  const paidPct = total.grand > 0 ? Math.min(100, Math.round((total.received / total.grand) * 100)) : 0;
  const [tab, setTab] = useState<"overview" | "money" | "packs" | "halls" | "payments" | "versions">("overview");
  const [paying, setPaying] = useState(false);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-bg">
      <header className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0 flex items-start gap-2">
          {onBack && (
            <button onClick={onBack} className="lg:hidden mono text-[14px] leading-none px-1 -ml-1 text-muted hover:text-fg" aria-label="Back">‹</button>
          )}
          <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] text-muted">{b.id}</span>
            <span className="mono text-[10px] uppercase tracking-widest px-1.5 py-0.5 border" style={{ color: tok.color, borderColor: tok.color }}>{tok.label}</span>
            <span className="mono text-[10px] text-muted">v{b.versions}</span>
          </div>
          <h1 className="text-[18px] font-semibold leading-tight mt-1">{b.functionName}</h1>
          <div className="text-[11px] text-muted mt-0.5">{c.name} · {c.phone} · {formatDate(b.start)} {formatTime(b.start)}–{formatTime(b.end)}</div>
          </div>
        </div>
        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
          <button onClick={onEdit} className="px-2 py-1 text-[10px] uppercase tracking-widest mono border border-border hover:bg-surface-2">Edit</button>
          <button onClick={onDelete} className="px-2 py-1 text-[10px] uppercase tracking-widest mono border border-border text-conflict hover:bg-surface-2">Delete</button>
          <button onClick={() => setPaying(true)} className="px-2 py-1 text-[10px] uppercase tracking-widest mono bg-accent text-accent-fg">Add Payment</button>
        </div>
      </header>

      <div className="px-4 border-b border-border flex gap-px shrink-0">
        {(["overview", "money", "packs", "halls", "payments", "versions"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2 py-1.5 text-[10px] uppercase tracking-widest mono border-b-2 ${tab === t ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >{t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin grid grid-cols-12 gap-0">
        <div className="col-span-12 lg:col-span-8 p-4 border-r border-border space-y-5">
          {tab === "overview" && (
            <>
              <Section title="Customer">
                <Grid>
                  <Field k="Name" v={c.name} />
                  <Field k="Priority" v={c.priority} color={c.priority === "VIP" ? "var(--pencil)" : undefined} />
                  <Field k="Phone" v={c.phone} mono />
                  <Field k="Alt phone" v={c.altPhone ?? "—"} mono />
                  <Field k="Email" v={c.email} mono />
                  <Field k="City" v={c.city} />
                  <Field k="Community" v={c.community ?? "—"} />
                  <Field k="GST" v={c.gst ?? "—"} mono />
                </Grid>
              </Section>
              <Section title="Function">
                <Grid>
                  <Field k="Type" v={b.functionType} />
                  <Field k="Expected guests" v={String(b.expectedGuests)} mono />
                  <Field k="Confirmed guests" v={String(b.confirmedGuests)} mono />
                  <Field k="Source" v={b.source} mono />
                </Grid>
              </Section>
              {b.notes && (
                <Section title="Notes">
                  <p className="text-[12px]">{b.notes}</p>
                </Section>
              )}
            </>
          )}
          {tab === "halls" && (
            <Section title={`Halls (${b.hallIds.length})`}>
              <table className="w-full text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
                  <th className="text-left py-1.5 font-normal">Hall</th>
                  <th className="text-left py-1.5 font-normal">Floor</th>
                  <th className="text-right py-1.5 font-normal">Capacity</th>
                  <th className="text-right py-1.5 font-normal">Charge</th>
                </tr></thead>
                <tbody>
                  {b.hallIds.map((hid) => {
                    const h = hallById(hid);
                    return (
                      <tr key={hid} className="border-b border-border/60">
                        <td className="py-1.5">{h.name}</td>
                        <td className="py-1.5 mono text-muted">F{h.floor}</td>
                        <td className="py-1.5 text-right mono">{h.capacity}</td>
                        <td className="py-1.5 text-right mono">{formatINR(h.basePrice)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          )}
          {tab === "packs" && (
            <Section title="Meal packs">
              {b.packs.length === 0 ? <div className="text-muted text-[11px]">No meal packs.</div> :
              <table className="w-full text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
                  <th className="text-left py-1.5 font-normal">Slot</th>
                  <th className="text-left py-1.5 font-normal">Menu</th>
                  <th className="text-right py-1.5 font-normal">Plates</th>
                  <th className="text-right py-1.5 font-normal">Rate</th>
                  <th className="text-right py-1.5 font-normal">Setup</th>
                  <th className="text-right py-1.5 font-normal">Total</th>
                </tr></thead>
                <tbody>
                  {b.packs.map((p, i) => (
                    <tr key={i} className="border-b border-border/60">
                      <td className="py-1.5">{p.slot}</td>
                      <td className="py-1.5 text-muted">{p.menuName}</td>
                      <td className="py-1.5 text-right mono">{p.plates}</td>
                      <td className="py-1.5 text-right mono">{formatINR(p.ratePerPlate)}</td>
                      <td className="py-1.5 text-right mono">{formatINR(p.setupCost)}</td>
                      <td className="py-1.5 text-right mono font-medium">{formatINR(p.plates * p.ratePerPlate + p.setupCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </Section>
          )}
          {tab === "payments" && (
            <Section title="Payment ledger">
              {b.payments.length === 0 ? <div className="text-muted text-[11px]">No payments yet. Click <em>Add Payment</em> above.</div> :
              <table className="w-full text-[11px]">
                <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
                  <th className="text-left py-1.5 font-normal">Date</th>
                  <th className="text-left py-1.5 font-normal">Method</th>
                  <th className="text-left py-1.5 font-normal">Ref</th>
                  <th className="text-left py-1.5 font-normal">Received by</th>
                  <th className="text-right py-1.5 font-normal">Amount</th>
                </tr></thead>
                <tbody>
                  {b.payments.map((p) => (
                    <tr key={p.id} className="border-b border-border/60">
                      <td className="py-1.5 mono">{formatDate(p.date)}</td>
                      <td className="py-1.5">{p.method}</td>
                      <td className="py-1.5 mono text-muted">{p.ref}</td>
                      <td className="py-1.5">{p.receivedBy}</td>
                      <td className="py-1.5 text-right mono">{formatINR(p.amount)}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={4} className="py-2 mono uppercase text-[10px] tracking-widest text-muted text-right">Received</td><td className="py-2 text-right mono font-medium">{formatINR(total.received)}</td></tr>
                </tbody>
              </table>}
            </Section>
          )}
          {tab === "versions" && (
            <Section title="Version history">
              <ol className="space-y-2">
                {Array.from({ length: b.versions }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 border-b border-border/60 py-1.5">
                    <span className="mono text-[10px] text-muted">v{b.versions - i}</span>
                    <span className="text-[11px]">{i === 0 ? "Current" : `Edit — ${formatDate(new Date(Date.now() - (i + 1) * 86400000))}`}</span>
                    <span className="ml-auto text-[10px] text-muted">by {["Suresh", "Anita", "Vikram"][i % 3]}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}
          {tab === "money" && (
            <Section title="Money breakdown">
              <table className="w-full text-[11px] mono">
                <tbody>
                  <tr><td className="py-1 text-muted">Hall charges</td><td className="text-right">{formatINR(b.hallCharges)}</td></tr>
                  {b.packs.map((p, i) => (
                    <tr key={i}><td className="py-1 text-muted">{p.slot} — {p.plates}×{formatINR(p.ratePerPlate)} + setup</td><td className="text-right">{formatINR(p.plates * p.ratePerPlate + p.setupCost)}</td></tr>
                  ))}
                  {b.extras.map((e, i) => (
                    <tr key={i}><td className="py-1 text-muted">{e.label}</td><td className="text-right">{formatINR(e.amount)}</td></tr>
                  ))}
                  <tr className="border-t border-border"><td className="py-1.5">Subtotal</td><td className="text-right font-medium">{formatINR(total.sub)}</td></tr>
                </tbody>
              </table>
            </Section>
          )}
        </div>

        {/* Money stack */}
        <aside className="col-span-12 lg:col-span-4 p-4 bg-surface-2/30">
          <div className="border border-border p-3 bg-surface mono">
            <div className="text-[9px] uppercase tracking-widest text-faint mb-3">Money stack</div>
            <Row k="Subtotal" v={formatINR(total.sub)} />
            {b.discount1 > 0 && <Row k="Discount" v={`- ${formatINR(b.discount1)}`} color="var(--conflict)" />}
            {b.discount2Pct > 0 && <Row k={`Discount ${b.discount2Pct}%`} v={`- ${formatINR((total.afterD1 * b.discount2Pct) / 100)}`} color="var(--conflict)" />}
            {b.settlementDiscount > 0 && <Row k="Settlement disc." v={`- ${formatINR(b.settlementDiscount)}`} color="var(--conflict)" />}
            <Row k={`GST ${b.taxPct}%`} v={`+ ${formatINR(total.tax)}`} />
            <div className="h-px bg-border my-2" />
            <Row k="GRAND TOTAL" v={formatINR(total.grand)} bold />
            <div className="h-px bg-border my-2" />
            <Row k="Advance required" v={formatINR(b.advanceRequired)} />
            <Row k="Received" v={formatINR(total.received)} color="var(--confirmed)" />
            <Row k="Balance" v={formatINR(total.balance)} color={total.balance > 0 ? "var(--conflict)" : "var(--confirmed)"} bold />
            <div className="h-1.5 bg-bg mt-2">
              <div className="h-full bg-confirmed" style={{ width: `${paidPct}%` }} />
            </div>
            <div className="text-[10px] text-muted text-right mt-1">{paidPct}% paid</div>
          </div>
        </aside>
      </div>

      <PaymentFormDialog open={paying} onOpenChange={setPaying} bookingId={b.id} balanceHint={total.balance} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">{title}</div>
      {children}
    </section>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-2">{children}</div>;
}
function Field({ k, v, mono, color }: { k: string; v: string; mono?: boolean; color?: string }) {
  return (
    <div className="border-l border-border pl-2">
      <div className="text-[9px] uppercase tracking-widest text-faint mono">{k}</div>
      <div className={`text-[12px] ${mono ? "mono" : ""}`} style={color ? { color } : undefined}>{v}</div>
    </div>
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
