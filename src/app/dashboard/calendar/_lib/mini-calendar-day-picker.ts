import {
  DayFlag,
  getDefaultClassNames,
  SelectionState,
  UI,
  type ClassNames,
  type ModifiersClassNames,
} from 'react-day-picker';
import { formatDateKey } from './calendar-helpers';

type MiniDayMatcher = (date: Date) => boolean;

export const MINI_WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

export function formatMiniWeekday(date: Date): string {
  return MINI_WEEKDAY_LABELS[date.getDay()] ?? '';
}

/** Map react-day-picker structure onto existing ncal-sc-* mini calendar classes. */
export function buildMiniCalendarClassNames(): Partial<ClassNames> {
  const base = getDefaultClassNames();
  return {
    ...base,
    [UI.Root]: 'rdp-ncal ncal-sc-days',
    [UI.Months]: 'ncal-sc-months-wrap',
    [UI.Month]: 'ncal-sc-month-wrap',
    [UI.MonthCaption]: 'ncal-sc-rdp-hidden',
    [UI.Nav]: 'ncal-sc-rdp-hidden',
    [UI.MonthGrid]: 'ncal-sc-grid',
    [UI.Weekdays]: 'ncal-sc-weekdays',
    [UI.Weekday]: 'ncal-sc-dw',
    [UI.Weeks]: 'ncal-sc-weeks',
    [UI.Week]: 'ncal-sc-week',
    [UI.Day]: 'ncal-sc-day-cell',
    [UI.DayButton]: 'ncal-sc-day',
    [DayFlag.outside]: 'outside',
    [DayFlag.today]: 'today',
    [SelectionState.selected]: 'selected',
  };
}

export function buildMiniCalendarModifiers(
  busyDays: Set<string>,
  weekKeys: string[],
  viewMode: 'month' | 'week' | 'day'
): {
  modifiers: Record<string, MiniDayMatcher>;
  modifiersClassNames: ModifiersClassNames;
} {
  const weekSet = new Set(weekKeys);
  const inWeekView = viewMode === 'week' && weekKeys.length > 0;

  return {
    modifiers: {
      busy: (date) => busyDays.has(formatDateKey(date)),
      inWeek: inWeekView ? (date) => weekSet.has(formatDateKey(date)) : () => false,
      weekStart: inWeekView && weekKeys[0]
        ? (date) => formatDateKey(date) === weekKeys[0]
        : () => false,
      weekEnd: inWeekView && weekKeys[6]
        ? (date) => formatDateKey(date) === weekKeys[6]
        : () => false,
    },
    modifiersClassNames: {
      busy: 'busy',
      inWeek: 'in-week',
      weekStart: 'start',
      weekEnd: 'end',
    },
  };
}
