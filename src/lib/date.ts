function parseDateValue(input: string | Date): Date | null {
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }

  if (typeof input !== 'string' || !input.trim()) {
    return null;
  }

  const trimmed = input.trim();
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateDDMMYYYY(input: string | Date | null | undefined): string {
  if (!input) return '-';
  const parsed = parseDateValue(input);
  if (!parsed) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(parsed);
}

/** Compact day + short-month, e.g. "15 Jun" — matches the design table density. */
export function formatDateCompact(input: string | Date | null | undefined): string {
  if (!input) return '-';
  const parsed = parseDateValue(input);
  if (!parsed) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function formatDateTimeLabel(value?: string | Date | null): string {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return `${formatDateDDMMYYYY(parsed.toISOString())} ${parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

/**
 * Date-keys (YYYY-MM-DD) pinned to the business timezone (Asia/Kolkata) so
 * "today" and day grouping are identical for on-site staff and remote viewers.
 * en-CA locale formats as YYYY-MM-DD directly.
 */
const KOLKATA_DATE_KEY_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function dateKeyKolkata(input: string | Date | null | undefined): string {
  if (!input) return '';
  const parsed = parseDateValue(input);
  if (!parsed) return '';
  return KOLKATA_DATE_KEY_FORMAT.format(parsed);
}

export function todayKeyKolkata(): string {
  return KOLKATA_DATE_KEY_FORMAT.format(new Date());
}

const KOLKATA_TZ = 'Asia/Kolkata';

export function formatDateLongIN(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const parsed = parseDateValue(input);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: KOLKATA_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export function formatMonthYearIN(input: string | Date | null | undefined): string {
  if (!input) return '—';
  const parsed = parseDateValue(input);
  if (!parsed) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: KOLKATA_TZ,
    month: 'long',
    year: 'numeric',
  }).format(parsed);
}

export type FormatWeekdayDateINOpts = {
  weekday?: 'long' | 'short' | 'narrow';
  day?: 'numeric' | '2-digit';
  month?: 'short' | 'long';
  withYear?: boolean;
};

export function formatWeekdayDateIN(
  input: string | Date | null | undefined,
  opts?: FormatWeekdayDateINOpts,
): string {
  if (!input) return '—';
  const parsed = parseDateValue(input);
  if (!parsed) return '—';

  const formatOptions: Intl.DateTimeFormatOptions = { timeZone: KOLKATA_TZ };
  if (opts?.weekday) formatOptions.weekday = opts.weekday;
  if (opts?.day) formatOptions.day = opts.day;
  if (opts?.month) formatOptions.month = opts.month;
  if (opts?.withYear) formatOptions.year = 'numeric';

  if (!opts || Object.keys(opts).length === 0) {
    formatOptions.weekday = 'short';
    formatOptions.day = 'numeric';
    formatOptions.month = 'short';
    formatOptions.year = 'numeric';
  }

  return new Intl.DateTimeFormat('en-IN', formatOptions).format(parsed);
}

