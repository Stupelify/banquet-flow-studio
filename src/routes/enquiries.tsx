import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ENQUIRIES, customerById, hallById } from "@/lib/mock/data";
import { formatDate, formatINRShort } from "@/lib/format";
import type { Enquiry, Booking } from "@/lib/mock/types";
import { useCan } from "@/lib/auth/store";
import { useOpsStore, newId } from "@/lib/api/store";

export const Route = createFileRoute("/enquiries")({
  head: () => ({ meta: [{ title: "Enquiries — Bika Ops" }, { name: "description", content: "Lead pipeline kanban: lead → quotation → pencil → won." }] }),
  component: EnquiriesPage,
});

const STAGES: Enquiry["stage"][] = ["Lead", "Quotation", "Pencil", "Won", "Lost"];
const COLORS: Record<Enquiry["stage"], string> = {
  Lead: "var(--muted)",
  Quotation: "var(--quotation)",
  Pencil: "var(--pencil)",
  Won: "var(--confirmed)",
  Lost: "var(--conflict)",
};

function EnquiriesPage() {
  const canConvert = useCan("enquiries.convert");
  const upsertBooking = useOpsStore((s) => s.upsertBooking);
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const convert = (e: Enquiry) => {
    setBusy(e.id);
    const start = new Date(e.date);
    const end = new Date(start.getTime() + 4 * 3_600_000);
    const halls = e.hallIds.map((hallId) => ({ hallId, charges: 0 }));
    const draft: Booking = {
      id: newId("BK"),
      status: "quotation",
      source: "in-app",
      functionName: `${e.functionType} (from ${e.id})`,
      functionType: e.functionType,
      customerId: e.customerId,
      start, end,
      hallIds: e.hallIds,
      halls,
      expectedGuests: e.expectedGuests,
      confirmedGuests: 0,
      packs: [],
      hallCharges: 0,
      additionalItems: [],
      extras: [],
      discountAmount: 0, discountPercentage: 0,
      discountAmount2nd: 0, discountPercentage2nd: 0,
      discount1: 0, discount2Pct: 0,
      settlementDiscount: 0,
      taxPct: 0,
      advanceRequired: 0,
      isQuotation: true, isPencilBooking: false,
      payments: [],
      notes: e.notes ?? `Converted from enquiry ${e.id}`,
      versions: 1,
    };
    upsertBooking(draft, { isNew: true });
    setBusy(null);
    nav({ to: "/bookings", search: { id: draft.id } });
  };

  return (
    <div className="h-[calc(100dvh-3.5rem)] lg:h-[calc(100vh-2.75rem)] overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h1 className="text-[12px] uppercase tracking-widest mono">Enquiries · {ENQUIRIES.length}</h1>
      </header>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border h-[calc(100%-2.5rem)] overflow-x-auto">
        {STAGES.map((s) => {
          const list = ENQUIRIES.filter((e) => e.stage === s);
          const total = list.reduce((sum, e) => sum + e.estValue, 0);
          return (
            <div key={s} className="bg-bg flex flex-col overflow-hidden min-w-[180px]">
              <div className="px-2 py-1.5 border-b border-border flex items-center justify-between" style={{ borderTop: `2px solid ${COLORS[s]}` }}>
                <span className="text-[10px] uppercase tracking-widest mono" style={{ color: COLORS[s] }}>{s}</span>
                <span className="mono text-[10px] text-muted">{list.length} · {formatINRShort(total)}</span>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-thin p-1.5 space-y-1.5">
                {list.map((e) => {
                  const c = customerById(e.customerId);
                  return (
                    <div key={e.id} className="bg-surface border border-border p-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-[12px] font-medium truncate">{c.name}</span>
                        <span className="mono text-[10px] text-muted">{e.id}</span>
                      </div>
                      <div className="text-[10px] text-muted">{e.functionType}</div>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] mono">
                        <span>{formatDate(e.date)}</span>
                        <span>{e.expectedGuests}p</span>
                        <span className="font-medium">{formatINRShort(e.estValue)}</span>
                      </div>
                      <div className="mt-1 text-[10px] text-muted truncate">{e.hallIds.map((h) => hallById(h).name).join(", ")}</div>
                      {canConvert && s !== "Won" && s !== "Lost" && (
                        <button
                          onClick={() => convert(e)}
                          disabled={busy === e.id}
                          className="mt-2 w-full text-[10px] uppercase tracking-widest mono border border-accent text-accent hover:bg-accent hover:text-accent-fg px-2 py-1 disabled:opacity-50"
                        >{busy === e.id ? "Converting…" : "Convert → Booking"}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
