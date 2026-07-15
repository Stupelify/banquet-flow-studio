import { describe, expect, it } from 'vitest';
import {
  computePayableGrandTotal,
  formatDiscountPercentDisplay,
  formatPercentFieldOnBlur,
  syncBillingAmounts,
  validateBillingCeiling,
} from '../index';

// ---- ported verbatim from client financials.test.ts ----
describe('roundRupee / syncBillingAmounts', () => {
  it('rounds discount from percent to nearest rupee on meals only (22354 x 10%)', () => {
    const synced = syncBillingAmounts('discountPercent', '10', 22354);
    expect(synced.finalDiscountAmount).toBe('2235');
    expect(synced.finalAmount).toBe('20119');
    expect(synced.finalDiscountPercent).toBe('10');
    expect(computePayableGrandTotal(20119, 100)).toBe(20219);
  });

  it('formatPercentFieldOnBlur normalizes display after editing', () => {
    expect(formatPercentFieldOnBlur('10')).toBe('10.00');
    expect(formatPercentFieldOnBlur('10.5')).toBe('10.50');
  });

  it('keeps meals net authoritative when typed', () => {
    const synced = syncBillingAmounts('finalAmount', '20000', 22354);
    expect(synced.finalAmount).toBe('20000');
    expect(computePayableGrandTotal(20000, 500)).toBe(20500);
  });

  it('derives meals net from discount rupees', () => {
    const synced = syncBillingAmounts('discountAmount', '2350', 22354);
    expect(synced.finalAmount).toBe('20004');
    expect(synced.finalDiscountAmount).toBe('2350');
  });
});

describe('validateBillingCeiling', () => {
  it('passes when payable equals full bill', () => {
    const result = validateBillingCeiling({
      mealsSubtotal: 10000,
      extrasSubtotal: 0,
      finalAmount: '10000',
    });
    expect(result.ok).toBe(true);
    expect(result.payableGrandTotal).toBe(10000);
  });

  it('passes with percentage discount and extras', () => {
    const result = validateBillingCeiling({
      mealsSubtotal: 10000,
      extrasSubtotal: 500,
      discountPercent: 10,
      finalAmount: '9000',
    });
    expect(result.ok).toBe(true);
    expect(result.payableGrandTotal).toBe(9500);
  });

  it('fails when payable exceeds bill total', () => {
    const result = validateBillingCeiling({
      mealsSubtotal: 10000,
      extrasSubtotal: 500,
      finalAmount: '10600',
    });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/Grand total/i);
  });

  it('allows zero bill with zero payable', () => {
    const result = validateBillingCeiling({
      mealsSubtotal: 0,
      extrasSubtotal: 0,
      finalAmount: '0',
    });
    expect(result.ok).toBe(true);
  });
});

// ---- added edge cases ----
describe('syncBillingAmounts (edge cases)', () => {
  it('clamps percent above 100 to a full discount', () => {
    const synced = syncBillingAmounts('discountPercent', '150', 1000);
    expect(synced.finalDiscountAmount).toBe('1000');
    expect(synced.finalAmount).toBe('0');
    expect(synced.finalDiscountPercent).toBe('100.00');
  });

  it('clamps a rupee discount to the meals subtotal', () => {
    const synced = syncBillingAmounts('discountAmount', '5000', 1000);
    expect(synced.finalDiscountAmount).toBe('1000');
    expect(synced.finalAmount).toBe('0');
  });

  it('clamps a typed meals-net above subtotal back to subtotal', () => {
    const synced = syncBillingAmounts('finalAmount', '5000', 1000);
    expect(synced.finalAmount).toBe('1000');
    expect(synced.finalDiscountAmount).toBe('0');
  });

  it('treats negative input as zero', () => {
    const synced = syncBillingAmounts('discountAmount', '-100', 1000);
    expect(synced.finalDiscountAmount).toBe('0');
    expect(synced.finalAmount).toBe('1000');
  });
});

describe('computePayableGrandTotal / formatDiscountPercentDisplay (edge cases)', () => {
  it('clamps negative operands to zero', () => {
    expect(computePayableGrandTotal(-50, -10)).toBe(0);
    expect(computePayableGrandTotal(-50, 100)).toBe(100);
  });

  it('formats percent to two decimals and guards non-finite', () => {
    expect(formatDiscountPercentDisplay(10.535)).toBe('10.54');
    expect(formatDiscountPercentDisplay(Number.NaN)).toBe('0');
  });
});

describe('validateBillingCeiling (discount-driven paths)', () => {
  it('derives meals net from a percentage when no finalAmount is given', () => {
    const result = validateBillingCeiling({ mealsSubtotal: 10000, discountPercent: 10 });
    expect(result.ok).toBe(true);
    expect(result.mealsNet).toBe(9000);
    expect(result.payableGrandTotal).toBe(9000);
  });

  it('derives meals net from a rupee discount when no finalAmount is given', () => {
    const result = validateBillingCeiling({ mealsSubtotal: 10000, discountAmount: '2000' });
    expect(result.ok).toBe(true);
    expect(result.mealsNet).toBe(8000);
    expect(result.payableGrandTotal).toBe(8000);
  });
});
