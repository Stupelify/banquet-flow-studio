/**
 * Pure billing calculator — Bika-faithful.
 *
 * Formula (per spec):
 *   packAmount      = packCount × ratePerPlate + setupCost + extraCharges + hallRate
 *                     (hallRate added ONCE per pack — never multiplied by hall count)
 *   mealsSubtotal   = Σ packAmounts
 *   extrasSubtotal  = Σ additionalItems[i].charges × quantity
 *   mealsDiscount   = mealsSubtotal × discountPercentage/100  if %>0
 *                     else discountAmount
 *   extrasDiscount  = extrasSubtotal × discountPercentage2nd/100  if %>0
 *                     else discountAmount2nd
 *   grandTotal      = (mealsSubtotal − mealsDiscount) + extrasSubtotal
 *   finalAmount     = grandTotal − extrasDiscount
 *   paymentsCleared = Σ payments where method ≠ Cheque OR clearingDate ≤ today
 *   dueAmount       = finalAmount − paymentsCleared
 */
import type { Booking, MealPack, AdditionalItem, Payment } from "@/lib/mock/types";

export type BillBreakdown = {
  packAmounts: number[];
  mealsSubtotal: number;
  extrasSubtotal: number;
  mealsDiscount: number;
  extrasDiscount: number;
  grandTotal: number;
  finalAmount: number;
  paymentsCleared: number;
  paymentsPending: number;
  dueAmount: number;
};

export type BillingInput = {
  packs: MealPack[];
  additionalItems?: AdditionalItem[];
  discountAmount?: number;
  discountPercentage?: number;
  discountAmount2nd?: number;
  discountPercentage2nd?: number;
  payments?: Payment[];
};

export function computePackAmount(p: MealPack): number {
  return (p.plates ?? 0) * (p.ratePerPlate ?? 0)
    + (p.setupCost ?? 0)
    + (p.extraCharges ?? 0)
    + (p.hallRate ?? 0);
}

export function computeBill(b: BillingInput | Booking): BillBreakdown {
  const packs = b.packs ?? [];
  const additionalItems = (b as Booking).additionalItems ?? [];
  const dAmt   = b.discountAmount ?? 0;
  const dPct   = b.discountPercentage ?? 0;
  const dAmt2  = b.discountAmount2nd ?? 0;
  const dPct2  = b.discountPercentage2nd ?? 0;

  const packAmounts = packs.map(computePackAmount);
  const mealsSubtotal  = packAmounts.reduce((s, x) => s + x, 0);
  const extrasSubtotal = additionalItems.reduce(
    (s, x) => s + (x.charges ?? 0) * (x.quantity ?? 1),
    0,
  );

  const mealsDiscount  = dPct  > 0 ? (mealsSubtotal  * dPct)  / 100 : dAmt;
  const extrasDiscount = dPct2 > 0 ? (extrasSubtotal * dPct2) / 100 : dAmt2;

  const grandTotal = Math.max(0, mealsSubtotal - mealsDiscount) + extrasSubtotal;
  const finalAmount = Math.max(0, grandTotal - extrasDiscount);

  const today = Date.now();
  const payments = b.payments ?? [];
  let cleared = 0;
  let pending = 0;
  for (const p of payments) {
    const isCheque = p.method === "Cheque";
    const okCleared = !isCheque || (p.clearingDate ? +p.clearingDate <= today : false);
    if (okCleared) cleared += p.amount;
    else pending += p.amount;
  }

  const dueAmount = Math.max(0, finalAmount - cleared);

  return {
    packAmounts,
    mealsSubtotal,
    extrasSubtotal,
    mealsDiscount,
    extrasDiscount,
    grandTotal,
    finalAmount,
    paymentsCleared: cleared,
    paymentsPending: pending,
    dueAmount,
  };
}
