import { api } from '@/lib/api';
import { dateKeyKolkata } from '@/lib/date';
import {
  resolveDueAmount,
  resolvePayableTotal,
  resolvePaymentReceivedGross,
} from '@bika/booking-core';
import type {
  BookingCalendarRow,
  EnquiryCalendarRow,
  GoogleCalendarEventRow,
  GoogleCalendarFetchResult,
  HallCalendarOption,
  HallScheduleParty,
  ServiceSlot,
} from './types';

export const SERVICE_SLOT_LABELS: Record<ServiceSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  hiTea: 'Hi-Tea',
  dinner: 'Dinner',
};

/** Location/hall palette — values resolve via --cal-loc-* in tokens.css */
export const LOCATION_PALETTE = [
  { solid: 'var(--cal-loc-0-solid)', soft: 'var(--cal-loc-0-soft)', text: 'var(--cal-loc-0-text)', border: 'var(--cal-loc-0-border)' },
  { solid: 'var(--cal-loc-1-solid)', soft: 'var(--cal-loc-1-soft)', text: 'var(--cal-loc-1-text)', border: 'var(--cal-loc-1-border)' },
  { solid: 'var(--cal-loc-2-solid)', soft: 'var(--cal-loc-2-soft)', text: 'var(--cal-loc-2-text)', border: 'var(--cal-loc-2-border)' },
  { solid: 'var(--cal-loc-3-solid)', soft: 'var(--cal-loc-3-soft)', text: 'var(--cal-loc-3-text)', border: 'var(--cal-loc-3-border)' },
  { solid: 'var(--cal-loc-4-solid)', soft: 'var(--cal-loc-4-soft)', text: 'var(--cal-loc-4-text)', border: 'var(--cal-loc-4-border)' },
  { solid: 'var(--cal-loc-5-solid)', soft: 'var(--cal-loc-5-soft)', text: 'var(--cal-loc-5-text)', border: 'var(--cal-loc-5-border)' },
  { solid: 'var(--cal-loc-6-solid)', soft: 'var(--cal-loc-6-soft)', text: 'var(--cal-loc-6-text)', border: 'var(--cal-loc-6-border)' },
  { solid: 'var(--cal-loc-7-solid)', soft: 'var(--cal-loc-7-soft)', text: 'var(--cal-loc-7-text)', border: 'var(--cal-loc-7-border)' },
] as const;

export function stableHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getLocationPalette(seed: string) {
  const normalized = seed.trim().toLowerCase();
  if (!normalized) return LOCATION_PALETTE[0];
  return LOCATION_PALETTE[stableHash(normalized) % LOCATION_PALETTE.length];
}

export function resolveServiceSlot(minutes: number): ServiceSlot {
  if (!Number.isFinite(minutes)) return 'lunch';
  if (minutes < 660) return 'breakfast';
  if (minutes < 900) return 'lunch';
  if (minutes < 1080) return 'hiTea';
  return 'dinner';
}

export function compactLocationLabel(value: string): string {
  const clean = value.trim();
  if (!clean) return '';
  if (clean.length <= 16) return clean;
  return `${clean.slice(0, 13)}...`;
}

