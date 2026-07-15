import { formatDateKey } from '../_lib/calendar-helpers';
import {
  locationFor,
  locationStyle,
  NCAL_NEUTRAL,
  statusClass,
  UNASSIGNED,
} from '../_lib/event-styles';
import type { HallBoardRow, HallBoardSlot } from '../_lib/types';

export function groupRows(
  rows: HallBoardRow[]
): Array<{ label: string; google: boolean; rows: HallBoardRow[] }> {
  const groups = new Map<string, { label: string; google: boolean; rows: HallBoardRow[] }>();
  rows.forEach((row) => {
    const google = row.rowType === 'googleVenue';
    const label = google ? 'Google Calendar' : (row.banquetName || '').trim() || UNASSIGNED;
    const bucket = groups.get(label) || { label, google, rows: [] };
    bucket.rows.push(row);
    groups.set(label, bucket);
  });
  return Array.from(groups.values()).sort((a, b) => {
    if (a.google !== b.google) return a.google ? 1 : -1;
    if (a.label === UNASSIGNED) return 1;
    if (b.label === UNASSIGNED) return -1;
    return a.label.localeCompare(b.label);
  });
}

export default function WeekBoard({
  weekDays,
  todayKey,
  rows,
  banquetIndex,
  onDrillDay,
  onSlotClick,
}: {
  weekDays: Date[];
  todayKey: string;
  rows: HallBoardRow[];
  banquetIndex: Map<string, number>;
  onDrillDay: (dateKey: string) => void;
  onSlotClick: (slot: HallBoardSlot, row: HallBoardRow) => void;
}) {
  const groups = groupRows(rows);
  return (
    <div className="ncal-week-board">
      <div className="ncal-week-col-headers">
        <div className="ncal-w-corner">Hall</div>
        {weekDays.map((day) => {
          const key = formatDateKey(day);
          return (
            <button
              key={key}
              type="button"
              className={`ncal-wch${key === todayKey ? ' today' : ''}`}
              onClick={() => onDrillDay(key)}
            >
              {day.toLocaleDateString('en-IN', { weekday: 'short' })}
              <b>{day.getDate()}</b>
            </button>
          );
        })}
      </div>
      {groups.map((group) => {
        const loc = group.google ? NCAL_NEUTRAL : locationFor(group.label, banquetIndex);
        return (
          <div key={group.label}>
            <div className="ncal-wv-group-row">
              <span>
                <i style={{ background: loc.solid }} />
                {group.label}
              </span>
            </div>
            {group.rows.map((row) => (
              <div className="ncal-week-hall-row" key={row.hallId || row.hallName}>
                <div className="ncal-w-hall-label">
                  <i style={{ background: loc.solid }} />
                  {row.hallName}
                </div>
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const slots = row.slots.filter((slot) => slot.date === key);
                  return (
                    <div className="ncal-week-cell" key={key}>
                      {slots.map((slot, index) => (
                        <button
                          key={`${slot.bookingId || slot.functionName}:${index}`}
                          type="button"
                          className={`ncal-chip ${statusClass(slot.status)}`}
                          style={locationStyle(loc)}
                          onClick={() => onSlotClick(slot, row)}
                        >
                          <strong>{slot.functionName}</strong>
                          <span>
                            {slot.timeLabel}
                            {slot.guests ? ` · ${slot.guests}g` : ''}
                          </span>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
