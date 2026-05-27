import { useMemo } from "react";
import { BOOKINGS, HALLS, VENUES, customerById, bookingTotal } from "@/lib/mock/data";
import type { Booking } from "@/lib/mock/types";
import { detectConflicts, statusToken } from "@/lib/calendar-utils";
import { formatINRShort, formatTime, relativeDur, dayKey } from "@/lib/format";

const START_H = 8;
const END_H = 26; // 02:00 next day
const TOTAL_H = END_H - START_H;
const PX_PER_H = 64;

export function HallBoard({
  date,
  selectedId,
  onSelect,
  filterStatus,
  filterSource,
  filterHallIds,
}: {
  date: Date;
  selectedId: string | null;
  onSelect: (id: string, conflicts: string[]) => void;
  filterStatus: Set<Booking["status"]>;
  filterSource: Set<Booking["source"]>;
  filterHallIds: Set<string>;
}) {
  const dayB = useMemo(() => {
    const k = dayKey(date);
    return BOOKINGS.filter((b) => {
      if (dayKey(b.start) !== k) return false;
      if (!filterStatus.has(b.status)) return false;
      if (!filterSource.has(b.source)) return false;
      if (!b.hallIds.some((h) => filterHallIds.has(h))) return false;
      return true;
    });
  }, [date, filterStatus, filterSource, filterHallIds]);

  const conflicts = useMemo(() => detectConflicts(dayB), [dayB]);

  const visibleHalls = HALLS.filter((h) => filterHallIds.has(h.id));

  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      {conflicts.size > 0 && (
        <div className="sticky top-0 z-20 px-3 py-1.5 border-b border-border flex items-center gap-3 mono text-[11px]" style={{ background: "color-mix(in oklab, var(--conflict) 12%, var(--surface))", color: "var(--conflict)" }}>
          <span className="font-semibold uppercase tracking-widest">! {Array.from(new Set(Array.from(conflicts.keys()))).length} hall conflicts</span>
          <span className="text-muted">— overlapping bookings on shared halls. Click to resolve.</span>
        </div>
      )}
      <div className="min-w-[1100px] relative">
        {/* Time header */}
        <div className="sticky top-0 z-10 flex border-b border-border bg-bg">
          <div className="w-44 shrink-0 border-r border-border bg-surface px-3 h-8 flex items-center text-[10px] uppercase tracking-widest text-faint mono">Hall / Time</div>
          <div className="flex-1 relative h-8">
            {Array.from({ length: TOTAL_H + 1 }).map((_, i) => {
              const h = START_H + i;
              const label = h >= 24 ? `${String(h - 24).padStart(2, "0")}:00` : `${String(h).padStart(2, "0")}:00`;
              const slotShade =
                (h >= 8 && h < 10) || (h >= 12 && h < 14) || (h >= 16 && h < 18) || (h >= 19 && h < 22);
              return (
                <div
                  key={i}
                  className="absolute top-0 bottom-0 border-l border-border/60"
                  style={{ left: i * PX_PER_H, width: PX_PER_H }}
                >
                  <div className={`h-full flex items-center px-2 text-[10px] mono text-muted ${slotShade ? "bg-surface-2/60" : ""}`}>
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rows */}
        {VENUES.map((v) => {
          const halls = visibleHalls.filter((h) => h.venueId === v.id);
          if (!halls.length) return null;
          return (
            <div key={v.id}>
              <div className="flex border-b border-border bg-surface-2/40 h-6 sticky left-0">
                <div className="w-44 shrink-0 px-3 flex items-center text-[10px] uppercase tracking-widest mono text-muted">{v.name}</div>
                <div className="flex-1" />
              </div>
              {halls.map((h) => {
                const rowB = dayB.filter((b) => b.hallIds.includes(h.id));
                const hasConflict = rowB.some((b) => conflicts.has(b.id));
                return (
                  <div key={h.id} className="flex border-b border-border" style={{ height: 56 }}>
                    <div className={`w-44 shrink-0 border-r border-border px-3 py-1.5 flex flex-col justify-center ${hasConflict ? "bg-[color-mix(in_oklab,var(--conflict)_8%,transparent)]" : ""}`}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-medium truncate">{h.name}</span>
                        {hasConflict && <span className="mono text-[9px] uppercase" style={{ color: "var(--conflict)" }}>!</span>}
                      </div>
                      <div className="text-[10px] text-muted mono">cap {h.capacity} · F{h.floor}</div>
                    </div>
                    <div className="flex-1 relative" style={{ width: TOTAL_H * PX_PER_H }}>
                      {/* hour grid lines */}
                      {Array.from({ length: TOTAL_H }).map((_, i) => (
                        <div key={i} className="absolute top-0 bottom-0 border-l border-border/40" style={{ left: i * PX_PER_H }} />
                      ))}
                      {rowB.map((b) => (
                        <EventBlock
                          key={b.id}
                          b={b}
                          selected={b.id === selectedId}
                          conflict={conflicts.has(b.id)}
                          onClick={() => onSelect(b.id, conflicts.get(b.id) ?? [])}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventBlock({ b, selected, conflict, onClick }: { b: Booking; selected: boolean; conflict: boolean; onClick: () => void }) {
  const startMin = b.start.getHours() * 60 + b.start.getMinutes();
  const endMin = b.end.getHours() * 60 + b.end.getMinutes();
  const left = ((startMin - START_H * 60) / 60) * PX_PER_H;
  const width = Math.max(60, ((endMin - startMin) / 60) * PX_PER_H);
  const c = customerById(b.customerId);
  const tok = statusToken(b.status);
  const total = bookingTotal(b);

  const base: React.CSSProperties = {
    left, width, top: 4, bottom: 4,
    borderLeft: `3px solid ${tok.color}`,
  };
  const fill =
    b.status === "confirmed" ? `color-mix(in oklab, ${tok.color} 16%, var(--surface))` :
    b.status === "pencil" ? "transparent" :
    b.status === "quotation" ? `color-mix(in oklab, ${tok.color} 8%, var(--surface))` :
    `color-mix(in oklab, ${tok.color} 6%, var(--surface))`;

  return (
    <button
      onClick={onClick}
      className={`absolute text-left overflow-hidden group ${b.status === "pencil" ? "hatch-pencil" : ""} ${conflict ? "pulse-conflict" : ""} ${selected ? "ring-2 ring-accent z-10" : ""} ${b.source === "google" ? "border border-dashed" : ""}`}
      style={{ ...base, background: fill, borderColor: b.source === "google" ? "var(--google)" : undefined, borderStyle: b.status === "quotation" ? "dotted" : undefined, borderWidth: b.status === "quotation" ? 1 : undefined }}
      title={b.functionName}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-between">
        <div className="flex items-start justify-between gap-1">
          <span className="text-[11px] font-medium truncate">{b.functionName}</span>
          {b.status === "pencil" && b.pencilExpiresAt && (
            <span className="mono text-[9px] shrink-0" style={{ color: tok.color }}>{relativeDur(b.pencilExpiresAt.getTime())}</span>
          )}
        </div>
        <div className="flex items-center justify-between mono text-[10px] text-muted">
          <span>{formatTime(b.start)}–{formatTime(b.end)} · {b.expectedGuests}p</span>
          <span>{formatINRShort(total.grand)}</span>
        </div>
      </div>
    </button>
  );
}
