import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, type DayButtonProps } from 'react-day-picker';
import 'react-day-picker/style.css';
import { buildWeekDays, formatDateKey, parseDateKey } from '../_lib/calendar-helpers';
import {
  buildMiniCalendarClassNames,
  buildMiniCalendarModifiers,
  formatMiniWeekday,
} from '../_lib/mini-calendar-day-picker';
import {
  MONTH_SHORT_LABELS,
  buildYearWindow,
  jumpToMonth,
  type MiniPickerMode,
} from '../_lib/mini-calendar-picker';

function MiniDayButton({ day, modifiers, children, className, ...props }: DayButtonProps) {
  return (
    <button type="button" className={className} {...props}>
      {children}
      {modifiers.busy && <i className="ncal-sc-bdot" aria-hidden="true" />}
    </button>
  );
}

export default function MiniCalendar({
  viewDate,
  viewMode,
  selectedDate,
  todayKey,
  busyDays,
  onPickDay,
  onMonthShift,
  onJumpToMonth,
}: {
  viewDate: Date;
  viewMode: 'month' | 'week' | 'day';
  selectedDate: string;
  todayKey: string;
  busyDays: Set<string>;
  onPickDay: (dateKey: string) => void;
  onMonthShift: (delta: number) => void;
  onJumpToMonth: (next: Date) => void;
}) {
  const [mode, setMode] = useState<MiniPickerMode>('days');
  const [focusYear, setFocusYear] = useState(viewDate.getFullYear());

  useEffect(() => {
    setFocusYear(viewDate.getFullYear());
    setMode('days');
  }, [viewDate]);

  useEffect(() => {
    if (mode === 'days') return;

    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"]')) return;

      if (event.key === 'Escape') {
        if (mode === 'years') setMode('months');
        else if (mode === 'months') setMode('days');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode]);

  const month = useMemo(
    () => new Date(viewDate.getFullYear(), viewDate.getMonth(), 1),
    [viewDate]
  );
  const selected = useMemo(() => parseDateKey(selectedDate), [selectedDate]);
  const today = useMemo(() => parseDateKey(todayKey), [todayKey]);
  const weekKeys =
    viewMode === 'week' ? buildWeekDays(viewDate).map((d) => formatDateKey(d)) : [];
  const { modifiers, modifiersClassNames } = useMemo(
    () => buildMiniCalendarModifiers(busyDays, weekKeys, viewMode),
    [busyDays, weekKeys, viewMode]
  );
  const classNames = useMemo(() => buildMiniCalendarClassNames(), []);

  const title = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const navLabels =
    mode === 'days'
      ? { previous: 'Previous month', next: 'Next month' }
      : mode === 'months'
        ? { previous: 'Previous year', next: 'Next year' }
        : { previous: 'Previous years', next: 'Next years' };

  return (
    <div className="ncal-sc">
      <div className="ncal-sc-head">
        {mode === 'days' ? (
          <button
            type="button"
            className="ncal-sc-title"
            aria-label="Choose month and year"
            aria-expanded={false}
            onClick={() => setMode('months')}
          >
            {title}
          </button>
        ) : (
          <button
            type="button"
            className="ncal-sc-title"
            aria-label={mode === 'months' ? 'Choose year' : 'Back to months'}
            aria-expanded={true}
            onClick={() => {
              if (mode === 'months') setMode('years');
              else setMode('months');
            }}
          >
            {mode === 'months' ? String(focusYear) : 'Years'}
          </button>
        )}
        <span className="ncal-sc-nav">
          <button
            type="button"
            aria-label={navLabels.previous}
            onClick={() => {
              if (mode === 'days') onMonthShift(-1);
              else setFocusYear((y) => y - (mode === 'years' ? 12 : 1));
            }}
          >
            <ChevronLeft size={12} aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={navLabels.next}
            onClick={() => {
              if (mode === 'days') onMonthShift(1);
              else setFocusYear((y) => y + (mode === 'years' ? 12 : 1));
            }}
          >
            <ChevronRight size={12} aria-hidden="true" />
          </button>
        </span>
      </div>

      {mode === 'days' && (
        <DayPicker
          mode="single"
          classNames={classNames}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          month={month}
          onMonthChange={onJumpToMonth}
          selected={selected}
          onSelect={(date) => {
            if (date) onPickDay(formatDateKey(date));
          }}
          today={today}
          weekStartsOn={0}
          showOutsideDays
          fixedWeeks
          formatters={{ formatWeekdayName: formatMiniWeekday }}
          components={{
            Nav: () => <></>,
            MonthCaption: () => <></>,
            DayButton: MiniDayButton,
          }}
        />
      )}

      {mode === 'months' && (
        <div className="ncal-sc-months" role="group" aria-label="Choose month">
          {MONTH_SHORT_LABELS.map((label, monthIndex) => {
            const active =
              focusYear === viewDate.getFullYear() && monthIndex === viewDate.getMonth();
            return (
              <button
                key={label}
                type="button"
                className={`ncal-sc-month${active ? ' active' : ''}`}
                onClick={() => {
                  onJumpToMonth(jumpToMonth(viewDate, focusYear, monthIndex));
                  setMode('days');
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      {mode === 'years' && (
        <div className="ncal-sc-years" role="group" aria-label="Choose year">
          {buildYearWindow(focusYear).map((year) => (
            <button
              key={year}
              type="button"
              className={`ncal-sc-year${year === viewDate.getFullYear() ? ' active' : ''}`}
              onClick={() => {
                setFocusYear(year);
                setMode('months');
              }}
            >
              {year}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
