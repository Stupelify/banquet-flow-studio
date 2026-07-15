export type MiniPickerMode = 'days' | 'months' | 'years';

export const MONTH_SHORT_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** 12-year window starting so `focusYear` sits near the middle (index 6). */
export function buildYearWindow(focusYear: number, count = 12): number[] {
  const start = focusYear - Math.floor(count / 2);
  return Array.from({ length: count }, (_, i) => start + i);
}

/** Jump to day 1 of `year`/`monthIndex` (0–11). */
export function jumpToMonth(_from: Date, year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}
