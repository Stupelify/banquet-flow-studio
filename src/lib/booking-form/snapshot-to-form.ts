import {
  computePackRowAmountFromApiPack,
  formatDiscountPercentDisplay,
  formatRupeeAmount,
  notesMapFromMenuItems,
  roundRupee,
} from '@bika/booking-core';
import { mapBookingPaymentsFromApi } from './payments';
import { normalizePackKey, type PackKey } from './constants';
import {
  createEmptyPacks,
  type BookingFormReadOnlyData,
  type BookingPackRow,
} from './form-types';
import type { MenuItemLike } from './types';
import { calculateMenuPointsFromMap, templateItemsToMenuItemLikes } from './menu-template';
import { packHasHallCharge, readPackHallRate } from './map-api-pack';

export interface HallOption {
  id: string;
  name: string;
  banquet?: { id: string; name: string } | null;
}

export interface TemplateMenuOption {
  id: string;
  name: string;
  items: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      itemType?: { id: string; name: string };
    };
  }>;
}

function formatCustomerLabel(customer?: {
  name?: string | null;
  phone?: string | null;
}): string {
  if (!customer?.name) return '';
  const phone = customer.phone?.trim();
  return phone ? `${customer.name} (${phone})` : customer.name;
}

export function resolveHistorySnapshot(hist: any): any {
  return hist?.snapshotData && typeof hist.snapshotData === 'object' ? hist.snapshotData : hist;
}

