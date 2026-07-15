import { describe, it, expect } from 'vitest';
import {
  dedupeSlotsByBookingId,
  buildVenueAggregateSlots,
  type AggregateSlotInput,
} from '../calendarConcurrency';

describe('dedupeSlotsByBookingId', () => {
  it('returns empty for empty input', () => {
    expect(dedupeSlotsByBookingId([])).toEqual([]);
  });

  it('keeps a single booking once', () => {
    const slots = [{ bookingId: 'b1', x: 1 }];
    expect(dedupeSlotsByBookingId(slots)).toEqual(slots);
  });

  it('collapses a multi-hall booking (same bookingId) to one slot', () => {
    const slots = [
      { bookingId: 'b1', hall: 'A' },
      { bookingId: 'b1', hall: 'B' },
      { bookingId: 'b1', hall: 'C' },
    ];
    const out = dedupeSlotsByBookingId(slots);
    expect(out).toHaveLength(1);
    expect(out[0].bookingId).toBe('b1');
  });

  it('keeps distinct bookings on the same day', () => {
    const slots = [
      { bookingId: 'b1' },
      { bookingId: 'b2' },
    ];
    expect(dedupeSlotsByBookingId(slots)).toHaveLength(2);
  });

  it('keeps slots without a bookingId (e.g. google events) distinct, never collapsing them', () => {
    const slots = [
      { bookingId: undefined, name: 'g1' },
      { bookingId: undefined, name: 'g2' },
    ];
    expect(dedupeSlotsByBookingId(slots)).toHaveLength(2);
  });
});

describe('buildVenueAggregateSlots (day A -> B -> A duplication reproduction)', () => {
  const make = (
    bookingId: string,
    halls: string[],
    date = '2026-06-01',
  ): AggregateSlotInput => ({ bookingId, halls, date });

  it('a multi-hall booking yields exactly one aggregate slot', () => {
    const out = buildVenueAggregateSlots([make('b1', ['A', 'B'])]);
    expect(out).toHaveLength(1);
    expect(out[0].bookingId).toBe('b1');
  });

  it('does not duplicate when the same booking list is rebuilt repeatedly (nav A->B->A)', () => {
    const input = [make('b1', ['A', 'B']), make('b2', ['C'])];
    const first = buildVenueAggregateSlots(input);
    const again = buildVenueAggregateSlots([...input, ...input]); // simulate a leaked double-append
    expect(first).toHaveLength(2);
    expect(again).toHaveLength(2); // dedup absorbs the duplication
    expect(again.map((s) => s.bookingId).sort()).toEqual(['b1', 'b2']);
  });

  it('handles unmatched / unassigned-hall bookings without duplicating', () => {
    const out = buildVenueAggregateSlots([make('b1', [])]);
    expect(out).toHaveLength(1);
  });

  it('empty list -> empty', () => {
    expect(buildVenueAggregateSlots([])).toEqual([]);
  });

  it('single booking single hall -> one slot', () => {
    expect(buildVenueAggregateSlots([make('b1', ['A'])])).toHaveLength(1);
  });
});
