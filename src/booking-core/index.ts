/**
 * @bika/booking-core — single source of truth for Bika booking billing math
 * and the shared catering floor, consumed by both the web client and the API
 * server.
 *
 *  - money.ts         canonical integer-rupee primitives (roundRupee, ceiling)
 *  - billing-lines.ts row-based view used by the booking form grid
 *  - financials.ts    discount sync + ceiling validation used by the form
 *  - booking-lines.ts line-array view used by the save/persistence path
 *  - pack-catering.ts shared MIN_CATERING_RATE_PER_PLATE
 *  - payment-credit.ts cheque clearing + gross vs credited payment sums
 *  - booking-readers.ts canonical reads for legacy twin columns
 */

export * from './money';
export * from './billing-lines';
export * from './financials';
export * from './booking-lines';
export * from './pack-catering';
export * from './payment-credit';
export * from './booking-readers';
export * from './billing-engine';
export * from './menu-item-notes';
