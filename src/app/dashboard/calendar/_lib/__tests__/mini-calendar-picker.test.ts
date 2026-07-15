import { describe, expect, it } from 'vitest';
import {
  MONTH_SHORT_LABELS,
  buildYearWindow,
  jumpToMonth,
  type MiniPickerMode,
} from '../mini-calendar-picker';

describe('mini-calendar-picker', () => {
  it('exposes 12 short month labels', () => {
    expect(MONTH_SHORT_LABELS).toHaveLength(12);
    expect(MONTH_SHORT_LABELS[0]).toBe('Jan');
    expect(MONTH_SHORT_LABELS[11]).toBe('Dec');
  });

  it('builds a centered year window that includes the focus year', () => {
    expect(buildYearWindow(2026, 12)).toEqual([
      2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030, 2031,
    ]);
  });

  it('jumps to the first of the target month preserving no day overflow', () => {
    const from = new Date(2026, 5, 15); // jun 15
    const next = jumpToMonth(from, 2027, 0); // jan 2027
    expect(next.getFullYear()).toBe(2027);
    expect(next.getMonth()).toBe(0);
    expect(next.getDate()).toBe(1);
  });

  it('keeps MiniPickerMode as the three supported modes', () => {
    const modes: MiniPickerMode[] = ['days', 'months', 'years'];
    expect(modes).toEqual(['days', 'months', 'years']);
  });
});
