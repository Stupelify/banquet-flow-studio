import { buildCalendarDays, formatDateKey } from '../_lib/calendar-helpers';
import { STATUS_LABEL } from '../copy';
import {
  NCAL_LOCATIONS,
  locationFor,
  locationStyle,
  statusClass,
} from '../_lib/event-styles';
import { formatMonthAriaDate, type MonthLine } from './MonthBoard';

const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export default function MobileMonthAgenda({
  viewDate,
  selectedDate,
  todayKey,
  daysWithEvents,
  agenda,
  banquetIndex,
  onPickDay,
  onEventClick,
}: {
  viewDate: Date;
  selectedDate: string;
  todayKey: string;
  daysWithEvents: Map<string, Set<number>>;
  agenda: MonthLine[];
  banquetIndex: Map<string, number>;
  onPickDay: (dateKey: string) => void;
  onEventClick: (line: MonthLine) => void;
}) {
  const days = buildCalendarDays(viewDate);
  const month = viewDate.getMonth();
  const selected = new Date(`${selectedDate}T12:00:00`);
  const confirmed = agenda.filter((l) => statusClass(l.status) === 'confirmed');
  const pending = agenda.filter((l) => !['confirmed', 'cancelled'].includes(statusClass(l.status)));

  const renderCards = (list: MonthLine[]) =>
    list.map((line) => {
      const loc = locationFor(line.banquetName, banquetIndex);
      return (
        <button
          key={`${line.kind}:${line.id}`}
          type="button"
          className="ncal-ecard"
          onClick={() => onEventClick(line)}
        >
          <div className="rail" style={{ background: loc.solid }} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="time">
                <b>{line.timeLabel}</b>
              </span>
              <span className="title" style={{ flex: 1 }}>
                {line.title}
              </span>
              <span
                className={`status-tag ncal-chip ${statusClass(line.status)}`}
                style={locationStyle(loc)}
              >
                {STATUS_LABEL[statusClass(line.status)] ?? line.status}
              </span>
            </div>
            {line.banquetName && (
              <div className="meta">
                <span
                  className="loc-tag"
                  style={{ borderColor: loc.solid, color: loc.text }}
                >
                  {line.banquetName}
                </span>
              </div>
            )}
          </div>
        </button>
      );
    });

  return (
    <div className="ncal-mobile-only">
      <div className="ncal-mgrid">
        {DOW.map((d) => (
          <span key={d} className="ncal-mgrid-dow">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = formatDateKey(day);
          const dots = Array.from(daysWithEvents.get(key) ?? []).slice(0, 6);
          return (
            <button
              key={key}
              type="button"
              className={`ncal-mgrid-day${day.getMonth() !== month ? ' dim' : ''}${key === todayKey ? ' today' : ''}${key === selectedDate ? ' active' : ''}`}
              aria-label={`Open ${formatMonthAriaDate(day)}`}
              onClick={() => onPickDay(key)}
            >
              <b>{day.getDate()}</b>
              <span className="ncal-mgrid-dots">
                {dots.map((i) => (
                  <i key={i} style={{ background: NCAL_LOCATIONS[i].solid }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <div className="ncal-dayfocus">
        <div className="num">{selected.getDate()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong>
            {selected.toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'long',
              year: 'numeric',
            })}
          </strong>
          <span>
            {agenda.length} event{agenda.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
      {agenda.length === 0 && <div className="ncal-empty">No events on this day</div>}
      {confirmed.length > 0 && (
        <>
          <div className="ncal-agenda-sec">
            <strong>Confirmed</strong>
            <span>{confirmed.length}</span>
          </div>
          {renderCards(confirmed)}
        </>
      )}
      {pending.length > 0 && (
        <>
          <div className="ncal-agenda-sec">
            <strong>Pending</strong>
            <span>{pending.length}</span>
          </div>
          {renderCards(pending)}
        </>
      )}
    </div>
  );
}