export function compactFunctionLabel(value: string, max = 18): string {
  const clean = value.trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(6, max - 3))}...`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toSafeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveBookingStatus(entry: { isQuotation?: boolean; status?: string | null; isPencilBooking?: boolean }): string {
  if (entry.isPencilBooking) return 'pencil';
  return entry.isQuotation ? 'quotation' : (entry.status || 'pending').toLowerCase();
}

export function resolveEnquiryStatus(entry: Pick<EnquiryCalendarRow, 'isPencilBooked' | 'status'>): string {
  return entry.isPencilBooked ? 'pencil' : (entry.status || 'enquiry').toLowerCase();
}

export function getPaymentSnapshot(entry: BookingCalendarRow): {
  total: number;
  paid: number;
  balance: number;
  percent: number;
  label: string;
  tone: 'paid' | 'partial' | 'outstanding';
} {
  const total = resolvePayableTotal({
    grandTotal: entry.grandTotal,
    finalAmountValue: entry.finalAmountValue,
  });
  const paid = resolvePaymentReceivedGross({
    paymentReceivedAmount: entry.paymentReceived ?? entry.paymentReceivedAmount,
    paymentReceivedAmountValue: entry.paymentReceivedAmountValue,
  });
  const balance = resolveDueAmount({
    dueAmount: entry.dueAmount,
    dueAmountValue: entry.dueAmountValue,
  });
  const percent = total > 0 ? clamp(Math.round((paid / total) * 100), 0, 100) : 0;
  const tone = total > 0 && balance <= 0 ? 'paid' : paid > 0 ? 'partial' : 'outstanding';
  const label = tone === 'paid' ? 'Paid' : tone === 'partial' ? 'Partial' : 'Outstanding';
  return { total, paid, balance, percent, label, tone };
}

export function formatDateKey(date: Date): string {
  return dateKeyKolkata(date);
}

export function parseClockToMinutes(value: string): number {
  const raw = value.trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return hour * 60 + minute;
    }
  }

  const normalized = raw.toUpperCase().replace(/\s+/g, ' ').trim();
  const meridianMatch = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!meridianMatch) return Number.POSITIVE_INFINITY;

  const hourPart = Number(meridianMatch[1]);
  const minutePart = Number(meridianMatch[2]);
  if (hourPart < 1 || hourPart > 12 || minutePart < 0 || minutePart > 59) {
    return Number.POSITIVE_INFINITY;
  }

  let hour = hourPart % 12;
  if (meridianMatch[3] === 'PM') hour += 12;
  return hour * 60 + minutePart;
}

export function formatClockDisplay(value?: string | null): string {
  if (!value) return '';
  const raw = value.trim();
  if (!raw) return '';

  const match = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return raw;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return raw;

  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export function bookingTimeLabel(entry: {
  startTime?: string | null;
  endTime?: string | null;
  functionTime?: string | null;
}): string {
  const start = formatClockDisplay(entry.startTime);
  const end = formatClockDisplay(entry.endTime);
  if (start && end) return `${start} - ${end}`;
  if (start) return start;
  if (end) return end;

  const fallback = formatClockDisplay(entry.functionTime);
  return fallback || '--:--';
}

export function bookingSortMinutes(entry: BookingCalendarRow): number {
  if (entry.startTime) {
    const start = parseClockToMinutes(entry.startTime);
    if (Number.isFinite(start)) return start;
  }
  if (entry.functionTime) {
    const fnTime = parseClockToMinutes(entry.functionTime);
    if (Number.isFinite(fnTime)) return fnTime;
  }
  if (entry.endTime) {
    const end = parseClockToMinutes(entry.endTime);
    if (Number.isFinite(end)) return end;
  }
  return Number.POSITIVE_INFINITY;
}

export function resolveBookingTimeRange(entry: {
  startTime?: string | null;
  endTime?: string | null;
  functionTime?: string | null;
}): { startMinutes: number; endMinutes: number } {
  const startCandidate = entry.startTime || entry.functionTime || entry.endTime || '';
  let start = parseClockToMinutes(startCandidate);
  if (!Number.isFinite(start)) {
    return { startMinutes: 0, endMinutes: 1440 };
  }

  let end = parseClockToMinutes(entry.endTime || '');
  if (!Number.isFinite(end)) {
    end = Math.min(start + 120, 1440);
  }
  if (end <= start) {
    end = Math.min(start + 60, 1440);
  }
  return { startMinutes: start, endMinutes: end };
}

export function getBookingHallNames(entry: BookingCalendarRow): string[] {
  const names = (entry.halls || [])
    .map((hallRow) => hallRow.hall?.name?.trim() || '')
    .filter(Boolean);
  return Array.from(new Set(names));
}

export function getPrimaryHallName(entry: BookingCalendarRow): string {
  const hallNames = getBookingHallNames(entry);
  return hallNames[0] || 'Unassigned Hall';
}

// Event → day-cell mapping is pinned to the business timezone (Asia/Kolkata)
// so remote viewers see events on the same calendar day as on-site staff.
export function eventDateKey(value: string): string {
  return dateKeyKolkata(value);
}

export function formatEventClock(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

export function googleEventTimeLabel(entry: GoogleCalendarEventRow): string {
  if (entry.isAllDay) return 'All Day';
  if (!entry.start) return '--:--';

  const startLabel = formatEventClock(entry.start);
  if (!entry.end || entry.end === entry.start) return startLabel;

  const endLabel = formatEventClock(entry.end);
  return `${startLabel} - ${endLabel}`;
}

export function googleEventSortMinutes(entry: GoogleCalendarEventRow): number {
  if (entry.isAllDay) return 0;
  const date = new Date(entry.start);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  return date.getHours() * 60 + date.getMinutes();
}

export function googleEventRangeMinutes(entry: GoogleCalendarEventRow): { startMinutes: number; endMinutes: number } {
  if (entry.isAllDay) return { startMinutes: 0, endMinutes: 1440 };
  const start = googleEventSortMinutes(entry);
  if (!Number.isFinite(start)) return { startMinutes: 0, endMinutes: 1440 };
  if (!entry.end) return { startMinutes: start, endMinutes: Math.min(start + 60, 1440) };
  const endDate = new Date(entry.end);
  if (Number.isNaN(endDate.getTime())) {
    return { startMinutes: start, endMinutes: Math.min(start + 60, 1440) };
  }
  const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
  return {
    startMinutes: start,
    endMinutes: endMinutes > start ? endMinutes : Math.min(start + 60, 1440),
  };
}

export function findOverlaps(parties: HallScheduleParty[]) {
  const sorted = [...parties].sort((a, b) => a.startMinutes - b.startMinutes);
  const overlaps: Array<{ first: HallScheduleParty; second: HallScheduleParty }> = [];
  for (let i = 0; i < sorted.length; i += 1) {
    for (let j = i + 1; j < sorted.length; j += 1) {
      if (sorted[j].startMinutes >= sorted[i].endMinutes) break;
      overlaps.push({ first: sorted[i], second: sorted[j] });
    }
  }
  return overlaps;
}

export function findDayHallConflicts(bookingsForDay: BookingCalendarRow[]) {
  const byHall = new Map<string, HallScheduleParty[]>();

  bookingsForDay
    .filter((booking) => resolveBookingStatus(booking) !== 'cancelled')
    .forEach((booking) => {
      const hallNames = getBookingHallNames(booking);
      const effectiveHallNames = hallNames.length > 0 ? hallNames : ['Unassigned Hall'];
      const { startMinutes, endMinutes } = resolveBookingTimeRange(booking);

      effectiveHallNames.forEach((hallName) => {
        const bucket = byHall.get(hallName) || [];
        bucket.push({
          id: booking.id,
          title: booking.functionName,
          date: booking.functionDate,
          timeLabel: bookingTimeLabel(booking),
          status: resolveBookingStatus(booking),
          customerName: booking.customer?.name || 'Customer',
          customerPhone: booking.customer?.phone || '--',
          guests: toSafeNumber(booking.expectedGuests),
          sortMinutes: bookingSortMinutes(booking),
          startMinutes,
          endMinutes,
        });
        byHall.set(hallName, bucket);
      });
    });

  return Array.from(byHall.entries()).flatMap(([hallName, parties]) =>
    findOverlaps(parties).map((overlap) => ({ hallName, ...overlap }))
  );
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T00:00:00`);
}

