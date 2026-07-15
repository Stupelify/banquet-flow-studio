import { describe, expect, it } from 'vitest';
import {
  recalcBillingWhenMealsSubtotalChanges,
  resolveLoadedBillingAmounts,
} from '../billing-recalc';

describe('recalcBillingWhenMealsSubtotalChanges', () => {
  it('retains discount % and recomputes net when meals subtotal changes', () => {
    const prev = {
      finalDiscountPercent: '10',
      finalDiscountAmount: '42900',
      finalAmount: '386100',
    };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 500000, 'finalAmount');
    expect(next.finalDiscountPercent).toBe('10');
    expect(next.finalDiscountAmount).toBe('50000');
    expect(next.finalAmount).toBe('450000');
  });

  it('does not clear discount when subtotal shifts (regression: 429k wipe)', () => {
    const prev = {
      finalDiscountPercent: '16.08',
      finalDiscountAmount: '69000',
      finalAmount: '360000',
    };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 429000, 'finalAmount');
    expect(next.finalAmount).not.toBe('429000');
    expect(Number(next.finalDiscountAmount)).toBeGreaterThan(0);
    expect(next.finalDiscountPercent).toBeTruthy();
  });

  it('falls back to amountSyncMode when no discount % is set', () => {
    const prev = {
      finalDiscountPercent: '0',
      finalDiscountAmount: '5000',
      finalAmount: '100000',
    };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 200000, 'discountAmount');
    expect(next.finalDiscountAmount).toBe('5000');
    expect(next.finalAmount).toBe('195000');
  });

  it('net tracks the new subtotal when there is no discount (no finalAmount lock)', () => {
    const prev = { finalDiscountPercent: '0', finalDiscountAmount: '0', finalAmount: '10000' };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 100000, 'finalAmount');
    expect(next.finalAmount).toBe('100000');
    expect(next.finalDiscountAmount).toBe('0');
  });

  it('upscales net by the discount % when the total rises', () => {
    const prev = { finalDiscountPercent: '10', finalDiscountAmount: '1000', finalAmount: '9000' };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 12000, 'finalAmount');
    expect(next.finalAmount).toBe('10800');
    expect(next.finalDiscountAmount).toBe('1200');
  });

  it('downscales net by the discount % when the total drops', () => {
    const prev = { finalDiscountPercent: '10', finalDiscountAmount: '1000', finalAmount: '9000' };
    const next = recalcBillingWhenMealsSubtotalChanges(prev, 8000, 'finalAmount');
    expect(next.finalAmount).toBe('7200');
  });
});

describe('resolveLoadedBillingAmounts', () => {
  it('derives net from a stored percent against the live subtotal', () => {
    const a = resolveLoadedBillingAmounts(10, 1000, 12000);
    expect(a.finalAmount).toBe('10800');
    expect(a.finalDiscountAmount).toBe('1200');
    expect(a.finalDiscountPercent).toBe('10');
  });

  it('no discount => net equals the live subtotal (heals a stale stored net)', () => {
    const a = resolveLoadedBillingAmounts(0, 0, 32500);
    expect(a.finalAmount).toBe('32500');
    expect(a.finalDiscountAmount).toBe('0');
  });

  it('preserves a flat rupee discount when no percent is set', () => {
    const a = resolveLoadedBillingAmounts(0, 5000, 32500);
    expect(a.finalAmount).toBe('27500');
    expect(a.finalDiscountAmount).toBe('5000');
  });
});
