/**
 * Module-scope types, constants, and pure helpers for the bookings route.
 * Moved verbatim from page.tsx — no behavior changes.
 */
import type { PackKey } from '@/lib/booking-form/constants';
import type { BookingFormData } from '@/lib/booking-form/form-types';
import { resolveDueAmount, type BillingAmountSyncMode } from '@bika/booking-core';
import { DEFAULT_PHONE_COUNTRY_ISO } from '@/lib/customerFormOptions';
import { formatINR } from '@/lib/format';

export interface Booking {
  id: string;
  bookingNumber?: string | null;
  customerId?: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  expectedGuests: number;
  status: string;
  isQuotation: boolean;
  isPencilBooking?: boolean;
  pencilExpiresAt?: string | null;
  grandTotal: number;
  dueAmountValue?: number | null;
  dueAmount?: string | number | null;
  paymentReceivedAmountValue?: number | null;
  customer: {
    name: string;
    phone: string;
    email?: string | null;
  };
  _count?: {
    payments: number;
    packs: number;
  };
  halls?: Array<{
    hall?: { id: string; name: string; banquet?: { id: string; name: string } | null } | null;
  }>;
}

export interface BookingMenuPackOption {
  id: string;
  name: string;
  itemCount: number;
}

export interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  phoneCountryCode?: string | null;
  alterPhone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  priority?: number | null;
}

export type CustomerSearchField = 'primary' | 'second' | 'referred';

export interface CustomerSearchInputState {
  primary: string;
  second: string;
  referred: string;
}

export interface ItemOption {
  id: string;
  name: string;
  point?: number | null;
  points?: number | null;
  itemType?: {
    id: string;
    name: string;
    order?: number | null;
    displayOrder?: number | null;
  };
}

export interface TemplateMenuOption {
  id: string;
  name: string;
  items: Array<{
    id: string;
    item: {
      id: string;
      name: string;
      itemType?: {
        id: string;
        name: string;
        order?: number | null;
        displayOrder?: number | null;
      };
    };
  }>;
}

export type AmountSyncMode = BillingAmountSyncMode;

export interface InlineCustomerFormData {
  name: string;
  phoneCountryIso: string;
  phone: string;
  alterPhoneCountryIso: string;
  alterPhone: string;
  whatsappCountryIso: string;
  whatsappNumber: string;
  email: string;
  caste: string;
  country: string;
  pincode: string;
  city: string;
  state: string;
  street1: string;
  street2: string;
  facebookProfile: string;
  instagramHandle: string;
  twitter: string;
  linkedin: string;
  referredById: string;
  priority: string;
  rating: string;
  notes: string;
}

export const initialFormData: BookingFormData = {
  customerId: '',
  includeSecondCustomer: false,
  secondCustomerId: '',
  referredById: '',
  priority: '0',
  functionType: '',
  functionDate: '',
  isPencilBooking: false,
  pencilDays: '3',
  pencilExpiresAt: '',
  advanceRequired: '0',
  dueAmount: '0',
  finalDiscountAmount: '0',
  finalDiscountPercent: '0',
  finalAmount: '0',
  notes: '',
  additionalRequirements: [],
  packs: {
    breakfast: {
      enabled: false,
      withHall: true,
      withCatering: true,
      banquetId: '',
      hallIds: [],
      templateMenuId: '',
      menuItemIds: [],
      menuItemNotes: {},
      startTime: '08:00',
      endTime: '10:00',
      hallRate: '',
      menuPoints: '',
      ratePerPlate: '',
      pax: '',
      amount: '0',
    },
    lunch: {
      enabled: false,
      withHall: true,
      withCatering: true,
      banquetId: '',
      hallIds: [],
      templateMenuId: '',
      menuItemIds: [],
      menuItemNotes: {},
      startTime: '12:00',
      endTime: '15:00',
      hallRate: '',
      menuPoints: '',
      ratePerPlate: '',
      pax: '',
      amount: '0',
    },
    hiTea: {
      enabled: false,
      withHall: true,
      withCatering: true,
      banquetId: '',
      hallIds: [],
      templateMenuId: '',
      menuItemIds: [],
      menuItemNotes: {},
      startTime: '16:00',
      endTime: '18:00',
      hallRate: '',
      menuPoints: '',
      ratePerPlate: '',
      pax: '',
      amount: '0',
    },
    dinner: {
      enabled: false,
      withHall: true,
      withCatering: true,
      banquetId: '',
      hallIds: [],
      templateMenuId: '',
      menuItemIds: [],
      menuItemNotes: {},
      startTime: '19:00',
      endTime: '22:00',
      hallRate: '',
      menuPoints: '',
      ratePerPlate: '',
      pax: '',
      amount: '0',
    },
  },
  payments: [],
};

