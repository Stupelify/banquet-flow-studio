import { useEffect, useState } from 'react';
import { clamp } from '../_lib/calendar-helpers';
import { locationFor, locationStyle, NCAL_NEUTRAL, statusClass } from '../_lib/event-styles';
import type { HallBoardRow, HallBoardSlot } from '../_lib/types';
import { groupRows } from './WeekBoard';

export const DAY_START_MIN = 540; // 09:00
export const DAY_END_MIN = 1320; // 22:00
const TOTAL_MIN = DAY_END_MIN - DAY_START_MIN;
const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i);

function leftPct(minutes: number): number {
  return clamp(((minutes - DAY_START_MIN) / TOTAL_MIN) * 100, 0, 100);
}
function widthPct(start: number, end: number): number {
  return Math.max(2.5, leftPct(end) - leftPct(start));
}

export default function DayTimelineBoard({
  dateKey,
  isToday,
  rows,
  banquetIndex,
  conflictHallNames,
  onSlotClick,
}: {
  dateKey: string;
  isToday: boolean;
  rows: HallBoardRow[];
  banquetIndex: Map<string, number>;
  conflictHallNames: Set<string>;
  onSlotClick: (slot: HallBoardSlot, row: HallBoardRow) => void;
}) {
  const [nowPos, setNowPos] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowPos(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const minutes = now.getHours() * 60 + now.getMinutes();
      setNowPos(minutes >= DAY_START_MIN && minutes <= DAY_END_MIN ? leftPct(minutes) : null);
    };
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [isToday]);

  const groups = groupRows(rows);
  return (
    <div className="ncal-day-board">
      <div className="ncal-day-col-headers">
        <div className="ncal-d-corner">Hall</div>
        <div className="ncal-day-hour-grid">
          {HOURS.map((h) => (
            <span key={h}>{String(h).padStart(2, '0')}:00</span>
          ))}
        </div>
      </div>
      {groups.map((group) => {
        const loc = group.google ? NCAL_NEUTRAL : locationFor(group.label, banquetIndex);
        return (
          <div key={group.label}>
            <div className="ncal-day-venue-header">
              <div className="ncal-dv-label">
                <i style={{ background: loc.solid }} />
                {group.label}
              </div>
              <div />
            </div>
            {group.rows.map((row) => {
              const slots = row.slots.filter((slot) => slot.date === dateKey);
              const conflict = conflictHallNames.has(row.hallName);
              return (
                <div
                  key={row.hallId || row.hallName}
                  className={`ncal-day-hall-row${conflict ? ' conflict' : ''}`}
                >
                  <div className="ncal-dh-label">
                    <i style={{ background: loc.solid }} />
                    {row.hallName}
                    <span className="ncal-dh-count">{slots.length}</span>
                  </div>
                  <div className="ncal-day-track">
                    {nowPos !== null && <div className="ncal-now-line" style={{ left: `${nowPos}%` }} />}
                    {slots.map((slot, index) => (
                      <div
                        key={`${slot.bookingId || slot.functionName}:${index}`}
                        className="ncal-day-event"
                        style={{
                          left: `${leftPct(slot.startMinutes)}%`,
                          width: `${widthPct(slot.startMinutes, slot.endMinutes)}%`,
                        }}
                      >
                        <button
                          type="button"
                          className={`ncal-chip ${statusClass(slot.status)}`}
                          style={locationStyle(loc)}
                          onClick={() => onSlotClick(slot, row)}
                        >
                          <strong>{slot.functionName}</strong>
                          <span>{slot.timeLabel}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
