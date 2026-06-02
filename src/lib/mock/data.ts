/**
 * Legacy mock shim — pre-existing screens import simplified shapes from this
 * module. We now back them with the REAL seed (`src/lib/api/data.ts`) so all
 * lists/calendar/payments show production data without rewriting the screens.
 *
 * Phase 3 will migrate screens to import the full `@/lib/api/*` types directly.
 */
import type { Booking, Customer, Enquiry, Hall, MealPack, MealSlotId, Venue } from "./types";
import { mealSlotLabel } from "./types";
import * as A from "@/lib/api/data";

const D = (v: string | Date | null | undefined): Date => {
  if (!v) return new Date();
  return v instanceof Date ? v : new Date(v);
};

const priorityWord = (p: number | null | undefined): Customer["priority"] => {
  if (p === 1) return "VIP";
  if (p === 2) return "High";
  return "Normal";
};

export const VENUES: Venue[] = A.BANQUETS.map((b) => ({
  id: b.id,
  name: b.name,
  city: b.city || b.location || "—",
}));

export const HALLS: Hall[] = A.HALLS.map((h) => ({
  id: h.id,
  venueId: h.banquetId ?? VENUES[0]?.id ?? "",
  name: h.name,
  capacity: h.capacity,
  floatingCapacity: h.floatingCapacity ?? h.capacity,
  floor: h.floorNumber != null ? String(h.floorNumber) : (h.location ?? "G"),
  basePrice: h.basePrice ?? 0,
}));

export const CUSTOMERS: Customer[] = A.CUSTOMERS.map((c) => ({
  id: c.id,
  name: c.name,
  phone: c.phoneE164 || c.phone,
  altPhone: c.alternatePhoneE164 ?? c.alternatePhone ?? undefined,
  email: c.email ?? `${c.name.toLowerCase().replace(/\s+/g, ".")}@—`,
  community: c.caste ?? undefined,
  city: c.city ?? "—",
  dob: c.dateOfBirth ? new Date(c.dateOfBirth) : undefined,
  anniversary: c.anniversary ? new Date(c.anniversary) : undefined,
  occupation: c.occupation ?? undefined,
  company: c.companyName ?? undefined,
  gst: c.gstNumber ?? undefined,
  pan: c.panNumber ?? undefined,
  priority: priorityWord(c.priority),
  rating: Math.min(5, Math.max(0, Number(c.rating ?? 0))),
  visitCount: c.visitCount,
  referredBy: c.referredById ?? undefined,
  referrals: (c.referrals ?? []).map((r) => r.id),
  notes: c.notes ?? undefined,
}));

const statusOf = (b: (typeof A.BOOKINGS)[number]): Booking["status"] => {
  if (b.isQuotation || b.quotation) return "quotation";
  if (b.isPencilBooking) return "pencil";
  const s = b.status;
  if (s === "cancelled") return "cancelled";
  if (s === "completed" || s === "confirmed") return "confirmed";
  return "enquiry";
};

const slotName = (id: string): "Breakfast" | "Lunch" | "Hi-Tea" | "Dinner" => {
  const s = A.MEAL_SLOTS.find((m) => m.id === id)?.name?.toUpperCase() ?? "";
  if (s.includes("BREAK")) return "Breakfast";
  if (s.includes("LUNCH")) return "Lunch";
  if (s.includes("TEA")) return "Hi-Tea";
  return "Dinner";
};

