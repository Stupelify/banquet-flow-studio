import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { buildCalendarDays, formatDateKey } from '../_lib/calendar-helpers';
import {
  fitMonthLines,
  locationFor,
  locationStyle,
  monthLineVariant,
  statusClass,
} from '../_lib/event-styles';

export type MonthLine = {
  id: string;
  kind: 'booking' | 'enquiry' | 'google';
  title: string;
  timeLabel: string;
  status: string;
  banquetName?: string;
  sortMinutes: number;
};

const DOWS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const formatMonthAriaDate = (date: Date) =>
  date.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export default function MonthBoard({
  viewDate,
  todayKey,
  linesByDate,
  banquetIndex,
  onDrillDay,
  onLineClick,
  fitViewport = false,
}: {
  viewDate: Date;
  todayKey: string;
  linesByDate: Map<string, MonthLine[]>;
  banquetIndex: Map<string, number>;
  onDrillDay: (dateKey: string) => void;
  onLineClick: (line: MonthLine) => void;
  /** Desktop month-fit: board height from viewport; row heights stay fixed when sidebar width toggles. */
  fitViewport?: boolean;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [lineArea, setLineArea] = useState(94);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid || !fitViewport) return;

    const board = grid.closest<HTMLElement>('.ncal-board');
    const root = board?.closest<HTMLElement>('.ncal-root');
    if (!board || !root) return;

    const syncBoardOffset = () => {
      const top = board.getBoundingClientRect().top;
      root.style.setProperty('--ncal-board-offset', `${Math.round(top)}px`);
    };

    syncBoardOffset();
    window.addEventListener('resize', syncBoardOffset);
    return () => {
      window.removeEventListener('resize', syncBoardOffset);
      root.style.removeProperty('--ncal-board-offset');
    };
  }, [viewDate, fitViewport]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const measure = () => {
      const cell = grid.querySelector<HTMLElement>('.ncal-month-day');
      if (cell) setLineArea(Math.max(0, cell.getBoundingClientRect().height - 24 - 6));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [viewDate, fitViewport]);

  const days = buildCalendarDays(viewDate);
  const month = viewDate.getMonth();

  return (
    <div className="ncal-month-board">
      <div className="ncal-month-col-headers">
        {DOWS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="ncal-month-grid" ref={gridRef}>
        {days.map((day) => {
          const key = formatDateKey(day);
          const lines = linesByDate.get(key) ?? [];
          const { visible, hidden } = fitMonthLines(lines.length, lineArea);
          return (
            <div
              key={key}
              className={`ncal-month-day${day.getMonth() !== month ? ' dim' : ''}${key === todayKey ? ' today' : ''}${day.getDay() === 0 || day.getDay() === 6 ? ' weekend' : ''}`}
            >
              <div className="ncal-month-dhead">
                <button
                  type="button"
                  className="ncal-month-d-num"
                  aria-label={`Open ${formatMonthAriaDate(day)}`}
                  onClick={() => onDrillDay(key)}
                >
                  {day.getDate() === 1
                    ? `${day.getDate()} ${day.toLocaleDateString('en-IN', { month: 'short' })}`
                    : day.getDate()}
                </button>
              </div>
              <div className="ncal-month-lines">
                {lines.slice(0, visible).map((line) => {
                  const variant = monthLineVariant(line.status);
                  const cancelled = statusClass(line.status) === 'cancelled';
                  return (
                    <button
                      key={`${line.kind}:${line.id}`}
                      type="button"
                      className={`ncal-mline ${variant}${cancelled ? ' cancelled' : ''}`}
                      style={locationStyle(locationFor(line.banquetName, banquetIndex))}
                      title={line.title}
                      aria-label={`${formatMonthAriaDate(day)}: ${line.title}, ${line.status}`}
                      onClick={() => onLineClick(line)}
                    >
                      {variant === 'hollow' && <span className="ncal-mline-dot" aria-hidden="true" />}
                      <span className="ncal-mline-time">{line.timeLabel}</span>
                      <span className="ncal-mline-title">{line.title}</span>
                    </button>
                  );
                })}
                {hidden > 0 && (
                  <button
                    type="button"
                    className="ncal-more-line"
                    aria-label={`${hidden} more events on ${formatMonthAriaDate(day)}`}
                    onClick={() => onDrillDay(key)}
                  >
                    +{hidden} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
