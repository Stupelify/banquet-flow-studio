/**
 * Shared catering floor. The side-specific validators (which operate on
 * different payload shapes) stay in client/pack-catering.ts and
 * server/booking.pack-catering.ts; both import this single constant.
 */

export const MIN_CATERING_RATE_PER_PLATE = 200;
