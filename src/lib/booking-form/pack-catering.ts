/**
 * Catering toggle rules for the dashboard booking form.
 * The ₹200 floor is shared with the server via @bika/booking-core.
 */

import { MIN_CATERING_RATE_PER_PLATE } from '@bika/booking-core';

export { MIN_CATERING_RATE_PER_PLATE };

export interface PackCateringRateSource {
  ratePerPlate?: number | string | null;
  bookingMenu?: { ratePerPlate?: number | string | null } | null;
}

export interface PackCateringRowFields {
  withCatering: boolean;
  ratePerPlate: string;
  pax: string;
  menuItemIds: string[];
  menuItemNotes: Record<string, string>;
}

function toRateNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === 'string' ? Number(value.trim()) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolvePackRatePerPlate(pack: PackCateringRateSource): number {
  const fromPack = toRateNumber(pack.ratePerPlate);
  if (fromPack > 0) return fromPack;
  return toRateNumber(pack.bookingMenu?.ratePerPlate);
}

/** Stricter load rule: catering on only when persisted rate is at least minimum. */
export function inferWithCateringFromPack(pack: PackCateringRateSource): boolean {
  return resolvePackRatePerPlate(pack) >= MIN_CATERING_RATE_PER_PLATE;
}

export function packRowHasCateringDataToClear(row: PackCateringRowFields): boolean {
  return (
    row.menuItemIds.length > 0 ||
    Object.values(row.menuItemNotes || {}).some((note) => String(note ?? '').trim() !== '') ||
    String(row.pax ?? '').trim() !== '' ||
    String(row.ratePerPlate ?? '').trim() !== ''
  );
}

export function clearedCateringFieldsPatch(): Pick<
  PackCateringRowFields,
  'withCatering' | 'menuItemIds' | 'menuItemNotes' | 'pax' | 'ratePerPlate'
> & { menuPoints: string; templateMenuId: string } {
  return {
    withCatering: false,
    menuItemIds: [],
    menuItemNotes: {},
    menuPoints: '',
    templateMenuId: '',
    pax: '',
    ratePerPlate: '',
  };
}

export function validatePackCateringForSave(row: PackCateringRowFields): string | null {
  if (!row.withCatering) {
    const strayRate = toRateNumber(row.ratePerPlate);
    if (strayRate > 0 && strayRate < MIN_CATERING_RATE_PER_PLATE) {
      return `Rate per plate must be at least ₹${MIN_CATERING_RATE_PER_PLATE}, or turn off catering.`;
    }
    return null;
  }

  const rate = toRateNumber(row.ratePerPlate);
  if (rate < MIN_CATERING_RATE_PER_PLATE) {
    return `Rate per plate must be at least ₹${MIN_CATERING_RATE_PER_PLATE} when catering is on.`;
  }
  return null;
}

export const CATERING_UNTICK_CONFIRM_MESSAGE =
  'Turning off catering will clear this pack\'s menu, guest count, and rate per plate. Continue?';

export interface PackHallRowFields {
  banquetId: string;
  hallIds: string[];
  hallRate: string;
}

export function packRowHasHallDataToClear(row: PackHallRowFields): boolean {
  return (
    String(row.banquetId ?? '').trim() !== '' ||
    (row.hallIds?.length ?? 0) > 0 ||
    String(row.hallRate ?? '').trim() !== ''
  );
}

export function clearedHallFieldsPatch(): Pick<
  PackHallRowFields,
  'banquetId' | 'hallIds' | 'hallRate'
> & { withHall: false } {
  return {
    withHall: false,
    banquetId: '',
    hallIds: [],
    hallRate: '',
  };
}

export const HALL_UNTICK_CONFIRM_MESSAGE =
  'Turning off hall will clear the selected banquet, halls, and hall rate for this pack. Continue?';
