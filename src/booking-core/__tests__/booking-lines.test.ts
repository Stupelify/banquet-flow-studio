import { describe, expect, it } from 'vitest';
import {
  assertFinancialsWithinCeiling,
  computeMealsDiscountCarryForward,
  exceedsBillingCeiling,
  mapPackLineForSumBooking,
  resolveBookingFinancials,
  splitMealsAndExtrasSubtotals,
  sumBookingLines,
} from '../index';

// ---- ported verbatim from server booking-financials.test.ts ----
describe('sumBookingLines', () => {
  it('sums hall, pack, and additional charges correctly', () => {
    const result = sumBookingLines({
      halls: [{ charges: 5000 }, { charges: 3000 }],
      packs: [
        { ratePerPlate: 100, packCount: 50, noOfPack: null, setupCost: 500, extraCharges: 200 },
      ],
      additionalItems: [{ charges: 150, quantity: 4 }],
    });
    expect(result).toBe(14300);
  });

  it('uses zero packCount when pax is zero (no phantom plates)', () => {
    const result = sumBookingLines({
      halls: [],
      packs: [{ ratePerPlate: 200, packCount: 0, noOfPack: 0, setupCost: 0, extraCharges: 0 }],
      additionalItems: [],
    });
    expect(result).toBe(0);
  });

  it('uses pack hallRate once per pack when hall table charges are zero', () => {
    const result = sumBookingLines({
      halls: [{ charges: 0 }],
      packs: [
        { ratePerPlate: 100, packCount: 10, noOfPack: null, setupCost: 0, extraCharges: 0, hallRate: 50000 },
        { ratePerPlate: 0, packCount: 1, noOfPack: null, setupCost: 0, extraCharges: 0, hallRate: 30000 },
      ],
      additionalItems: [],
    });
    expect(result).toBe(1000 + 50000 + 30000);
  });

  it('matches booking form save mapping (catering + hallRate per pack)', () => {
    const packs = [
      { ratePerPlate: 2000, packCount: 400, hallRate: 1200000 },
      { ratePerPlate: 1200, packCount: 100, hallRate: 0 },
    ];
    const total = sumBookingLines({
      halls: [{ charges: 0 }],
      packs: packs.map((p) => mapPackLineForSumBooking(p)),
      additionalItems: [],
    });
    expect(total).toBe(2120000);
    const financials = resolveBookingFinancials({ totalAmount: total, extrasSubtotal: 0, discountPercentage: 10 });
    expect(financials.discountAmount).toBe(212000);
    expect(financials.grandTotal).toBe(1908000);
    expect(financials.finalAmountValue).toBe(1908000);
    expect(financials.grandTotal).toBe(financials.finalAmountValue);
  });

  it('applies discount to meals only; extras added to grand total', () => {
    const financials = resolveBookingFinancials({ totalAmount: 22454, extrasSubtotal: 100, discountPercentage: 10 });
    expect(financials.mealsSubtotal).toBe(22354);
    expect(financials.discountAmount).toBe(2235);
    expect(financials.grandTotal).toBe(20219);
    expect(financials.finalAmountValue).toBe(20219);
    expect(financials.discountPercentage).toBe(10);
  });

  it('nearest-rupee percent discount on 22354 meals with no extras', () => {
    const financials = resolveBookingFinancials({ totalAmount: 22354, extrasSubtotal: 0, discountPercentage: 10 });
    expect(financials.discountAmount).toBe(2235);
    expect(financials.finalAmountValue).toBe(20119);
    expect(financials.grandTotal).toBe(20119);
  });

  it('authoritative payable grand total when finalAmountInput provided', () => {
    const financials = resolveBookingFinancials({
      totalAmount: 22354,
      extrasSubtotal: 0,
      discountPercentage: 10,
      finalAmountInput: 20000,
    });
    expect(financials.finalAmountValue).toBe(20000);
    expect(financials.grandTotal).toBe(20000);
    expect(financials.discountAmount).toBe(2354);
  });

  it('defaults quantity to 1 for null additional items', () => {
    const result = sumBookingLines({
      halls: [],
      packs: [],
      additionalItems: [{ charges: 300, quantity: null }],
    });
    expect(result).toBe(300);
  });
});

