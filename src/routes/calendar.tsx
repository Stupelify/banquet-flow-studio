import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ChevronLeft, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { BOOKINGS, HALLS, VENUES, customerById, bookingTotal } from "@/lib/mock/data";
import type { Booking } from "@/lib/mock/types";
import { dayKey, formatDate, formatINRShort } from "@/lib/format";
import { HallBoard } from "@/components/calendar/HallBoard";
import { BookingDrawer } from "@/components/calendar/BookingDrawer";
import { statusToken } from "@/lib/calendar-utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

const searchSchema = z.object({
  view: z.enum(["board", "month", "week", "day"]).optional().default("board"),
  date: z.string().optional(),
});

export const Route = createFileRoute("/calendar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Calendar — Bika Ops" },
      { name: "description", content: "Hall-board timeline, month, week, and day views with conflict detection." },
    ],
  }),
  component: CalendarPage,
});

const STATUSES: Booking["status"][] = ["confirmed", "pencil", "quotation", "enquiry"];

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const view = search.view;
  const isMobile = useIsMobile();

  const date = useMemo(() => {
    if (search.date) return new Date(search.date);
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, [search.date]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<Set<Booking["status"]>>(new Set(STATUSES));
  const [filterSource, setFilterSource] = useState<Set<Booking["source"]>>(new Set(["in-app", "google"]));
  const [filterHallIds, setFilterHallIds] = useState<Set<string>>(new Set(HALLS.map((h) => h.id)));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const occupancyByHall = useMemo(() => {
    const k = dayKey(date);
    const m = new Map<string, number>();
    for (const h of HALLS) m.set(h.id, 0);
    for (const b of BOOKINGS) {
      if (dayKey(b.start) !== k) continue;
      for (const hid of b.hallIds) {
        const hours = (b.end.getTime() - b.start.getTime()) / 3_600_000;
        m.set(hid, (m.get(hid) ?? 0) + hours);
      }
    }
    return m;
  }, [date]);

  const shiftDate = (units: number) => {
    const d = new Date(date);
    if (view === "month") d.setMonth(d.getMonth() + units);
    else if (view === "week") d.setDate(d.getDate() + units * 7);
    else d.setDate(d.getDate() + units);
    navigate({ search: { view, date: dayKey(d) } });
  };

  const setView = (v: "board" | "month" | "week" | "day") => {
    navigate({ search: { view: v, date: search.date } });
  };

  const toggle = <T,>(set: Set<T>, v: T): Set<T> => {
    const n = new Set(set);
    n.has(v) ? n.delete(v) : n.add(v);
    return n;
  };

  const headerLabel = useMemo(() => {
    if (view === "month") return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    if (view === "week") {
      const s = new Date(date); s.setDate(s.getDate() - ((s.getDay() + 6) % 7));
      const e = new Date(s); e.setDate(e.getDate() + 6);
      return `${s.getDate()}–${e.getDate()} ${e.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`;
    }
    return formatDate(date);
  }, [date, view]);

  const filtersPanel = (
    <FiltersPanel
      date={date}
      filterStatus={filterStatus}
      filterSource={filterSource}
      filterHallIds={filterHallIds}
      occupancyByHall={occupancyByHall}
      onToggleStatus={(s) => setFilterStatus(toggle(filterStatus, s))}
      onToggleSource={(s) => setFilterSource(toggle(filterSource, s))}
      onToggleHall={(id) => setFilterHallIds(toggle(filterHallIds, id))}
    />
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left rail — desktop */}
      <aside className="hidden lg:flex w-60 shrink-0 border-r border-border bg-surface flex-col overflow-y-auto scrollbar-thin">
        {filtersPanel}
      </aside>

      {/* Mobile filters sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-surface border-border overflow-y-auto scrollbar-thin">
          {filtersPanel}
        </SheetContent>
      </Sheet>

      {/* Main column */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-1 px-2 sm:px-3 h-11 border-b border-border bg-surface shrink-0">
          <button
            onClick={() => setFiltersOpen(true)}
            className="lg:hidden size-8 grid place-items-center text-muted hover:text-fg"
            aria-label="Filters"
          >
            <SlidersHorizontal className="size-4" />
          </button>
          <button onClick={() => shiftDate(-1)} className="size-8 grid place-items-center text-muted hover:text-fg" aria-label="Previous">
            <ChevronLeft className="size-4" />
          </button>
          <button onClick={() => shiftDate(1)} className="size-8 grid place-items-center text-muted hover:text-fg" aria-label="Next">
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => navigate({ search: { view, date: dayKey(new Date()) } })}
            className="px-2 h-7 text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2 mono"
          >Today</button>
          <h2 className="ml-2 mono text-[12px] sm:text-[13px] font-semibold truncate min-w-0 flex-1">{headerLabel}</h2>
          <div className="hidden sm:flex items-center gap-px">
            {(["board", "day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2.5 h-7 text-[10px] uppercase tracking-widest mono border ${view === v ? "bg-accent text-accent-fg border-accent" : "border-border text-muted hover:text-fg"}`}
              >{v}</button>
            ))}
          </div>
          <select
            value={view}
            onChange={(e) => setView(e.target.value as "board" | "day" | "week" | "month")}
            className="sm:hidden h-7 px-1.5 text-[11px] uppercase tracking-wider mono border border-border bg-surface"
          >
            <option value="board">Board</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex">
          <section className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {(view === "board" || view === "day") && (
              <HallBoard
                date={date}
                selectedId={selectedId}
                onSelect={(id, conflicts) => { setSelectedId(id); setSelectedConflicts(conflicts); }}
                filterStatus={filterStatus}
                filterSource={filterSource}
                filterHallIds={filterHallIds}
              />
            )}
            {view === "month" && (
              <MonthView
                date={date}
                onPick={(d) => navigate({ search: { view: "day", date: dayKey(d) } })}
                onSelect={(id) => { setSelectedId(id); setSelectedConflicts([]); }}
              />
            )}
            {view === "week" && (
              <WeekView date={date} onSelect={(id) => { setSelectedId(id); setSelectedConflicts([]); }} />
            )}
          </section>

          {/* Desktop drawer */}
          {!isMobile && selectedId && (
            <BookingDrawer
              bookingId={selectedId}
              onClose={() => setSelectedId(null)}
              conflictIds={selectedConflicts}
            />
          )}

        </div>
      </main>

      {/* Mobile drawer — bottom sheet */}
      {isMobile && (
        <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
          <SheetContent side="bottom" className="p-0 h-[88vh] bg-surface border-border">
            <BookingDrawer
              bookingId={selectedId}
              onClose={() => setSelectedId(null)}
              conflictIds={selectedConflicts}
              embedded
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function DrawerHeaderClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="absolute right-2 top-2 z-10 size-7 grid place-items-center text-muted hover:text-fg bg-surface/80"
      aria-label="Close"
    >
      <X className="size-4" />
    </button>
  );
}

function FiltersPanel({
  date,
  filterStatus,
  filterSource,
  filterHallIds,
  occupancyByHall,
  onToggleStatus,
  onToggleSource,
  onToggleHall,
}: {
  date: Date;
  filterStatus: Set<Booking["status"]>;
  filterSource: Set<Booking["source"]>;
  filterHallIds: Set<string>;
  occupancyByHall: Map<string, number>;
  onToggleStatus: (s: Booking["status"]) => void;
  onToggleSource: (s: Booking["source"]) => void;
  onToggleHall: (id: string) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="p-3 border-b border-border">
        <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1">Selected</div>
        <div className="text-[10px] uppercase tracking-widest text-muted mono">{date.toLocaleDateString("en-GB", { weekday: "long" })}</div>
        <div className="text-[14px] font-semibold mono">{formatDate(date)}</div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Status</div>
        <div className="space-y-1">
          {STATUSES.map((s) => {
            const tok = statusToken(s);
            const on = filterStatus.has(s);
            return (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={on} onChange={() => onToggleStatus(s)} className="sr-only" />
                <span className={`size-3 border ${on ? "" : "opacity-30"}`} style={{ background: tok.color, borderColor: tok.color }} />
                <span className={`text-[11px] uppercase tracking-wider ${on ? "text-fg" : "text-faint"}`}>{tok.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-3 border-b border-border">
        <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Source</div>
        {(["in-app", "google"] as const).map((s) => {
          const on = filterSource.has(s);
          return (
            <label key={s} className="flex items-center gap-2 cursor-pointer py-0.5">
              <input type="checkbox" checked={on} onChange={() => onToggleSource(s)} className="sr-only" />
              <span className={`size-3 ${on ? "" : "opacity-30"}`} style={s === "google" ? { border: "1px dashed var(--google)" } : { background: "var(--accent)" }} />
              <span className={`text-[11px] uppercase tracking-wider ${on ? "text-fg" : "text-faint"}`}>{s}</span>
            </label>
          );
        })}
      </div>

      <div className="p-3 flex-1">
        <div className="text-[9px] uppercase tracking-widest text-faint mono mb-2">Halls · occupancy today</div>
        {VENUES.map((v) => {
          const halls = HALLS.filter((h) => h.venueId === v.id);
          return (
            <div key={v.id} className="mb-3">
              <div className="text-[10px] uppercase tracking-wider text-muted mono mb-1">{v.name.split("—")[0]}</div>
              {halls.map((h) => {
                const used = occupancyByHall.get(h.id) ?? 0;
                const pct = Math.min(100, (used / 14) * 100);
                const on = filterHallIds.has(h.id);
                return (
                  <button
                    key={h.id}
                    onClick={() => onToggleHall(h.id)}
                    className={`w-full text-left py-1 ${on ? "" : "opacity-40"}`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="truncate">{h.name}</span>
                      <span className="mono text-muted text-[10px]">{used.toFixed(0)}h</span>
                    </div>
                    <div className="h-0.5 bg-surface-2 mt-0.5">
                      <div className="h-full" style={{ width: `${pct}%`, background: pct > 75 ? "var(--conflict)" : pct > 40 ? "var(--accent)" : "var(--confirmed)" }} />
                    </div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthView({ date, onPick, onSelect }: { date: Date; onPick: (d: Date) => void; onSelect: (id: string) => void }) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const startDow = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  const cursor = new Date(first);
  cursor.setDate(cursor.getDate() - startDow);
  for (let i = 0; i < 42; i++) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  const byDay = new Map<string, Booking[]>();
  for (const b of BOOKINGS) {
    const k = dayKey(b.start);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(b);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border shrink-0">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="px-2 py-1 text-[10px] uppercase tracking-widest text-muted mono border-r border-border last:border-r-0">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 grid-rows-6 flex-1 overflow-y-auto scrollbar-thin">
        {days.map((d, i) => {
          const k = dayKey(d);
          const bs = byDay.get(k) ?? [];
          const inMonth = d.getMonth() === date.getMonth();
          const isToday = k === dayKey(new Date());
          const rev = bs.filter((b) => b.status === "confirmed").reduce((s, b) => s + bookingTotal(b).grand, 0);
          return (
            <div
              key={i}
              className={`border-r border-b border-border p-1 overflow-hidden cursor-pointer hover:bg-surface-2 min-h-16 ${!inMonth ? "opacity-40" : ""}`}
              onClick={() => onPick(d)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`mono text-[11px] ${isToday ? "bg-accent text-accent-fg px-1" : ""}`}>{d.getDate()}</span>
                {rev > 0 && <span className="hidden sm:inline mono text-[9px] text-muted">{formatINRShort(rev)}</span>}
              </div>
              <div className="space-y-0.5">
                {bs.slice(0, 3).map((b) => {
                  const tok = statusToken(b.status);
                  return (
                    <button
                      key={b.id}
                      onClick={(e) => { e.stopPropagation(); onSelect(b.id); }}
                      className={`w-full text-left text-[10px] truncate px-1 ${b.status === "pencil" ? "hatch-pencil" : ""}`}
                      style={{ borderLeft: `2px solid ${tok.color}`, background: `color-mix(in oklab, ${tok.color} 10%, transparent)` }}
                    >
                      <span className="hidden sm:inline">{b.functionName}</span>
                      <span className="sm:hidden">●</span>
                    </button>
                  );
                })}
                {bs.length > 3 && <div className="text-[9px] text-muted mono">+{bs.length - 3}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ date, onSelect }: { date: Date; onSelect: (id: string) => void }) {
  const start = new Date(date);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  const byDay = new Map<string, Booking[]>();
  for (const b of BOOKINGS) {
    const k = dayKey(b.start);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(b);
  }
  return (
    <div className="flex-1 overflow-auto scrollbar-thin">
      <div className="grid grid-cols-7 min-w-[760px] h-full">
        {days.map((d) => {
          const bs = (byDay.get(dayKey(d)) ?? []).sort((a, b) => +a.start - +b.start);
          const isToday = dayKey(d) === dayKey(new Date());
          return (
            <div key={d.toString()} className="border-r border-border last:border-r-0 flex flex-col">
              <div className={`px-2 py-1.5 border-b border-border sticky top-0 bg-surface ${isToday ? "bg-accent/10" : ""}`}>
                <div className="text-[10px] uppercase tracking-widest text-muted mono">{d.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                <div className="mono text-[13px] font-semibold">{d.getDate()}</div>
              </div>
              <div className="p-1 space-y-1 flex-1">
                {bs.map((b) => {
                  const tok = statusToken(b.status);
                  const c = customerById(b.customerId);
                  return (
                    <button
                      key={b.id}
                      onClick={() => onSelect(b.id)}
                      className={`block w-full text-left px-1.5 py-1 ${b.status === "pencil" ? "hatch-pencil" : ""}`}
                      style={{ borderLeft: `2px solid ${tok.color}`, background: `color-mix(in oklab, ${tok.color} 10%, transparent)` }}
                    >
                      <div className="text-[11px] font-medium truncate">{b.functionName}</div>
                      <div className="text-[9px] text-muted mono">{String(b.start.getHours()).padStart(2, "0")}:{String(b.start.getMinutes()).padStart(2, "0")} · {c.name.split(" ")[0]}</div>
                    </button>
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
