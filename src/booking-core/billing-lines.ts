/**
 * Booking form line totals — row amounts and pre-discount total (row-based view).
 * Hall rate is once per meal pack (never × hallIds.length).
 * Server parity: pack hallRate in sumBookingLines (booking-lines.ts); booking_halls
 * charges are association-only (0).
 */

import {
  mapPackLineForSumBooking,
  splitMealsAndExtrasSubtotals,
  sumBookingLines,
  type AdditionalLine,
  type HallLine,
  type PackLine,
} from './booking-lines';
import { roundRupee } from './money';

export const PACK_KEYS = ['breakfast', 'lunch', 'hiTea', 'dinner'] as const;
export type MealPackKey = (typeof PACK_KEYS)[number];

export interface PackBillingRow {
  enabled: boolean;
  withCatering: boolean;
  withHall: boolean;
  ratePerPlate: string;
  pax: string;
  setupCost?: string;
  extraCharges?: number;
  hallRate: string;
}

function toMoney(value: string | number | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

/** Map form pack row → persistence pack line (single billing engine adapter). */
export function formPackRowToPackLine(row: PackBillingRow): PackLine {
  if (!row.enabled) {
    return {
      ratePerPlate: 0,
      packCount: 0,
      noOfPack: 0,
      setupCost: 0,
      extraCharges: 0,
      hallRate: 0,
    };
  }
  return mapPackLineForSumBooking({
    ratePerPlate: row.ratePerPlate,
    packCount: toMoney(row.pax),
    noOfPack: toMoney(row.pax),
    setupCost: row.setupCost,
    extraCharges: row.extraCharges,
    hallRate: row.withHall ? row.hallRate : 0,
  });
}

/** Form state → line-array input for sumBookingLines / resolveBookingFinancials. */
export function formPacksToSumBookingInput(
  packs: Record<MealPackKey, PackBillingRow>,
  additionalRequirements: Array<{ amount: string }>,
  halls: HallLine[] = [{ charges: 0 }]
): {
  halls: HallLine[];
  packs: PackLine[];
  additionalItems: AdditionalLine[];
} {
  return {
    halls,
    packs: PACK_KEYS.map((key) => formPackRowToPackLine(packs[key])),
    additionalItems: additionalRequirements.map((row) => ({
      charges: toMoney(row.amount),
      quantity: 1,
    })),
  };
}

export function computePackCateringAmount(row: PackBillingRow): number {
  if (!row.enabled) return 0;
  const ratePerPlate = row.withCatering ? toMoney(row.ratePerPlate) : 0;
  const pax = row.withCatering ? toMoney(row.pax) : 0;
  const setupCost = toMoney(row.setupCost || '0');
  const extraCharges = Math.max(0, Number(row.extraCharges || 0));
  return ratePerPlate * pax + setupCost + extraCharges;
}

export function computePackHallAmount(row: PackBillingRow): number {
  if (!row.enabled || !row.withHall) return 0;
  return toMoney(row.hallRate);
}

/** Full meal row amount shown in grid and included in meals subtotal. */
export function computePackRowAmount(row: PackBillingRow): number {
  if (!row.enabled) return 0;
  return roundRupee(computePackCateringAmount(row) + computePackHallAmount(row));
}

export function computeMealsSubtotal(
  packs: Record<MealPackKey, PackBillingRow>
): number {
  const { mealsSubtotal } = splitMealsAndExtrasSubtotals(
    formPacksToSumBookingInput(packs, [])
  );
  return mealsSubtotal;
}

export function computeExtrasSubtotal(
  rows: Array<{ amount: string }>
): number {
  const { extrasSubtotal } = splitMealsAndExtrasSubtotals(
    formPacksToSumBookingInput(
      {
        breakfast: disabledPackRow(),
        lunch: disabledPackRow(),
        hiTea: disabledPackRow(),
        dinner: disabledPackRow(),
      },
      rows
    )
  );
  return extrasSubtotal;
}

export function computePreDiscountTotal(
  packs: Record<MealPackKey, PackBillingRow>,
  additionalRequirements: Array<{ amount: string }>
): number {
  return sumBookingLines(formPacksToSumBookingInput(packs, additionalRequirements));
}

function disabledPackRow(): PackBillingRow {
  return {
    enabled: false,
    withCatering: false,
    withHall: false,
    ratePerPlate: '0',
    pax: '0',
    setupCost: '0',
    hallRate: '0',
  };
}

export interface BookingHallPayloadRow {
  hallId: string;
  charges: number;
}

/** All unique halls for availability — monetary hall charge lives on packs, not here. */
export function buildBookingHallRows(
  entries: Array<{ validHallIds: string[] }>
): BookingHallPayloadRow[] {
  const seen = new Set<string>();
  const rows: BookingHallPayloadRow[] = [];
  for (const { validHallIds } of entries) {
    for (const hallId of validHallIds) {
      if (!hallId || seen.has(hallId)) continue;
      seen.add(hallId);
      rows.push({ hallId, charges: 0 });
    }
  }
  return rows;
}

/** Sum pack hall rates for server payload mapping (enabled packs with hall). */
export function sumPackHallRates(rows: PackBillingRow[]): number {
  return rows.reduce((sum, row) => sum + computePackHallAmount(row), 0);
}

/** History / read-only pack rows from API. */
export function computePackRowAmountFromApiPack(pack: {
  ratePerPlate?: number | string | null;
  packCount?: number | null;
  noOfPack?: number | null;
  setupCost?: number | string | null;
  extraCharges?: number | null;
  hallRate?: number | string | null;
  hallRateValue?: number | null;
}): number {
  const hallRate = toMoney(pack.hallRateValue ?? pack.hallRate ?? 0);
  const ratePerPlate = toMoney(pack.ratePerPlate ?? 0);
  const pax = toMoney(pack.packCount ?? pack.noOfPack ?? 0);
  const setupCost = toMoney(pack.setupCost ?? 0);
  const extraCharges = Math.max(0, Number(pack.extraCharges ?? 0));
  return roundRupee(hallRate + ratePerPlate * pax + setupCost + extraCharges);
}
