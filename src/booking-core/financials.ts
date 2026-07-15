/**
 * Booking form billing (form view) — integer rupees, nearest-rupee discount on
 * meals only, grand total = meals net + extras.
 * Money primitives live in money.ts; the line-array (persistence) view lives in
 * booking-lines.ts.
 */

import { exceedsBillingCeiling, formatRupeeAmount, roundRupee } from './money';

/** Display-only; does not drive stored money after sync. */
export function formatDiscountPercentDisplay(percent: number): string {
  if (!Number.isFinite(percent)) return '0';
  return (Math.round(percent * 100) / 100).toFixed(2);
}

/** Format % on blur after the user finishes typing. */
export function formatPercentFieldOnBlur(rawInput: string): string {
  const raw = rawInput.trim();
  if (raw === '' || raw === '.') return '';
  return formatDiscountPercentDisplay(parsePercentForCalculation(raw));
}

/**
 * While the user is typing in Disc %, keep their string (e.g. "1", "10", "10.")
 * instead of forcing "1.00" on every keystroke — that breaks typing "10".
 */
export function percentFieldDisplayValue(
  rawInput: string,
  computedPercent: number
): string {
  const raw = rawInput.trim();
  if (raw === '') return '';
  if (/^\d*\.?\d{0,2}$/.test(raw)) {
    if (raw === '.' || raw.endsWith('.')) return raw;
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0 && n <= 100) return raw;
  }
  return formatDiscountPercentDisplay(computedPercent);
}

export function parsePercentForCalculation(rawInput: string): number {
  const raw = rawInput.trim();
  if (raw === '' || raw === '.') return 0;
  return clamp(parseNonNegative(raw), 0, 100);
}

/** Payable grand total = meals net after discount + extra line items (integer rupees). */
export function computePayableGrandTotal(
  mealsNet: number,
  extrasSubtotal: number
): number {
  return roundRupee(Math.max(0, mealsNet) + Math.max(0, extrasSubtotal));
}

export type BillingAmountSyncMode = 'discountPercent' | 'discountAmount' | 'finalAmount';

export interface SyncedBillingAmounts {
  finalDiscountAmount: string;
  finalDiscountPercent: string;
  /** Meals subtotal after discount (excludes extras). */
  finalAmount: string;
}

/** Parse money/amount strings; strips en-IN commas only (state stays digit-only). */
function parseNonNegative(value: string): number {
  const parsed = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Sync discount ₹, discount %, and meals net for integer rupee billing.
 * Discount applies to mealsSubtotal only (not extras).
 */
export function syncBillingAmounts(
  mode: BillingAmountSyncMode,
  sourceValue: string,
  mealsSubtotal: number
): SyncedBillingAmounts {
  const meals = roundRupee(Math.max(0, mealsSubtotal));

  if (mode === 'discountPercent') {
    const enteredPercent = parsePercentForCalculation(sourceValue);
    const discountAmount = roundRupee((meals * enteredPercent) / 100);
    const finalAmount = roundRupee(Math.max(0, meals - discountAmount));
    return {
      finalDiscountPercent: percentFieldDisplayValue(sourceValue, enteredPercent),
      finalDiscountAmount: formatRupeeAmount(discountAmount),
      finalAmount: formatRupeeAmount(finalAmount),
    };
  }

  if (mode === 'discountAmount') {
    const discountAmount = roundRupee(clamp(parseNonNegative(sourceValue), 0, meals));
    const finalAmount = roundRupee(Math.max(0, meals - discountAmount));
    const displayPercent = meals > 0 ? (discountAmount / meals) * 100 : 0;
    return {
      finalDiscountPercent: formatDiscountPercentDisplay(displayPercent),
      finalDiscountAmount: formatRupeeAmount(discountAmount),
      finalAmount: formatRupeeAmount(finalAmount),
    };
  }

  const finalAmount = roundRupee(clamp(parseNonNegative(sourceValue), 0, meals));
  const discountAmount = roundRupee(Math.max(0, meals - finalAmount));
  const displayPercent = meals > 0 ? (discountAmount / meals) * 100 : 0;
  return {
    finalDiscountPercent: formatDiscountPercentDisplay(displayPercent),
    finalDiscountAmount: formatRupeeAmount(discountAmount),
    finalAmount: formatRupeeAmount(finalAmount),
  };
}

export interface ValidateBillingCeilingInput {
  mealsSubtotal: number;
  extrasSubtotal?: number;
  discountAmount?: string | number;
  discountPercent?: string | number;
  /** Meals net after discount (not including extras). */
  finalAmount?: string | number;
}

export interface ValidateBillingCeilingResult {
  ok: boolean;
  ceiling: number;
  mealsNet: number;
  payableGrandTotal: number;
  message?: string;
}

export function validateBillingCeiling(
  input: ValidateBillingCeilingInput
): ValidateBillingCeilingResult {
  const extras = roundRupee(Math.max(0, Number(input.extrasSubtotal) || 0));
  const meals = roundRupee(Math.max(0, Number(input.mealsSubtotal) || 0));
  const ceiling = roundRupee(meals + extras);

  const hasMealsNet =
    input.finalAmount !== undefined &&
    input.finalAmount !== '' &&
    Number.isFinite(Number(input.finalAmount));

  let mealsNet: number;
  if (hasMealsNet) {
    const rawMealsNet = roundRupee(Number(input.finalAmount));
    const payableGrandTotal = computePayableGrandTotal(rawMealsNet, extras);
    const ok = payableGrandTotal <= ceiling;
    mealsNet = roundRupee(Math.min(rawMealsNet, meals));
    const message = ok
      ? undefined
      : `Grand total (₹${payableGrandTotal.toLocaleString('en-IN')}) cannot exceed the bill total (₹${ceiling.toLocaleString('en-IN')}) from halls, meals, and extra items. Adjust discount or line items and try again.`;
    return {
      ok,
      ceiling,
      mealsNet,
      payableGrandTotal: ok ? payableGrandTotal : roundRupee(Math.min(payableGrandTotal, ceiling)),
      message,
    };
  }

  if (Number(input.discountPercent ?? 0) > 0) {
    const synced = syncBillingAmounts(
      'discountPercent',
      String(input.discountPercent),
      meals
    );
    mealsNet = roundRupee(Number(synced.finalAmount));
  } else {
    const synced = syncBillingAmounts(
      'discountAmount',
      String(input.discountAmount ?? 0),
      meals
    );
    mealsNet = roundRupee(Number(synced.finalAmount));
  }

  const payableGrandTotal = computePayableGrandTotal(mealsNet, extras);
  const ok = !exceedsBillingCeiling(payableGrandTotal, ceiling);
  const message = ok
    ? undefined
    : `Grand total (₹${payableGrandTotal.toLocaleString('en-IN')}) cannot exceed the bill total (₹${ceiling.toLocaleString('en-IN')}) from halls, meals, and extra items. Adjust discount or line items and try again.`;

  return { ok, ceiling, mealsNet, payableGrandTotal, message };
}
