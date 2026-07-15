import { describe, expect, it } from 'vitest';
import { UI } from 'react-day-picker';
import {
  buildMiniCalendarClassNames,
  buildMiniCalendarModifiers,
  formatMiniWeekday,
  MINI_WEEKDAY_LABELS,
} from '../mini-calendar-day-picker';

describe('mini-calendar-day-picker', () => {
  it('formats single-letter weekday labels starting Sunday', () => {
    expect(MINI_WEEKDAY_LABELS).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
    expect(formatMiniWeekday(new Date(2026, 6, 12))).toBe('S'); // Sunday
    expect(formatMiniWeekday(new Date(2026, 6, 13))).toBe('M');
  });

  it('maps react-day-picker classes onto ncal-sc mini calendar hooks', () => {
    const classNames = buildMiniCalendarClassNames();
    expect(classNames[UI.Root]).toBe('rdp-ncal ncal-sc-days');
    expect(classNames[UI.Months]).toBe('ncal-sc-months-wrap');
    expect(classNames[UI.MonthGrid]).toBe('ncal-sc-grid');
    expect(classNames[UI.Weekday]).toBe('ncal-sc-dw');
    expect(classNames[UI.DayButton]).toBe('ncal-sc-day');
    expect(classNames[UI.Nav]).toBe('ncal-sc-rdp-hidden');
  });

  it('builds busy and week-view modifiers', () => {
    const busy = new Set(['2026-07-10']);
    const weekKeys = [
      '2026-07-12',
      '2026-07-13',
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
      '2026-07-17',
      '2026-07-18',
    ];
    const { modifiers, modifiersClassNames } = buildMiniCalendarModifiers(
      busy,
      weekKeys,
      'week'
    );

    expect(modifiersClassNames.busy).toBe('busy');
    expect(modifiersClassNames.inWeek).toBe('in-week');
    expect(modifiers.busy(new Date(2026, 6, 10))).toBe(true);
    expect(modifiers.inWeek(new Date(2026, 6, 15))).toBe(true);
    expect(modifiers.weekStart(new Date(2026, 6, 12))).toBe(true);
    expect(modifiers.weekEnd(new Date(2026, 6, 18))).toBe(true);
    expect(modifiers.inWeek(new Date(2026, 6, 1))).toBe(false);
  });

  it('skips week modifiers outside week view', () => {
    const { modifiers } = buildMiniCalendarModifiers(new Set(), ['2026-07-12'], 'month');
    expect(modifiers.inWeek(new Date(2026, 6, 12))).toBe(false);
  });
});
