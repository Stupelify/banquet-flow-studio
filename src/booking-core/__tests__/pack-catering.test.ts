import { describe, expect, it } from 'vitest';
import { MIN_CATERING_RATE_PER_PLATE } from '../index';

/**
 * Only the shared CONSTANT lives here. The side-specific catering validators
 * stay in client/pack-catering.ts and server/booking.pack-catering.ts (they
 * operate on different payload shapes); both now import this single value so
 * the ₹200 floor can never drift between client and server again.
 */
describe('MIN_CATERING_RATE_PER_PLATE', () => {
  it('is the single ₹200 floor shared by client and server', () => {
    expect(MIN_CATERING_RATE_PER_PLATE).toBe(200);
  });
});
