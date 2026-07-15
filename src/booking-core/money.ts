/**
 * Canonical money primitives for Bika booking billing — integer rupees.
 *
 * These three symbols were previously duplicated in the client
 * (lib/booking-form/financials.ts) and the server
 * (controllers/booking.financials.ts). They are defined ONCE here so the
 * row-based (form) and line-array (persistence) views provably agree.
 *
 * roundRupee uses the server form (Number()-coercing, non-finite -> 0): it is a
 * superset of the old client form and is identical for every numeric input the
 * client ever passed.
 */

export const BILLING_CEILING_EPSILON = 0.01;

/** Nearest whole rupee (half-up). Coerces via Number(); non-finite -> 0. */
export function roundRupee(value: number | null | undefined): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function formatRupeeAmount(amount: number): string {
  return String(roundRupee(amount));
}

/**
 * True when value exceeds ceiling after both are rounded to whole rupees.
 * Equivalent to the old client form `roundRupee(value) > roundRupee(ceiling)`
 * (both rounded operands are integers, so `> EPSILON` means a difference >= ₹1).
 */
export function exceedsBillingCeiling(value: number, ceiling: number): boolean {
  return roundRupee(value) - roundRupee(ceiling) > BILLING_CEILING_EPSILON;
}
