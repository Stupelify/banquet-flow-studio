/**
 * Money and date display formatting for the client. All later features should
 * route amounts through formatINR and dates through formatAppDate so the app
 * has one consistent presentation (Indian grouping, Asia/Kolkata TZ).
 */

const KOLKATA_TZ = 'Asia/Kolkata';

/**
 * Format a rupee amount for display. Full form uses Indian (lakh/crore)
 * grouping via Intl; paise show as 2 decimals when non-zero, none when whole.
 * Compact form abbreviates to L/Cr (max 2 decimals, trailing zeros dropped).
 */
export function formatINR(value: number | null | undefined, opts?: { compact?: boolean }): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  if (opts?.compact) {
    const abs = Math.abs(value);
    if (abs >= 1_00_00_000) return formatCompactUnit(value, 1_00_00_000, 'Cr');
    if (abs >= 1_00_000) return formatCompactUnit(value, 1_00_000, 'L');
  }

  const hasPaise = Math.round(value * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: hasPaise ? 2 : 0,
  }).format(value);
}

/** Scale by unit, round to max 2 decimals, drop trailing zeros (e.g. 4.0 -> 4). */
function formatCompactUnit(value: number, unit: number, suffix: string): string {
  const sign = value < 0 ? '-' : '';
  const scaled = Math.round((Math.abs(value) / unit) * 100) / 100;
  return `${sign}₹${scaled}${suffix}`;
}

function parseAppDateInput(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input !== 'string' || !input.trim()) return null;
  const parsed = new Date(input.trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date for display, always pinned to Asia/Kolkata (see date.ts for
 * the same TZ-pinning approach used elsewhere). Default "7 Jul 2026"; can
 * drop the year or append a 12h time.
 */
export function formatAppDate(
  date: string | Date | null | undefined,
  opts?: { withYear?: boolean; withTime?: boolean }
): string {
  if (!date) return '—';
  const parsed = parseAppDateInput(date);
  if (!parsed) return '—';

  const withYear = opts?.withYear ?? true;
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: KOLKATA_TZ,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' as const } : {}),
  }).format(parsed);

  if (!opts?.withTime) return dateStr;

  const timeStr = new Intl.DateTimeFormat('en-US', {
    timeZone: KOLKATA_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(parsed);

  return `${dateStr}, ${timeStr}`;
}