export function dateToKey(input: string): string {
  return dateKeyKolkata(input);
}

export function monthBounds(month: Date): { start: Date; end: Date } {
  const start = new Date(month.getFullYear(), month.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function endOfWeek(date: Date): Date {
  const result = startOfWeek(date);
  result.setDate(result.getDate() + 6);
  return endOfDay(result);
}

export function buildCalendarDays(month: Date): Date[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    days.push(date);
  }
  return days;
}

export function buildWeekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

export type CalendarFetchResult<T> = {
  rows: T[];
  truncated: boolean;
};

export async function fetchBookings(
  start: Date,
  end: Date
): Promise<CalendarFetchResult<BookingCalendarRow>> {
  const fromDate = dateKeyKolkata(start);
  const toDate = dateKeyKolkata(end);
  const response = await api.getBookingsCalendarRange({ fromDate, toDate });
  const rows = (response.data?.data?.bookings || []) as BookingCalendarRow[];
  return { rows, truncated: Boolean(response.data?.data?.truncated) };
}

export async function fetchEnquiries(
  start: Date,
  end: Date
): Promise<CalendarFetchResult<EnquiryCalendarRow>> {
  const fromDate = dateKeyKolkata(start);
  const toDate = dateKeyKolkata(end);
  const response = await api.getEnquiriesCalendarRange({ fromDate, toDate });
  const rows = (response.data?.data?.enquiries || []) as EnquiryCalendarRow[];
  return { rows, truncated: Boolean(response.data?.data?.truncated) };
}

export async function fetchHalls(): Promise<HallCalendarOption[]> {
  const response = await api.getHalls({ page: 1, limit: 5000 });
  const rows = response.data?.data?.halls || [];
  return (
    rows as Array<{
      id: string;
      name: string;
      banquet?: {
        name?: string;
      } | null;
    }>
  )
    .map((entry) => ({
      id: entry.id,
      name: (entry.name || '').trim(),
      banquetName: (entry.banquet?.name || '').trim(),
    }))
    .filter((entry) => entry.name.length > 0);
}

export async function fetchGoogleCalendarEvents(
  start: Date,
  end: Date
): Promise<GoogleCalendarFetchResult> {
  try {
    const response = await api.getGoogleCalendarEvents({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
    const payload = response.data?.data as
      | {
        enabled?: boolean;
        configured?: boolean;
        sourceCount?: number;
        events?: GoogleCalendarEventRow[];
      }
      | undefined;

    return {
      enabled: Boolean(payload?.enabled),
      configured: Boolean(payload?.configured),
      sourceCount: Number(payload?.sourceCount || 0),
      events: Array.isArray(payload?.events) ? payload!.events : [],
    };
  } catch (error) {
    return {
      enabled: false,
      configured: false,
      sourceCount: 0,
      events: [],
    };
  }
}
