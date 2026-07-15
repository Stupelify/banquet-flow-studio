/**
 * sumBookingLines + billing resolution (line-array / persistence view).
 * No Prisma dependency — pure and unit-testable. The impure helpers that used
 * to live alongside this (releasePencilBookings) stay in the server controller.
 * Money primitives live in money.ts; the row-based (form) view in billing-lines.ts.
 */

import { exceedsBillingCeiling, roundRupee } from './money';

export interface HallLine {
  charges: number | null | undefined;
}
export interface PackLine {
  ratePerPlate: number | null | undefined;
  packCount: number | null | undefined;
  noOfPack: number | null | undefined;
  setupCost: number | null | undefined;
  extraCharges: number | null | undefined;
  /** Per-meal hall charge (once per pack; not × hall count). */
  hallRate?: number | null | undefined;
}
export interface AdditionalLine {
  charges: number | null | undefined;
  quantity: number | null | undefined;
}

function safeMoney(v: number | null | undefined): number {
  return roundRupee(v);
}

function safeNum(v: number | null | undefined): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Map API/DB pack row to sumBookingLines input (includes hallRate once per pack). */
export function mapPackLineForSumBooking(pack: {
  ratePerPlate?: number | string | null;
  packCount?: number | null;
  noOfPack?: number | null;
  setupCost?: number | string | null;
  extraCharges?: number | string | null;
  hallRate?: number | string | null;
  hallRateValue?: number | null;
}): PackLine {
  const hallFromValue = Number(pack.hallRateValue);
  const hallFromField = Number(pack.hallRate);
  const hallRate = Number.isFinite(hallFromValue)
    ? hallFromValue
    : Number.isFinite(hallFromField)
      ? hallFromField
      : undefined;

  return {
    ratePerPlate: safeMoney(Number(pack.ratePerPlate)),
    packCount: pack.packCount,
    noOfPack: pack.noOfPack,
    setupCost: safeMoney(Number(pack.setupCost)),
    extraCharges: safeMoney(Number(pack.extraCharges)),
    hallRate,
  };
}

export function sumExtrasSubtotal(additionalItems: AdditionalLine[]): number {
  return safeMoney(
    additionalItems.reduce(
      (s, a) => s + safeMoney(a.charges) * Math.max(1, safeNum(a.quantity ?? 1)),
      0
    )
  );
}

export function sumBookingLines(input: {
  halls: HallLine[];
  packs: PackLine[];
  additionalItems: AdditionalLine[];
}): number {
  const hallTableTotal = input.halls.reduce((s, h) => s + safeMoney(h.charges), 0);
  const packHallTotal = input.packs.reduce((s, p) => s + safeMoney(p.hallRate), 0);
  const hallTotal = packHallTotal > 0 ? packHallTotal : hallTableTotal;
  const packTotal = input.packs.reduce((s, p) => {
    const count = Math.max(0, safeNum(p.packCount ?? p.noOfPack ?? 0));
    return (
      s +
      safeMoney(p.ratePerPlate) * count +
      safeMoney(p.setupCost) +
      safeMoney(p.extraCharges)
    );
  }, 0);
  const additionalTotal = sumExtrasSubtotal(input.additionalItems);
  return safeMoney(hallTotal + packTotal + additionalTotal);
}

export function splitMealsAndExtrasSubtotals(input: {
  halls: HallLine[];
  packs: PackLine[];
  additionalItems: AdditionalLine[];
}): {
  mealsSubtotal: number;
  extrasSubtotal: number;
  totalAmount: number;
} {
  const extrasSubtotal = sumExtrasSubtotal(input.additionalItems);
  const totalAmount = sumBookingLines(input);
  const mealsSubtotal = roundRupee(Math.max(0, totalAmount - extrasSubtotal));
  return { mealsSubtotal, extrasSubtotal, totalAmount };
}

export interface ResolveBookingFinancialsInput {
  totalAmount: number;
  /** Additional line items total; discount applies to meals only (total − extras). */
  extrasSubtotal?: number;
  discountPercentage?: number;
  discountAmountInput?: number;
  /** Payable grand total (meals net after discount + extras). */
  finalAmountInput?: number | null;
  /** Flat rupee discount on meals subtotal preserved through party-over. */
  carryForwardMealsDiscount?: number;
}

export interface ResolvedBookingFinancials {
  totalAmount: number;
  mealsSubtotal: number;
  extrasSubtotal: number;
  discountAmount: number;
  discountPercentage: number;
  /** Payable amount before payments (= finalAmountValue). */
  grandTotal: number;
  finalAmountValue: number;
  exceededCeiling: boolean;
}

