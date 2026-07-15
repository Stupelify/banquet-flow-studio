import {
  syncBillingAmounts,
  type BillingAmountSyncMode,
  type SyncedBillingAmounts,
} from '@bika/booking-core';

export interface BillingFieldsSnapshot {
  finalDiscountPercent: string;
  finalDiscountAmount: string;
  finalAmount: string;
}

/**
 * When meals subtotal changes (pack rate/pax edit), the DISCOUNT is the invariant —
 * never the absolute net. Carry the % when one is set (net scales by %), otherwise
 * carry the rupee discount (incl. 0 => net tracks the new subtotal). This stops a
 * stale/locked net from faking a discount.
 */
export function recalcBillingWhenMealsSubtotalChanges(
  prev: BillingFieldsSnapshot,
  mealsSubtotal: number,
  _amountSyncMode: BillingAmountSyncMode
): SyncedBillingAmounts {
  const percentSource = prev.finalDiscountPercent?.trim() ?? '';
  const percentNum = Number(percentSource);
  const hasPercent =
    percentSource !== '' && Number.isFinite(percentNum) && percentNum > 0;

  if (hasPercent) {
    return syncBillingAmounts('discountPercent', prev.finalDiscountPercent, mealsSubtotal);
  }
  return syncBillingAmounts('discountAmount', prev.finalDiscountAmount || '0', mealsSubtotal);
}

/**
 * Billing amounts to load for an existing booking. The discount is the source of
 * truth: net is recomputed from the stored discount applied to the live meals
 * subtotal, so a stale stored net can never show an inflated value or a phantom
 * discount. Prefer the stored percent; fall back to the stored rupee discount.
 */
export function resolveLoadedBillingAmounts(
  discountPercentage: number | string | null | undefined,
  discountAmount: number | string | null | undefined,
  mealsSubtotal: number
): SyncedBillingAmounts {
  const pct = Number(discountPercentage) || 0;
  if (pct > 0) {
    return syncBillingAmounts('discountPercent', String(pct), mealsSubtotal);
  }
  const amt = Math.max(0, Number(discountAmount) || 0);
  return syncBillingAmounts('discountAmount', String(amt), mealsSubtotal);
}
