import { describe, expect, it } from 'vitest';
import {
  computeExtrasSubtotal,
  computeMealsSubtotal,
  computePreDiscountTotal,
  computePayableGrandTotal,
  mapPackLineForSumBooking,
  resolveBookingFinancials,
  sumBookingLines,
  syncBillingAmounts,
} from '../index';
import type { MealPackKey, PackBillingRow } from '../index';

/**
 * The reason this package exists: the booking form (client, row-based) and the
 * save path (server, line-array based) are two views of ONE billing model.
 * These tests build the SAME logical booking in both shapes and assert the
 * money agrees at every stage — meals subtotal, pre-discount total, and the
 * payable grand total after a meals-only discount.
 *
 * Inputs are whole rupees (the real-world case), so the only difference between
 * the two code paths — per-row rounding vs. round-once-at-the-end — cannot
 * introduce a discrepancy. That equivalence is exactly what we are locking in.
 */

interface LogicalPack {
  ratePerPlate: number;
  pax: number;
  setupCost: number;
  extraCharges: number;
  hallRate: number;
}

const packA: LogicalPack = { ratePerPlate: 2000, pax: 400, setupCost: 0, extraCharges: 0, hallRate: 1200000 };
const packB: LogicalPack = { ratePerPlate: 1200, pax: 100, setupCost: 0, extraCharges: 0, hallRate: 0 };

function toClientRow(p: LogicalPack): PackBillingRow {
  return {
    enabled: true,
    withCatering: true,
    withHall: p.hallRate > 0,
    ratePerPlate: String(p.ratePerPlate),
    pax: String(p.pax),
    setupCost: String(p.setupCost),
    extraCharges: p.extraCharges,
    hallRate: String(p.hallRate),
  };
}

function clientPacks(): Record<MealPackKey, PackBillingRow> {
  return {
    breakfast: toClientRow(packA),
    lunch: toClientRow(packB),
    // hiTea / dinner disabled so they contribute nothing.
    hiTea: { ...toClientRow(packB), enabled: false },
    dinner: { ...toClientRow(packB), enabled: false },
  };
}

function serverPacks() {
  return [packA, packB].map((p) =>
    mapPackLineForSumBooking({
      ratePerPlate: p.ratePerPlate,
      packCount: p.pax,
      setupCost: p.setupCost,
      extraCharges: p.extraCharges,
      hallRate: p.hallRate,
    })
  );
}

describe('client/server billing parity', () => {
  it('agrees on the meals subtotal (no extras)', () => {
    const clientMeals = computeMealsSubtotal(clientPacks());
    const serverTotal = sumBookingLines({
      halls: [{ charges: 0 }],
      packs: serverPacks(),
      additionalItems: [],
    });
    expect(clientMeals).toBe(2120000);
    expect(serverTotal).toBe(clientMeals);
  });

  it('agrees on the payable grand total after a 10% meals discount (no extras)', () => {
    const meals = computeMealsSubtotal(clientPacks());
    const clientSynced = syncBillingAmounts('discountPercent', '10', meals);
    const clientPayable = computePayableGrandTotal(Number(clientSynced.finalAmount), 0);

    const server = resolveBookingFinancials({ totalAmount: meals, extrasSubtotal: 0, discountPercentage: 10 });

    expect(clientPayable).toBe(1908000);
    expect(server.grandTotal).toBe(clientPayable);
    expect(server.discountAmount).toBe(Number(clientSynced.finalDiscountAmount));
  });

  it('agrees end-to-end with extra line items and a meals-only discount', () => {
    // One extra worth ₹15,000. On the client the row stores the pre-multiplied
    // amount; on the server it is charges × quantity. Both resolve to 15,000.
    const extrasRows = [{ amount: '15000' }];
    const additionalItems = [{ charges: 5000, quantity: 3 }];

    const packs = clientPacks();
    const meals = computeMealsSubtotal(packs);
    const clientExtras = computeExtrasSubtotal(extrasRows);
    const clientTotal = computePreDiscountTotal(packs, extrasRows);

    const clientSynced = syncBillingAmounts('discountPercent', '10', meals);
    const clientPayable = computePayableGrandTotal(Number(clientSynced.finalAmount), clientExtras);

    const serverTotal = sumBookingLines({ halls: [{ charges: 0 }], packs: serverPacks(), additionalItems });
    const server = resolveBookingFinancials({
      totalAmount: serverTotal,
      extrasSubtotal: clientExtras,
      discountPercentage: 10,
    });

    expect(clientExtras).toBe(15000);
    expect(clientTotal).toBe(serverTotal); // 2,135,000
    expect(server.mealsSubtotal).toBe(meals);
    expect(server.grandTotal).toBe(clientPayable); // 1,923,000
    expect(server.discountAmount).toBe(Number(clientSynced.finalDiscountAmount)); // 212,000
  });
});