export function snapshotToFormReadOnlyData(
  hist: any,
  halls: HallOption[],
  templateMenus: TemplateMenuOption[] = [],
  menuItemById?: Map<string, MenuItemLike>
): BookingFormReadOnlyData {
  const resolved = resolveHistorySnapshot(hist);
  const hallIdSet = new Set(halls.map((hall) => hall.id));
  const bookingHallIds = Array.from(
    new Set(
      (resolved?.halls || hist?.halls || [])
        .map((row: any) => row?.hallId || row?.hall?.id || '')
        .filter((value: string) => value && hallIdSet.has(value))
    )
  );
  const primaryHallId = bookingHallIds[0] || '';
  const primaryHall = halls.find((hall) => hall.id === primaryHallId);
  const menuRows = Array.isArray(resolved?.packs) ? resolved.packs : [];
  const nextPacks = createEmptyPacks();

  menuRows.forEach((pack: any) => {
    const packKey = normalizePackKey(pack?.mealSlot?.name || pack?.packName || '');
    if (!packKey) return;
    const rowMenuItemIds = (pack?.bookingMenu?.items || [])
      .map((entry: any) => entry.itemId || entry.item?.id)
      .filter(Boolean);
    const matchingTemplate = templateMenus.find((template) => {
      const templateIds = (template.items || []).map((entry) => entry.item.id);
      if (templateIds.length !== rowMenuItemIds.length) return false;
      const set = new Set(templateIds);
      return rowMenuItemIds.every((id: string) => set.has(id));
    });
    const packHallIds = Array.isArray(pack?.hallIds)
      ? pack.hallIds
          .map((value: unknown) => `${value ?? ''}`.trim())
          .filter((value: string) => value.length > 0 && hallIdSet.has(value))
      : [];
    const resolvedPackHallIds = packHallIds.length > 0 ? packHallIds : bookingHallIds;
    const firstPackHall = halls.find((hall) => hall.id === resolvedPackHallIds[0]);

    nextPacks[packKey] = {
      bookingPackId: pack.id,
      enabled: true,
      withHall: resolvedPackHallIds.length > 0 || packHasHallCharge(pack),
      withCatering: Number(pack.ratePerPlate ?? 0) > 0 || rowMenuItemIds.length > 0,
      banquetId: firstPackHall?.banquet?.id || primaryHall?.banquet?.id || '',
      hallIds: resolvedPackHallIds,
      templateMenuId: matchingTemplate?.id || '',
      templateMenuName: matchingTemplate?.name || pack?.bookingMenu?.name || '',
      menuItemIds: rowMenuItemIds,
      menuItemNotes: notesMapFromMenuItems(pack?.bookingMenu?.items || []),
      startTime: pack.startTime || nextPacks[packKey].startTime,
      endTime: pack.endTime || nextPacks[packKey].endTime,
      hallRate: readPackHallRate(pack),
      menuPoints:
        pack.menuPoint != null
          ? String(pack.menuPoint)
          : menuItemById && rowMenuItemIds.length > 0
            ? calculateMenuPointsFromMap(rowMenuItemIds, menuItemById)
            : rowMenuItemIds.length > 0
              ? '0'
              : '',
      ratePerPlate: pack.ratePerPlate != null ? String(pack.ratePerPlate) : '',
      pax: pack.packCount != null ? String(pack.packCount) : '',
      amount: '',
      extraPlate: pack.extraPlate,
      extraRateValue: pack.extraRateValue,
      extraRate: pack.extraRate,
      extraAmountValue: pack.extraAmountValue,
      extraAmount: pack.extraAmount,
      extraCharges: pack.extraCharges,
      setupCost: pack.setupCost != null ? String(pack.setupCost) : undefined,
    };
  });

  const additionalItems = Array.isArray(resolved?.additionalItems)
    ? resolved.additionalItems
    : Array.isArray(hist?.additionalItems)
      ? hist.additionalItems
      : [];

  const extrasSubtotal = additionalItems.reduce((sum: number, entry: any) => {
    const amt = Number(entry?.charges ?? entry?.amount ?? 0);
    return sum + (Number.isFinite(amt) ? Math.max(0, amt) : 0);
  }, 0);

  const payable =
    resolved?.finalAmountValue != null
      ? Number(resolved.finalAmountValue)
      : Number(resolved?.finalAmount ?? resolved?.grandTotal ?? hist?.grandTotal ?? 0);

  const mealsNet = roundRupee(Math.max(0, payable - extrasSubtotal));
  const mealsSubtotal = (Object.keys(nextPacks) as PackKey[])
    .filter((key) => nextPacks[key].enabled)
    .reduce((sum, key) => {
      const pack = menuRows.find(
        (row: any) => normalizePackKey(row?.mealSlot?.name || row?.packName || '') === key
      );
      return sum + (pack ? computePackRowAmountFromApiPack(pack) : 0);
    }, 0);

  const discountAmount = roundRupee(
    Number(
      resolved?.discountAmountValue ??
        resolved?.discountAmount ??
        hist?.discountAmount ??
        Math.max(0, mealsSubtotal - mealsNet)
    )
  );
  const discountPercent = formatDiscountPercentDisplay(
    Number(
      resolved?.discountPercentageValue ??
        resolved?.discountPercentage ??
        hist?.discountPercentage ??
        (mealsSubtotal > 0 ? (discountAmount / mealsSubtotal) * 100 : 0)
    )
  );

  const paymentsSource = Array.isArray(hist?.payments)
    ? hist.payments
    : Array.isArray(resolved?.payments)
      ? resolved.payments
      : [];

  return {
    primaryCustomerLabel:
      formatCustomerLabel(resolved?.customer) ||
      formatCustomerLabel(hist?.customer) ||
      resolved?.customerName ||
      '—',
    secondCustomerLabel:
      formatCustomerLabel(resolved?.secondCustomer) ||
      formatCustomerLabel(hist?.secondCustomer) ||
      '—',
    referredByLabel:
      formatCustomerLabel(resolved?.referredBy) ||
      formatCustomerLabel(hist?.referredBy) ||
      '—',
    priority:
      resolved?.priority != null
        ? String(resolved.priority)
        : hist?.priority != null
          ? String(hist.priority)
          : '0',
    functionType: resolved?.functionType || hist?.functionType || '',
    functionDate: (resolved?.functionDate || hist?.functionDate || '').slice(0, 10),
    isPencilBooking: Boolean(resolved?.isPencilBooking ?? hist?.isPencilBooking),
    pencilExpiresAt: (resolved?.pencilExpiresAt || hist?.pencilExpiresAt || '').slice(0, 10),
    finalDiscountAmount: String(discountAmount),
    finalDiscountPercent: String(discountPercent),
    finalAmount: String(mealsNet),
    notes: resolved?.notes || hist?.notes || '',
    additionalRequirements: additionalItems
      .map((entry: any) => ({
        description: entry.description || '',
        amount:
          entry.charges != null && entry.charges !== undefined
            ? String(entry.charges)
            : entry.amount != null
              ? String(entry.amount)
              : '',
      }))
      .filter((entry: { description: string; amount: string }) => entry.description || entry.amount),
    packs: nextPacks,
    payments: mapBookingPaymentsFromApi(paymentsSource),
  };
}

/** Build menu item lookup from snapshot packs + catalog items. */
export function buildMenuItemByIdFromSnapshot(
  resolved: any,
  catalogItems: MenuItemLike[]
): Map<string, MenuItemLike> {
  const map = new Map<string, MenuItemLike>();
  for (const item of catalogItems) {
    map.set(item.id, item);
  }
  const packs = Array.isArray(resolved?.packs) ? resolved.packs : [];
  for (const pack of packs) {
    const likes = templateItemsToMenuItemLikes(pack?.bookingMenu?.items || []);
    for (const item of likes) {
      map.set(item.id, item);
    }
  }
  return map;
}

export function formatPackRowAmount(row: BookingPackRow, apiPack?: any): string {
  if (apiPack) {
    return formatRupeeAmount(computePackRowAmountFromApiPack(apiPack));
  }
  return row.amount || '0';
}
