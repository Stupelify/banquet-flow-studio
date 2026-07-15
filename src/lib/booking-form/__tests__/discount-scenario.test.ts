import { describe, expect, it } from 'vitest';
import { recalcBillingWhenMealsSubtotalChanges } from '../billing-recalc';

/**
 * Regression for: discounted net briefly showing as undiscounted meals subtotal
 * when meals subtotal changed after load/navigation (429000 vs 360000 report).
 */
describe('discount scenario regression', () => {
  const MEALS_SUBTOTAL = 429000;
  const DISCOUNT_AMOUNT = 69000;
  const MEALS_NET = 360000;
  const DISCOUNT_PERCENT = '16.08';

  it('recalc after subtotal change retains discount % instead of wiping to full subtotal', () => {
    const billing = {
      finalDiscountPercent: DISCOUNT_PERCENT,
      finalDiscountAmount: String(DISCOUNT_AMOUNT),
      finalAmount: String(MEALS_NET),
    };

    const afterRecalc = recalcBillingWhenMealsSubtotalChanges(
      billing,
      MEALS_SUBTOTAL,
      'finalAmount'
    );

    expect(afterRecalc.finalAmount).not.toBe(String(MEALS_SUBTOTAL));
    expect(Number(afterRecalc.finalAmount)).toBeGreaterThan(0);
    expect(Number(afterRecalc.finalAmount)).toBeLessThan(MEALS_SUBTOTAL);
    expect(afterRecalc.finalDiscountPercent).toBeTruthy();
    expect(Number(afterRecalc.finalDiscountAmount)).toBeGreaterThan(0);
  });

  it('old buggy behavior would have set net to full subtotal (documented guard)', () => {
    const fixed = recalcBillingWhenMealsSubtotalChanges(
      {
        finalDiscountPercent: DISCOUNT_PERCENT,
        finalDiscountAmount: String(DISCOUNT_AMOUNT),
        finalAmount: String(MEALS_NET),
      },
      MEALS_SUBTOTAL,
      'finalAmount'
    );
    expect(fixed.finalAmount).not.toBe(String(MEALS_SUBTOTAL));
  });
});