export const BOOKINGS: Booking[] = A.BOOKINGS.map((b) => {
  const start = b.startDateTime ? new Date(b.startDateTime) : D(b.functionDate);
  const end = b.endDateTime ? new Date(b.endDateTime) : new Date(start.getTime() + 4 * 3_600_000);
  const hallIds = (b.halls ?? []).map((h) => h.hallId);
  const packs = (b.packs ?? []).map((p) => ({
    slot: slotName(p.mealSlotId),
    menuName: p.bookingMenu?.name ?? p.packName ?? "Menu",
    plates: p.packCount,
    ratePerPlate: p.ratePerPlate,
    setupCost: p.setupCost,
  }));
  const payments = (b.payments ?? []).map((p) => ({
    id: p.id,
    date: new Date(p.paymentDate),
    method: ((m: string): "Cash" | "UPI" | "Card" | "Cheque" | "Bank Transfer" => {
      switch (m) {
        case "cash": return "Cash";
        case "upi": return "UPI";
        case "card": return "Card";
        case "cheque": return "Cheque";
        case "bank_transfer": return "Bank Transfer";
        default: return "Cash";
      }
    })(p.method),
    ref: p.reference ?? undefined,
    amount: p.amount,
    receivedBy: A.userById.get(p.receivedBy)?.name ?? "—",
  }));
  return {
    id: b.id,
    status: statusOf(b),
    source: "in-app" as const,
    functionName: b.functionName || b.functionType || "Function",
    functionType: b.functionType || "Function",
    customerId: b.customerId,
    start,
    end,
    hallIds: hallIds.length ? hallIds : (HALLS[0] ? [HALLS[0].id] : []),
    expectedGuests: b.expectedGuests,
    confirmedGuests: b.confirmedGuests ?? 0,
    packs,
    hallCharges: (b.halls ?? []).reduce((s, h) => s + h.charges, 0),
    extras: [],
    discount1: b.discountAmount,
    discount2Pct: b.discountPercentage2ndValue ?? 0,
    settlementDiscount: b.settlementDiscountAmount ?? 0,
    taxPct: b.totalBillAmountValue ? Math.round((b.taxAmount / b.totalBillAmountValue) * 100) : 0,
    advanceRequired: b.advanceRequiredValue ?? 0,
    payments,
    notes: b.notes ?? undefined,
    pencilExpiresAt: b.pencilExpiresAt ? new Date(b.pencilExpiresAt) : undefined,
    versions: b.versionNumber,
  };
});

export function bookingTotal(b: Booking) {
  const extras = b.extras.reduce((s, e) => s + e.amount, 0);
  const packsTotal = b.packs.reduce((s, p) => s + p.plates * p.ratePerPlate + p.setupCost, 0);
  const sub = b.hallCharges + packsTotal + extras;
  const afterD1 = sub - b.discount1;
  const afterD2 = afterD1 - (afterD1 * b.discount2Pct) / 100;
  const afterSettle = afterD2 - b.settlementDiscount;
  const tax = (afterSettle * b.taxPct) / 100;
  const grand = afterSettle + tax;
  const received = b.payments.reduce((s, p) => s + p.amount, 0);
  return { sub, afterD1, afterD2, afterSettle, tax, grand, received, balance: Math.max(0, grand - received) };
}

// Derive enquiries from upcoming bookings that look like leads.
export const ENQUIRIES: Enquiry[] = A.BOOKINGS.slice(0, 30).map((b, i): Enquiry => {
  const stages: Enquiry["stage"][] = ["Lead", "Quotation", "Pencil", "Won", "Lost"];
  return {
    id: `EN-${String(i + 1).padStart(4, "0")}`,
    customerId: b.customerId,
    functionType: b.functionType || "Function",
    date: new Date(b.functionDate),
    expectedGuests: b.expectedGuests,
    hallIds: (b.halls ?? []).map((h) => h.hallId),
    stage: stages[i % stages.length],
    estValue: b.grandTotal || b.totalAmount,
    createdAt: new Date(b.createdAt),
    notes: b.notes ?? undefined,
  };
});

const _custMap = new Map(CUSTOMERS.map((c) => [c.id, c]));
const _hallMap = new Map(HALLS.map((h) => [h.id, h]));
const _venueMap = new Map(VENUES.map((v) => [v.id, v]));

export function customerById(id: string): Customer {
  return _custMap.get(id) ?? { ...CUSTOMERS[0], id, name: "—" };
}
export function hallById(id: string): Hall {
  return _hallMap.get(id) ?? { ...HALLS[0], id, name: "—" };
}
export function venueById(id: string): Venue {
  return _venueMap.get(id) ?? { ...VENUES[0], id, name: "—" };
}
