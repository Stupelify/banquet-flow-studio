export type BookingStatus = "confirmed" | "pencil" | "quotation" | "enquiry" | "cancelled";
export type EventSource = "in-app" | "google";

/** Canonical Bika meal-slot enum — stored lowercase, displayed via `mealSlotLabel()`. */
export type MealSlotId = "breakfast" | "lunch" | "hi-tea" | "dinner";
export const MEAL_SLOT_IDS: MealSlotId[] = ["breakfast", "lunch", "hi-tea", "dinner"];

/** Legacy display alias kept for screens that read pack.slot directly. */
export type MealSlotDisplay = "Breakfast" | "Lunch" | "Hi-Tea" | "Dinner";

export function mealSlotLabel(s: MealSlotId): MealSlotDisplay {
  switch (s) {
    case "breakfast": return "Breakfast";
    case "lunch":     return "Lunch";
    case "hi-tea":    return "Hi-Tea";
    case "dinner":    return "Dinner";
  }
}

/** Legacy display alias kept for screens that read pack.slot directly. */
export type MealSlotDisplay = "Breakfast" | "Lunch" | "Hi-Tea" | "Dinner";

export type Venue = { id: string; name: string; city: string };
export type Hall = {
  id: string;
  venueId: string;
  name: string;
  capacity: number;
  floatingCapacity: number;
  floor: string;
  basePrice: number;
};

export type MenuItemRow = { itemId: string; quantity: number };

/**
 * A meal pack. A booking can have multiple, one per meal slot.
 * Canonical id is `mealSlot` (lowercase). `slot` is the capitalized display
 * mirror kept for legacy callers.
 */
export type MealPack = {
  mealSlot: MealSlotId;
  /** Display alias of mealSlot, e.g. "Breakfast". */
  slot: MealSlotDisplay;
  packName?: string;
  menuName: string;
  templateMenuId?: string;
  /** Guest count for THIS meal (= Bika packCount / PAX). */
  plates: number;
  ratePerPlate: number;
  setupCost: number;
  /** Per-pack extra charges. */
  extraCharges: number;
  /** Hall rate added ONCE per pack (never multiplied by hall count). */
  hallRate: number;
  startTime?: string; // "HH:mm"
  endTime?: string;
  items: MenuItemRow[];
  notes?: string;
};

export type AdditionalItem = {
  description: string;
  charges: number;
  quantity: number;
};

export type HallSelection = { hallId: string; charges: number };

export type Payment = {
  id: string;
  date: Date;
  method: "Cash" | "UPI" | "Card" | "Cheque" | "Bank Transfer";
  ref?: string;
  amount: number;
  receivedBy: string;
  clearingDate?: Date | null;
};

export type Booking = {
  id: string;
  status: BookingStatus;
  source: EventSource;
  functionName: string;
  functionType: string;
  customerId: string;
  secondCustomerId?: string;
  referredById?: string;
  start: Date;
  end: Date;

  /** Legacy convenience: ids of selected halls. Mirrors `halls[].hallId`. */
  hallIds: string[];
  /** Bika-faithful per-hall selections with `charges`. */
  halls: HallSelection[];

  expectedGuests: number;
  confirmedGuests: number;

  packs: MealPack[];

  /** Sum of `halls[].charges`. Kept for legacy money-stack display. */
  hallCharges: number;

  additionalItems: AdditionalItem[];
  /** Legacy flat extras list derived from additionalItems. */
  extras: { label: string; amount: number }[];

  /** Meals discount: flat amount OR percentage (mutually exclusive). */
  discountAmount: number;
  discountPercentage: number;
  /** Extras / second discount. */
  discountAmount2nd: number;
  discountPercentage2nd: number;

  /** Legacy aliases retained for existing money-stack code. */
  discount1: number;     // = discountAmount
  discount2Pct: number;  // = discountPercentage2nd

  settlementDiscount: number;
  taxPct: number;
  advanceRequired: number;

  isQuotation: boolean;
  isPencilBooking: boolean;
  pencilExpiresAt?: Date;

  payments: Payment[];
  notes?: string;
  internalNotes?: string;
  versions: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email: string;
  community?: string;
  city: string;
  dob?: Date;
  anniversary?: Date;
  occupation?: string;
  company?: string;
  gst?: string;
  pan?: string;
  priority: "VIP" | "High" | "Normal";
  rating: number;
  visitCount: number;
  referredBy?: string;
  referrals: string[];
  notes?: string;
};

export type Enquiry = {
  id: string;
  customerId: string;
  functionType: string;
  date: Date;
  expectedGuests: number;
  hallIds: string[];
  stage: "Lead" | "Quotation" | "Pencil" | "Won" | "Lost";
  estValue: number;
  createdAt: Date;
  notes?: string;
};
