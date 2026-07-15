import type { CSSProperties } from 'react';
import type { HallCalendarOption } from './types';

export type NcalLocation = { solid: string; soft: string; text: string };

/** Distinct venue colors before palette reuse (see --ncal-loc-* in calendar-notion.css). */
export const NCAL_LOCATION_COUNT = 16;

const LOC = (n: number): NcalLocation => ({
  solid: `var(--ncal-loc-${n}-solid)`,
  soft: `var(--ncal-loc-${n}-soft)`,
  text: `var(--ncal-loc-${n}-text)`,
});

export const NCAL_LOCATIONS: NcalLocation[] = Array.from(
  { length: NCAL_LOCATION_COUNT },
  (_, index) => LOC(index)
);

export const NCAL_NEUTRAL: NcalLocation = {
  solid: 'var(--ncal-loc-n-solid)',
  soft: 'var(--ncal-loc-n-soft)',
  text: 'var(--ncal-loc-n-text)',
};

export const UNASSIGNED = 'Unassigned';

/** Distinct banquet names sorted alphabetically, Unassigned last; value = order % palette size. */
export function buildBanquetIndex(halls: HallCalendarOption[]): Map<string, number> {
  const names = new Set<string>();
  let hasUnassigned = false;
  halls.forEach((hall) => {
    const name = (hall.banquetName || '').trim();
    if (name) names.add(name);
    else hasUnassigned = true;
  });
  const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
  if (hasUnassigned) sorted.push(UNASSIGNED);
  const map = new Map<string, number>();
  sorted.forEach((name, order) => map.set(name, order % NCAL_LOCATIONS.length));
  return map;
}

export function locationFor(
  banquetName: string | null | undefined,
  index: Map<string, number>
): NcalLocation {
  const name = (banquetName || '').trim() || UNASSIGNED;
  const order = index.get(name);
  return order === undefined ? NCAL_NEUTRAL : NCAL_LOCATIONS[order];
}

/** CSS vars consumed by .ncal-chip / .ncal-mline / badges. */
export function locationStyle(loc: NcalLocation): CSSProperties {
  return { '--lc': loc.solid, '--lc-bg': loc.soft, '--lc-text': loc.text } as CSSProperties;
}

const SHAPES = new Set(['confirmed', 'pencil', 'quotation', 'enquiry', 'pending', 'cancelled']);

export function statusClass(status: string): string {
  const key = (status || '').toLowerCase();
  return SHAPES.has(key) ? key : 'pending';
}

export const MONTH_LINE_PX = 16.5; // .ncal-mline height incl gap (rev2 mockup LINE_H)
export const MONTH_MORE_PX = 16.5;

/** '07:00' -> '7a', '13:30' -> '1:30p' (rev2 compact month-line time) */
export function compactClock(value?: string | null): string {
  if (!value) return '';
  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const h12 = hour % 12 || 12;
  return `${h12}${minute ? ':' + String(minute).padStart(2, '0') : ''}${hour >= 12 ? 'p' : 'a'}`;
}

/** Month lines: confirmed renders as solid filled bar, everything else hollow-dot line. */
export function monthLineVariant(status: string): 'solid' | 'hollow' {
  return statusClass(status) === 'confirmed' ? 'solid' : 'hollow';
}

export function fitMonthLines(
  total: number,
  availPx: number
): { visible: number; hidden: number } {
  if (total <= 0) return { visible: 0, hidden: 0 };
  const fitsAll = total * MONTH_LINE_PX <= availPx;
  if (fitsAll) return { visible: total, hidden: 0 };
  const visible = Math.max(0, Math.floor((availPx - MONTH_MORE_PX) / MONTH_LINE_PX));
  return { visible: Math.min(visible, total), hidden: total - Math.min(visible, total) };
}