/** Stored discount % is always meals-only (excludes extras line items). */
function deriveDiscountPercentForStorage(
  mealsSubtotal: number,
  discountAmount: number
): number {
  if (mealsSubtotal <= 0) return 0;
  return Math.round((discountAmount / mealsSubtotal) * 10000) / 100;
}

function resolveMealsNetFromPercentOrAmount(
  mealsSubtotal: number,
  discountPercentage: number,
  discountAmountInput: number
): { mealsNet: number; exceededCeiling: boolean } {
  const inputDiscountPercent = Math.min(100, Math.max(0, safeNum(discountPercentage)));
  let mealDiscount: number;
  if (inputDiscountPercent > 0) {
    mealDiscount = roundRupee((mealsSubtotal * inputDiscountPercent) / 100);
  } else {
    mealDiscount = roundRupee(Math.min(safeMoney(discountAmountInput), mealsSubtotal));
  }
  let exceededCeiling = false;
  const rawDiscountInput = roundRupee(discountAmountInput);
  if (
    mealDiscount > mealsSubtotal ||
    rawDiscountInput > mealsSubtotal ||
    (inputDiscountPercent > 0 &&
      roundRupee((mealsSubtotal * inputDiscountPercent) / 100) > mealsSubtotal)
  ) {
    exceededCeiling = true;
    mealDiscount = Math.min(mealDiscount, mealsSubtotal);
  }
  const mealsNet = roundRupee(Math.max(0, mealsSubtotal - mealDiscount));
  return { mealsNet, exceededCeiling };
}

export function resolveBookingFinancials(
  input: ResolveBookingFinancialsInput
): ResolvedBookingFinancials {
  const totalAmount = roundRupee(input.totalAmount);
  const extrasSubtotal = roundRupee(Math.max(0, input.extrasSubtotal ?? 0));
  const mealsSubtotal = roundRupee(Math.max(0, totalAmount - extrasSubtotal));

  let mealsNet: number;
  let exceededCeiling = false;

  if (input.carryForwardMealsDiscount != null) {
    const carried = roundRupee(input.carryForwardMealsDiscount);
    mealsNet = roundRupee(Math.max(0, mealsSubtotal - carried));
  } else {
    const hasPayableInput =
      input.finalAmountInput != null && input.finalAmountInput !== undefined;
    if (hasPayableInput) {
      const payableInput = roundRupee(Number(input.finalAmountInput));
      if (payableInput > totalAmount) {
        exceededCeiling = true;
      }
      const payableGrandTotal = roundRupee(
        Math.min(Math.max(0, payableInput), totalAmount)
      );
      mealsNet = roundRupee(Math.max(0, payableGrandTotal - extrasSubtotal));
    } else {
      const resolved = resolveMealsNetFromPercentOrAmount(
        mealsSubtotal,
        input.discountPercentage ?? 0,
        input.discountAmountInput ?? 0
      );
      mealsNet = resolved.mealsNet;
      exceededCeiling = resolved.exceededCeiling;
    }
  }

  const payableGrandTotal = roundRupee(mealsNet + extrasSubtotal);
  const discountAmount = roundRupee(Math.max(0, totalAmount - payableGrandTotal));
  const discountPercentage = deriveDiscountPercentForStorage(
    mealsSubtotal,
    discountAmount
  );

  if (exceedsBillingCeiling(payableGrandTotal, totalAmount)) {
    exceededCeiling = true;
  }

  return {
    totalAmount,
    mealsSubtotal,
    extrasSubtotal,
    discountAmount,
    discountPercentage,
    grandTotal: payableGrandTotal,
    finalAmountValue: payableGrandTotal,
    exceededCeiling,
  };
}

export function assertFinancialsWithinCeiling(financials: {
  totalAmount: number;
  grandTotal: number;
  finalAmountValue: number;
}): void {
  if (
    exceedsBillingCeiling(financials.grandTotal, financials.totalAmount) ||
    exceedsBillingCeiling(financials.finalAmountValue, financials.totalAmount)
  ) {
    throw new Error('BOOKING_NET_EXCEEDS_BILL');
  }
}

/** Meals-only ad-hoc discount to preserve through party-over (excludes extras). */
export function computeMealsDiscountCarryForward(input: {
  totalAmount: number;
  extrasSubtotal: number;
  payableGrandTotal: number;
}): number {
  const mealsSubtotal = roundRupee(
    Math.max(0, input.totalAmount - input.extrasSubtotal)
  );
  const mealsNet = roundRupee(
    Math.max(0, input.payableGrandTotal - input.extrasSubtotal)
  );
  return roundRupee(Math.max(0, mealsSubtotal - mealsNet));
}