describe('resolveBookingFinancials', () => {
  it('caps discount above subtotal and sets grandTotal to zero', () => {
    const result = resolveBookingFinancials({ totalAmount: 10000, extrasSubtotal: 0, discountAmountInput: 15000 });
    expect(result.discountAmount).toBe(10000);
    expect(result.grandTotal).toBe(0);
    expect(result.finalAmountValue).toBe(0);
    expect(result.exceededCeiling).toBe(true);
  });

  it('applies percentage discount on meals only', () => {
    const result = resolveBookingFinancials({
      totalAmount: 11000,
      extrasSubtotal: 1000,
      discountPercentage: 10,
      discountAmountInput: 999,
    });
    expect(result.grandTotal).toBe(10000);
    expect(result.finalAmountValue).toBe(10000);
    expect(result.exceededCeiling).toBe(false);
  });

  it('caps payable above bill total', () => {
    const result = resolveBookingFinancials({ totalAmount: 10000, extrasSubtotal: 0, finalAmountInput: 15000 });
    expect(result.grandTotal).toBe(10000);
    expect(result.finalAmountValue).toBe(10000);
    expect(result.exceededCeiling).toBe(true);
  });

  it('carries meals discount forward through party-over', () => {
    const result = resolveBookingFinancials({ totalAmount: 11000, extrasSubtotal: 1000, carryForwardMealsDiscount: 5000 });
    expect(result.grandTotal).toBe(6000);
    expect(result.finalAmountValue).toBe(6000);
    expect(result.exceededCeiling).toBe(false);
  });

  it('clamps net to zero when carried meals discount exceeds meals subtotal', () => {
    const result = resolveBookingFinancials({ totalAmount: 5000, extrasSubtotal: 1000, carryForwardMealsDiscount: 5000 });
    expect(result.finalAmountValue).toBe(1000);
    expect(result.grandTotal).toBe(1000);
  });

  it('exceeds ceiling only when rounded rupee is above total', () => {
    expect(exceedsBillingCeiling(10000, 10000)).toBe(false);
    expect(exceedsBillingCeiling(10001, 10000)).toBe(true);
  });
});

describe('computeMealsDiscountCarryForward', () => {
  it('returns meals subtotal minus meals net from payable grand total', () => {
    const carry = computeMealsDiscountCarryForward({ totalAmount: 11000, extrasSubtotal: 1000, payableGrandTotal: 6000 });
    expect(carry).toBe(5000);
  });
});

// ---- added edge cases ----
describe('splitMealsAndExtrasSubtotals / assertFinancialsWithinCeiling', () => {
  it('splits total into meals and extras', () => {
    const split = splitMealsAndExtrasSubtotals({
      halls: [{ charges: 0 }],
      packs: [{ ratePerPlate: 100, packCount: 10, noOfPack: null, setupCost: 0, extraCharges: 0, hallRate: 50000 }],
      additionalItems: [{ charges: 200, quantity: 1 }],
    });
    expect(split).toEqual({ mealsSubtotal: 51000, extrasSubtotal: 200, totalAmount: 51200 });
  });

  it('throws when payable exceeds the bill, passes when within', () => {
    expect(() =>
      assertFinancialsWithinCeiling({ totalAmount: 10000, grandTotal: 10001, finalAmountValue: 10001 })
    ).toThrow('BOOKING_NET_EXCEEDS_BILL');
    expect(() =>
      assertFinancialsWithinCeiling({ totalAmount: 10000, grandTotal: 10000, finalAmountValue: 10000 })
    ).not.toThrow();
  });
});
