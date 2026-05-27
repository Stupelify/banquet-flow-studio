import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { CUSTOMERS, BOOKINGS, bookingTotal } from "@/lib/mock/data";
import { formatDate, formatINRShort } from "@/lib/format";
import { useMemo, useState } from "react";

const searchSchema = z.object({ id: z.string().optional() });

export const Route = createFileRoute("/customers")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Customers — Bika Ops" }, { name: "description", content: "Customer CRM with referral chain and full booking history." }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const search = useSearch({ from: "/customers" });
  const nav = Route.useNavigate();
  const [q, setQ] = useState("");
  const list = useMemo(() => CUSTOMERS.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)), [q]);
  const selectedId = search.id ?? list[0]?.id;
  const c = CUSTOMERS.find((x) => x.id === selectedId);

  return (
    <div className="flex h-[calc(100vh-2.75rem)] overflow-hidden">
      <div className="w-72 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="p-2 border-b border-border">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="w-full h-8 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent" />
          <div className="text-[10px] text-muted mono mt-1">{list.length} of {CUSTOMERS.length}</div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {list.map((c) => (
            <button key={c.id} onClick={() => nav({ search: { id: c.id } })} className={`block w-full text-left px-3 py-2 border-b border-border/60 hover:bg-surface-2 ${c.id === selectedId ? "bg-surface-2 border-l-2 border-l-accent" : "border-l-2 border-l-transparent"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium truncate">{c.name}</span>
                {c.priority === "VIP" && <span className="mono text-[9px] uppercase px-1" style={{ color: "var(--pencil)", border: "1px solid var(--pencil)" }}>VIP</span>}
              </div>
              <div className="text-[10px] mono text-muted">{c.phone} · {c.city}</div>
            </button>
          ))}
        </div>
      </div>

      {c ? (
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <header className="px-4 py-3 border-b border-border">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[18px] font-semibold">{c.name}</h1>
              <span className="mono text-[10px] text-muted">{c.id}</span>
              {c.priority === "VIP" && <span className="mono text-[9px] uppercase px-1" style={{ color: "var(--pencil)", border: "1px solid var(--pencil)" }}>VIP</span>}
              <span className="ml-auto mono text-[11px] text-muted">{"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)} · {c.visitCount} visits</span>
            </div>
          </header>
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3">
            <F k="Phone" v={c.phone} mono />
            {c.altPhone && <F k="Alt phone" v={c.altPhone} mono />}
            <F k="Email" v={c.email} mono />
            <F k="City" v={c.city} />
            <F k="Community" v={c.community ?? "—"} />
            <F k="DOB" v={c.dob ? formatDate(c.dob) : "—"} mono />
            <F k="Anniversary" v={c.anniversary ? formatDate(c.anniversary) : "—"} mono />
            <F k="Occupation" v={c.occupation ?? "—"} />
            <F k="Company" v={c.company ?? "—"} />
            <F k="GST" v={c.gst ?? "—"} mono />
            <F k="PAN" v={c.pan ?? "—"} mono />
            <F k="Priority" v={c.priority} />
          </div>
          <section className="border-t border-border p-4">
            <h3 className="text-[10px] uppercase tracking-widest text-muted mono mb-2">Referral chain</h3>
            <div className="text-[11px]">
              {c.referredBy && <div>Referred by <span className="text-accent">{CUSTOMERS.find((x) => x.id === c.referredBy)?.name}</span></div>}
              {c.referrals.length > 0 && <div>Has referred: {c.referrals.map((r) => CUSTOMERS.find((x) => x.id === r)?.name).join(", ")}</div>}
              {!c.referredBy && c.referrals.length === 0 && <div className="text-muted">No referrals on record.</div>}
            </div>
          </section>
          <section className="border-t border-border p-4">
            <h3 className="text-[10px] uppercase tracking-widest text-muted mono mb-2">Booking history</h3>
            <table className="w-full text-[11px]">
              <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
                <th className="text-left py-1.5 font-normal">ID</th>
                <th className="text-left py-1.5 font-normal">Date</th>
                <th className="text-left py-1.5 font-normal">Function</th>
                <th className="text-right py-1.5 font-normal">Total</th>
                <th className="text-right py-1.5 font-normal">Balance</th>
                <th className="text-right py-1.5 font-normal">Status</th>
              </tr></thead>
              <tbody>
                {BOOKINGS.filter((b) => b.customerId === c.id).map((b) => {
                  const t = bookingTotal(b);
                  return (
                    <tr key={b.id} className="border-b border-border/60">
                      <td className="py-1.5 mono">{b.id}</td>
                      <td className="py-1.5 mono">{formatDate(b.start)}</td>
                      <td className="py-1.5 truncate max-w-[200px]">{b.functionName}</td>
                      <td className="py-1.5 text-right mono">{formatINRShort(t.grand)}</td>
                      <td className={`py-1.5 text-right mono ${t.balance > 0 ? "text-conflict" : "text-confirmed"}`}>{formatINRShort(t.balance)}</td>
                      <td className="py-1.5 text-right mono text-[10px] uppercase">{b.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </div>
      ) : <div className="flex-1 grid place-items-center text-muted">Select a customer</div>}
    </div>
  );
}

function F({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="border-l border-border pl-2">
      <div className="text-[9px] uppercase tracking-widest text-faint mono">{k}</div>
      <div className={`text-[12px] ${mono ? "mono" : ""}`}>{v}</div>
    </div>
  );
}
