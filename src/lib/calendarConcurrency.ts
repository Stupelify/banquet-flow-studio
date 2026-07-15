/**
 * Pure-logic helpers for multi-hall booking de-duplication. Extracted so they
 * can be unit-tested in the node vitest environment (no React / DOM required).
 *
 * Part of the "bookings replicate when navigating day A -> B -> A" fix:
 *  - dedupeSlotsByBookingId / buildVenueAggregateSlots: a multi-hall booking is
 *    rendered once in venue-aggregate views, and accidental double-appends
 *    (e.g. from a leaked SSE refetch) are absorbed.
 *  (The old LatestWinsGuard is gone — React Query keys the calendar load by
 *  view range, which makes out-of-order responses structurally impossible.)
 */

/** Keep the first occurrence of each truthy bookingId; slots without an id are
 * all preserved (e.g. google events keyed differently). */
export function dedupeSlotsByBookingId<T extends { bookingId?: string }>(slots: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const slot of slots) {
    const id = slot.bookingId;
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    out.push(slot);
  }
  return out;
}

export interface AggregateSlotInput {
  bookingId: string;
  halls: string[];
  date: string;
}

/** Build the venue-aggregate slot list: exactly one slot per bookingId,
 * regardless of how many halls the booking spans. */
export function buildVenueAggregateSlots(
  bookings: AggregateSlotInput[],
): AggregateSlotInput[] {
  return dedupeSlotsByBookingId(bookings);
}
