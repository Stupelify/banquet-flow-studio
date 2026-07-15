import type { PaymentRow } from './types';
import type { PackKey } from './constants';

export interface BookingPackRow {
  bookingPackId?: string;
  enabled: boolean;
  withHall: boolean;
  withCatering: boolean;
  banquetId: string;
  hallIds: string[];
  templateMenuId: string;
  templateMenuName?: string;
  menuItemIds: string[];
  menuItemNotes: Record<string, string>;
  startTime: string;
  endTime: string;
  hallRate: string;
  menuPoints: string;
  ratePerPlate: string;
  pax: string;
  amount: string;
  extraPlate?: number;
  extraRateValue?: number;
  extraRate?: string;
  extraAmountValue?: number;
  extraAmount?: string;
  extraCharges?: number;
  setupCost?: string;
}

export interface AdditionalRequirementRow {
  description: string;
  amount: string;
}

export interface BanquetOption {
  id: string;
  name: string;
}

export interface HallOption {
  id: string;
  name: string;
  banquet?: {
    id: string;
    name: string;
  } | null;
}

/** Editable booking form state (moved verbatim from the bookings page). */
export interface BookingFormData {
  customerId: string;
  includeSecondCustomer: boolean;
  secondCustomerId: string;
  referredById: string;
  priority: string;
  functionType: string;
  functionDate: string;
  isPencilBooking: boolean;
  pencilDays: string;
  pencilExpiresAt: string;
  advanceRequired: string;
  dueAmount: string;
  /** Meals net after discount (UI: Net Amount). Not payable grand total. */
  finalDiscountAmount: string;
  finalDiscountPercent: string;
  finalAmount: string;
  notes: string;
  additionalRequirements: AdditionalRequirementRow[];
  packs: Record<PackKey, BookingPackRow>;
  payments: PaymentRow[];
}

export interface BookingFormReadOnlyData {
  primaryCustomerLabel: string;
  secondCustomerLabel: string;
  referredByLabel: string;
  priority: string;
  functionType: string;
  functionDate: string;
  isPencilBooking: boolean;
  pencilExpiresAt: string;
  finalDiscountAmount: string;
  finalDiscountPercent: string;
  finalAmount: string;
  notes: string;
  additionalRequirements: AdditionalRequirementRow[];
  packs: Record<PackKey, BookingPackRow>;
  payments: PaymentRow[];
}

export const EMPTY_PACK_ROW: BookingPackRow = {
  enabled: false,
  withHall: true,
  withCatering: true,
  banquetId: '',
  hallIds: [],
  templateMenuId: '',
  menuItemIds: [],
  menuItemNotes: {},
  startTime: '',
  endTime: '',
  hallRate: '',
  menuPoints: '',
  ratePerPlate: '',
  pax: '',
  amount: '0',
};

export function createEmptyPacks(): Record<PackKey, BookingPackRow> {
  return {
    breakfast: {
      ...EMPTY_PACK_ROW,
      menuItemNotes: {},
      startTime: '08:00',
      endTime: '10:00',
    },
    lunch: {
      ...EMPTY_PACK_ROW,
      menuItemNotes: {},
      startTime: '12:00',
      endTime: '15:00',
    },
    hiTea: {
      ...EMPTY_PACK_ROW,
      menuItemNotes: {},
      startTime: '16:00',
      endTime: '18:00',
    },
    dinner: {
      ...EMPTY_PACK_ROW,
      menuItemNotes: {},
      startTime: '19:00',
      endTime: '22:00',
    },
  };
}