export const initialInlineCustomerFormData: InlineCustomerFormData = {
  name: '',
  phoneCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  phone: '',
  alterPhoneCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  alterPhone: '',
  whatsappCountryIso: DEFAULT_PHONE_COUNTRY_ISO,
  whatsappNumber: '',
  email: '',
  caste: '',
  country: 'India',
  pincode: '',
  city: '',
  state: '',
  street1: '',
  street2: '',
  facebookProfile: '',
  instagramHandle: '',
  twitter: '',
  linkedin: '',
  referredById: '',
  priority: '3',
  rating: '0',
  notes: '',
};

export const PACK_LABELS: Record<PackKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  hiTea: 'Hi-Tea',
  dinner: 'Dinner',
};


export const FUNCTION_TYPE_OPTIONS = [
  'Marriage',
  'Tilak/Sangeet',
  'Reception',
  'Engagement/Ring Ceremony',
  'Roka',
  'Kirtan/Mangal Path',
  'Anniversary',
  'Birthday',
  'Mayra/Bhaat',
  'Jalwa Party',
  'Other',
] as const;

export const LONGEST_FUNCTION_TYPE_OPTION = FUNCTION_TYPE_OPTIONS.reduce(
  (longest, option) => (option.length > longest.length ? option : longest),
  FUNCTION_TYPE_OPTIONS[0]
);

/** Typical primary display: name (~20) + phone (~12) + " ()" */
export const PRIMARY_CUSTOMER_FIELD_CH = 20 + 12 + 4;

export const initialColumnSearch = {
  functionName: '',
  customer: '',
  dateFrom: '',
  dateTo: '',
  // Hall column filter: banquetId = venue, hallIds = comma-joined hall ids
  // within that venue (empty = all halls of the venue).
  banquetId: '',
  hallIds: '',
  expectedGuests: '',
  status: '',
  grandTotal: '',
};

export const BOOKINGS_PAGE_SIZE = 75;

// Delegates to the canonical formatter (lakh/crore, trimmed decimals) so
// every existing call site gets it for free without touching each one.
export function formatInrCompact(amount: number): string {
  return formatINR(amount || 0, { compact: true });
}

export function pencilExpiryDays(pencilExpiresAt?: string | null): number | null {
  if (!pencilExpiresAt) return null;
  const expires = new Date(pencilExpiresAt);
  if (Number.isNaN(expires.getTime())) return null;
  return Math.ceil((expires.getTime() - Date.now()) / 86400000);
}

export interface BookingSavedView {
  id: string;
  label: string;
  fn: ((booking: Booking) => boolean) | null;
}

// View ids and their `fn` predicates MUST stay in sync with the server `view`
// param (server/src/controllers/booking.read.ts). Server pagination filters
// there; `fn` is only used by the legacy client-side path.
export const BOOKING_SAVED_VIEWS: BookingSavedView[] = [
  { id: 'all', label: 'All', fn: null },
  {
    id: 'balance',
    label: 'Balance due',
    // "Outstanding" definition shared with the Payments badge: confirmed or
    // pending bookings that still owe money.
    fn: (b) => resolveDueAmount(b) > 0 && ['confirmed', 'pending'].includes(b.status),
  },
  {
    id: 'pencils',
    label: 'Pencils expiring',
    fn: (b) => b.status === 'pencil' && Boolean(b.pencilExpiresAt),
  },
  {
    id: 'unconfirmed',
    label: 'Unconfirmed',
    fn: (b) => ['pencil', 'quotation', 'enquiry'].includes(b.status),
  },
  { id: 'confirmed', label: 'Confirmed', fn: (b) => b.status === 'confirmed' },
  {
    id: 'high',
    label: 'High value · >₹10L',
    fn: (b) => (b.grandTotal || 0) >= 1000000,
  },
];

export function formatCustomerLabel(customer?: {
  name?: string | null;
  phone?: string | null;
} | null): string {
  if (!customer) return '';
  const name = (customer.name || '').trim();
  const phone = (customer.phone || '').trim();
  if (!name && !phone) return '';
  if (!phone) return name;
  if (!name) return phone;
  return `${name} (${phone})`;
}

export function compareCustomersByName(a: CustomerOption, b: CustomerOption): number {
  const aName = (a.name || '').trim();
  const bName = (b.name || '').trim();
  const nameCompare = aName.localeCompare(bName, undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  if (nameCompare !== 0) return nameCompare;

  const phoneCompare = (a.phone || '').localeCompare(b.phone || '', undefined, {
    sensitivity: 'base',
    numeric: true,
  });
  if (phoneCompare !== 0) return phoneCompare;

  return a.id.localeCompare(b.id);
}

export function computePencilExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

