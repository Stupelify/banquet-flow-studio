import { createFileRoute } from "@tanstack/react-router";
import { ENQUIRIES, customerById, hallById } from "@/lib/mock/data";
import { formatDate, formatINRShort } from "@/lib/format";
import type { Enquiry } from "@/lib/mock/types";

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
  return (
    <div className="h-[calc(100vh-2.75rem)] overflow-hidden">
      <header className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h1 className="text-[12px] uppercase tracking-widest mono">Enquiries · {ENQUIRIES.length}</h1>
        <button className="px-2 py-1 text-[10px] uppercase tracking-widest bg-accent text-accent-fg">+ New Enquiry</button>
      </header>
      <div className="grid grid-cols-5 gap-px bg-border h-[calc(100%-2.5rem)]">
        {STAGES.map((s) => {
          const list = ENQUIRIES.filter((e) => e.stage === s);
          const total = list.reduce((sum, e) => sum + e.estValue, 0);
          return (
            <div key={s} className="bg-bg flex flex-col overflow-hidden">
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
