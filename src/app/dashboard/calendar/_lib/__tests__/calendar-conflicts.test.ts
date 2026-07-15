import { describe, expect, it } from 'vitest';
import { findDayHallConflicts, findOverlaps } from '../calendar-helpers';
import type { BookingCalendarRow } from '../types';

function booking(overrides: Partial<BookingCalendarRow>): BookingCalendarRow {
  return {
    id: Math.random().toString(36).slice(2),
    functionName: 'Event',
    functionType: 'Wedding',
    functionDate: '2026-08-12T00:00:00.000Z',
    status: 'confirmed',
    startTime: '10:00',
    endTime: '14:00',
    halls: [{ hallId: 'h1', hall: { id: 'h1', name: 'Crystal Hall' } }],
    customer: { name: 'A', phone: '1' },
    ...overrides,
  } as BookingCalendarRow;
}

describe('findDayHallConflicts', () => {
  it('flags overlapping bookings in the same hall', () => {
    const conflicts = findDayHallConflicts([
      booking({ startTime: '10:00', endTime: '14:00' }),
      booking({ startTime: '13:00', endTime: '17:00' }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].hallName).toBe('Crystal Hall');
  });

  it('no conflict across different halls at the same time', () => {
    const conflicts = findDayHallConflicts([
      booking({}),
      booking({ halls: [{ hallId: 'h2', hall: { id: 'h2', name: 'Emerald Hall' } }] }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('cancelled bookings never conflict', () => {
    const conflicts = findDayHallConflicts([
      booking({}),
      booking({ status: 'cancelled' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });

  it('back-to-back bookings do not conflict', () => {
    const conflicts = findDayHallConflicts([
      booking({ startTime: '10:00', endTime: '14:00' }),
      booking({ startTime: '14:00', endTime: '18:00' }),
    ]);
    expect(conflicts).toHaveLength(0);
  });
});

describe('findOverlaps', () => {
  it('finds every overlapping pair, not just adjacent ones', () => {
    const party = (id: string, s: number, e: number) =>
      ({ id, startMinutes: s, endMinutes: e } as never);
    const overlaps = findOverlaps([
      party('a', 600, 900),
      party('b', 660, 720),
      party('c', 840, 960),
    ]);
    expect(overlaps).toHaveLength(2); // a-b and a-c
  });
});
