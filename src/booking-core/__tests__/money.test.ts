import { describe, expect, it } from 'vitest';
import {
  BILLING_CEILING_EPSILON,
  exceedsBillingCeiling,
  formatRupeeAmount,
  roundRupee,
} from '../index';

/**
 * money.ts holds the THREE primitives that were duplicated across the client
 * (financials.ts) and server (booking.financials.ts). These tests pin the
 * canonical behaviour and prove it matches BOTH original definitions.
 *
 *  - client roundRupee(value: number): !isFinite -> 0 else Math.round(value)
 *  - server roundRupee(v): n = Number(v); isFinite(n) ? Math.round(n) : 0
 *  Canonical = server form (a superset): identical for every numeric input the
 *  client ever passed; additionally tolerates null/undefined/strings.
 */
describe('roundRupee', () => {
  it('rounds to nearest whole rupee, half-up', () => {
    expect(roundRupee(2235.4)).toBe(2235);
    expect(roundRupee(2235.5)).toBe(2236);
    expect(roundRupee(100.5)).toBe(101);
    expect(roundRupee(0)).toBe(0);
    expect(roundRupee(7)).toBe(7);
  });

  it('rounds negatives toward +Infinity (Math.round semantics)', () => {
    expect(roundRupee(-100.4)).toBe(-100);
    expect(roundRupee(-100.6)).toBe(-101);
    expect(roundRupee(-1.5)).toBe(-1);
  });

  it('returns 0 for non-finite values (both original forms agreed)', () => {
    expect(roundRupee(Number.NaN)).toBe(0);
    expect(roundRupee(Number.POSITIVE_INFINITY)).toBe(0);
    expect(roundRupee(Number.NEGATIVE_INFINITY)).toBe(0);
  });

  it('coerces null/undefined/strings via Number() (canonical/server semantics)', () => {
    expect(roundRupee(null)).toBe(0);
    expect(roundRupee(undefined)).toBe(0);
    expect(roundRupee('200' as unknown as number)).toBe(200);
    expect(roundRupee('200.6' as unknown as number)).toBe(201);
    expect(roundRupee('abc' as unknown as number)).toBe(0);
  });
});

describe('exceedsBillingCeiling', () => {
  it('compares rounded rupees — never false-positives at equality', () => {
    expect(exceedsBillingCeiling(10000, 10000)).toBe(false);
    expect(exceedsBillingCeiling(10001, 10000)).toBe(true);
    expect(exceedsBillingCeiling(9999, 10000)).toBe(false);
  });

  it('rounds both operands before comparing', () => {
    // 10000.4 -> 10000 (not over); 10000.6 -> 10001 (over); 10000.5 -> 10001 (over).
    expect(exceedsBillingCeiling(10000.4, 10000)).toBe(false);
    expect(exceedsBillingCeiling(10000.6, 10000)).toBe(true);
    expect(exceedsBillingCeiling(10000.5, 10000)).toBe(true);
  });

  it('is equivalent to the old client form roundRupee(v) > roundRupee(c)', () => {
    const cases: Array<[number, number]> = [
      [10000, 10000],
      [10001, 10000],
      [10000.4, 10000],
      [10000.6, 10000],
      [0, 0],
      [1, 0],
      [123456, 123456],
    ];
    for (const [v, c] of cases) {
      expect(exceedsBillingCeiling(v, c)).toBe(roundRupee(v) > roundRupee(c));
    }
  });
});

describe('formatRupeeAmount / BILLING_CEILING_EPSILON', () => {
  it('formats as a rounded integer string', () => {
    expect(formatRupeeAmount(2235.4)).toBe('2235');
    expect(formatRupeeAmount(2236)).toBe('2236');
    expect(formatRupeeAmount(Number.NaN)).toBe('0');
  });

  it('keeps the epsilon constant at 0.01', () => {
    expect(BILLING_CEILING_EPSILON).toBe(0.01);
  });
});
