/**
 * Real seed data loader — hydrates the bundled `seed.json` (exported from the
 * production Postgres) into typed arrays matching `./types.ts`. All Express/
 * Prisma response shapes are preserved.
 */
import seed from "./seed.json";
import type {
  AuditLog, Banquet, Booking, BookingHall, BookingMenu, BookingMenuItem,
  BookingPack, BookingPayment, Customer, Hall, Item, ItemType, MealSlot,
  Permission, Role, TemplateMenu, TemplateMenuItem, User, UserRole,
} from "./types";

type Raw = Record<string, unknown>;
const arr = (k: string): Raw[] => (seed as unknown as Record<string, Raw[]>)[k] ?? [];

const num = (v: unknown, d = 0): number => {
  if (v == null || v === "") return d;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : d;
};
const str = (v: unknown): string | null => (v == null || v === "" ? null : String(v));
const bool = (v: unknown): boolean => v === true || v === "t" || v === "true";
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

const isoize = (v: unknown): string => {
  if (!v) return new Date(0).toISOString();
  const s = String(v).replace(" ", "T");
  const d = new Date(s.endsWith("Z") ? s : s + "Z");
  return Number.isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
};
const isoMaybe = (v: unknown): string | null => (v == null || v === "" ? null : isoize(v));

/* ───────────────────────────── ENTITIES ─────────────────────────────── */

export const BANQUETS: Banquet[] = arr("banquets").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  location: String(r.location ?? ""),
  address: str(r.address),
  city: str(r.city),
  state: str(r.state),
  pincode: str(r.pincode),
  phone: str(r.phone),
  email: str(r.email),
  facilities: str(r.facilities),
  description: str(r.description),
  isActive: bool(r.isActive),
  createdAt: isoize(r.createdAt),
  updatedAt: isoize(r.updatedAt),
}));

const banquetById = new Map(BANQUETS.map((b) => [b.id, b]));

export const HALLS: Hall[] = arr("halls").map((r) => {
  const banquetId = str(r.banquetId);
  return {
    id: String(r.id),
    name: String(r.name ?? "Hall"),
    banquetId,
    location: str(r.location),
    rate: str(r.rate),
    capacity: num(r.capacity),
    floatingCapacity: r.floatingCapacity == null || r.floatingCapacity === "" ? null : num(r.floatingCapacity),
    area: r.area == null || r.area === "" ? null : num(r.area),
    photo: str(r.photo),
    order: r.order == null ? null : num(r.order),
    floorNumber: r.floorNumber == null || r.floorNumber === "" ? null : num(r.floorNumber),
    amenities: str(r.amenities),
    description: str(r.description),
    basePrice: r.basePrice == null ? null : num(r.basePrice),
    images: list(r.images),
    isActive: bool(r.isActive),
    createdAt: isoize(r.createdAt),
    updatedAt: isoize(r.updatedAt),
    banquet: banquetId && banquetById.has(banquetId)
      ? { id: banquetId, name: banquetById.get(banquetId)!.name }
      : null,
  };
});
const hallById = new Map(HALLS.map((h) => [h.id, h]));

export const MEAL_SLOTS: MealSlot[] = arr("meal_slots").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
  startTime: String(r.startTime ?? ""),
  endTime: String(r.endTime ?? ""),
  displayOrder: num(r.displayOrder),
  isActive: bool(r.isActive),
}));

export const ITEM_TYPES: ItemType[] = arr("item_types").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  order: num(r.order),
  description: str(r.description),
  displayOrder: num(r.displayOrder),
  isActive: bool(r.isActive),
}));
const itemTypeById = new Map(ITEM_TYPES.map((t) => [t.id, t]));

export const ITEMS: Item[] = arr("items").map((r) => {
  const itemTypeId = String(r.itemTypeId ?? "");
  const t = itemTypeById.get(itemTypeId);
  return {
    id: String(r.id),
    itemTypeId,
    name: String(r.name ?? ""),
    description: str(r.description),
    photo: str(r.photo),
    setupCost: str(r.setupCost),
    itemCost: str(r.itemCost),
    point: r.point == null || r.point === "" ? null : num(r.point),
    cost: num(r.cost),
    points: num(r.points),
    isVeg: bool(r.isVeg),
    isActive: bool(r.isActive),
    itemType: t ? { id: t.id, name: t.name } : undefined,
  };
});

const tmenuItemsByMenu = new Map<string, TemplateMenuItem[]>();
arr("template_menu_items").forEach((r) => {
  const id = String(r.templateMenuId);
  const list = tmenuItemsByMenu.get(id) ?? [];
  list.push({
    id: String(r.id),
    templateMenuId: id,
    itemId: String(r.itemId),
    quantity: num(r.quantity, 1),
  });
  tmenuItemsByMenu.set(id, list);
});

export const TEMPLATE_MENUS: TemplateMenu[] = arr("template_menus").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
  setupCost: num(r.setupCost),
  ratePerPlate: num(r.ratePerPlate),
  category: str(r.category),
  isActive: bool(r.isActive),
  items: tmenuItemsByMenu.get(String(r.id)) ?? [],
}));

const bmenuItemsByMenu = new Map<string, BookingMenuItem[]>();
arr("booking_menu_items").forEach((r) => {
  const id = String(r.bookingMenuId);
  const list = bmenuItemsByMenu.get(id) ?? [];
  list.push({
    id: String(r.id),
    bookingMenuId: id,
    itemId: String(r.itemId),
    quantity: num(r.quantity, 1),
  });
  bmenuItemsByMenu.set(id, list);
});

export const BOOKING_MENUS: BookingMenu[] = arr("booking_menus").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
  mealSlotId: str(r.mealSlotId),
  setupCost: num(r.setupCost),
  ratePerPlate: num(r.ratePerPlate),
  items: bmenuItemsByMenu.get(String(r.id)) ?? [],
}));
const bookingMenuById = new Map(BOOKING_MENUS.map((m) => [m.id, m]));

/* ───────────────────────────── CUSTOMERS ─────────────────────────────── */

export const CUSTOMERS: Customer[] = arr("customers").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? "—"),
  phone: String(r.phone ?? ""),
  phoneE164: str(r.phoneE164),
  phoneCountryCode: str(r.phoneCountryCode),
  phoneVerified: bool(r.phoneVerified),
  email: str(r.email),
  alternatePhone: str(r.alternatePhone) ?? str(r.alterPhone),
  alternatePhoneE164: str(r.alternatePhoneE164),
  alterPhoneCountryCode: str(r.alterPhoneCountryCode),
  whatsapp: str(r.whatsapp) ?? str(r.whatsappNumber),
  whatsappE164: str(r.whatsappE164),
  isWhatsappSameAsPhone: r.isWhatsappSameAsPhone == null ? null : bool(r.isWhatsappSameAsPhone),
  address: str(r.address),
  country: str(r.country),
  street1: str(r.street1),
  street2: str(r.street2),
  city: str(r.city),
  state: str(r.state),
  pincode: str(r.pincode),
  priority: r.priority == null || r.priority === "" ? null : num(r.priority),
  caste: str(r.caste),
  rating: str(r.rating),
  visitCount: num(r.visitCount),
  dateOfBirth: isoMaybe(r.dateOfBirth),
  anniversary: isoMaybe(r.anniversary),
  occupation: str(r.occupation),
  companyName: str(r.companyName),
  gstNumber: str(r.gstNumber),
  panNumber: str(r.panNumber),
  aadharNumber: str(r.aadharNumber),
  instagramHandle: str(r.instagramHandle),
  twitter: str(r.twitter),
  linkedin: str(r.linkedin),
  facebookProfile: str(r.facebookProfile),
  isVerified: bool(r.isVerified),
  referredById: str(r.referredById),
  notes: str(r.notes),
  createdAt: isoize(r.createdAt),
  updatedAt: isoize(r.updatedAt),
}));
export const customerById = new Map(CUSTOMERS.map((c) => [c.id, c]));

// referral back-pointers (Pick<>)
CUSTOMERS.forEach((c) => {
  if (c.referredById) {
    const ref = customerById.get(c.referredById);
    if (ref) c.referredBy = { id: ref.id, name: ref.name, phone: ref.phone };
  }
});
const refMap = new Map<string, { id: string; name: string; phone: string }[]>();
CUSTOMERS.forEach((c) => {
  if (c.referredById) {
    const list = refMap.get(c.referredById) ?? [];
    list.push({ id: c.id, name: c.name, phone: c.phone });
    refMap.set(c.referredById, list);
  }
});
CUSTOMERS.forEach((c) => { c.referrals = refMap.get(c.id) ?? []; });

/* ───────────────────────────── BOOKINGS ─────────────────────────────── */

const bhByBooking = new Map<string, BookingHall[]>();
arr("booking_halls").forEach((r) => {
  const bid = String(r.bookingId);
  const hid = String(r.hallId);
  const h = hallById.get(hid);
  const row: BookingHall = {
    id: String(r.id),
    bookingId: bid,
    hallId: hid,
    charges: num(r.charges),
    hall: h
      ? {
          id: h.id, name: h.name, capacity: h.capacity, banquetId: h.banquetId,
          banquet: h.banquet ? { id: h.banquet.id, name: h.banquet.name } : undefined,
        }
      : undefined,
  };
  const list = bhByBooking.get(bid) ?? [];
  list.push(row);
  bhByBooking.set(bid, list);
});

const bpacksByBooking = new Map<string, BookingPack[]>();
arr("booking_packs").forEach((r) => {
  const bid = String(r.bookingId);
  const menu = bookingMenuById.get(String(r.bookingMenuId));
  const row: BookingPack = {
    id: String(r.id),
    bookingId: bid,
    mealSlotId: String(r.mealSlotId ?? ""),
    bookingMenuId: String(r.bookingMenuId ?? ""),
    noOfPack: r.noOfPack == null || r.noOfPack === "" ? null : num(r.noOfPack),
    packName: String(r.packName ?? ""),
    packCount: num(r.packCount, 1),
    hallIds: list(r.hallIds),
    hallName: str(r.hallName),
    ratePerPlate: num(r.ratePerPlate),
    setupCost: num(r.setupCost),
    startTime: str(r.startTime),
    endTime: str(r.endTime),
    startDateTime: isoMaybe(r.startDateTime),
    endDateTime: isoMaybe(r.endDateTime),
    extraPlate: r.extraPlate == null || r.extraPlate === "" ? null : num(r.extraPlate),
    extraRate: str(r.extraRate),
    extraRateValue: r.extraRateValue == null || r.extraRateValue === "" ? null : num(r.extraRateValue),
    extraAmount: str(r.extraAmount),
    extraAmountValue: r.extraAmountValue == null || r.extraAmountValue === "" ? null : num(r.extraAmountValue),
    menuPoint: r.menuPoint == null || r.menuPoint === "" ? null : num(r.menuPoint),
    hallRate: str(r.hallRate),
    hallRateValue: r.hallRateValue == null || r.hallRateValue === "" ? null : num(r.hallRateValue),
    boardToRead: str(r.boardToRead),
    extraCharges: num(r.extraCharges),
    timeSlot: str(r.timeSlot),
    tags: list(r.tags),
    notes: str(r.notes),
    bookingMenu: menu,
  };
  const list2 = bpacksByBooking.get(bid) ?? [];
  list2.push(row);
  bpacksByBooking.set(bid, list2);
});

const paymentsByBooking = new Map<string, BookingPayment[]>();
arr("booking_payments").forEach((r) => {
  const bid = String(r.bookingId);
  const row: BookingPayment = {
    id: String(r.id),
    bookingId: bid,
    receivedBy: String(r.receivedBy ?? ""),
    amount: num(r.amount),
    method: (String(r.method ?? "cash").toLowerCase() as BookingPayment["method"]) || "cash",
    paymentMethod: str(r.paymentMethod),
    reference: str(r.reference),
    narration: str(r.narration),
    paymentDate: isoize(r.paymentDate),
    clearingDate: isoMaybe(r.clearingDate),
    createdAt: isoize(r.createdAt),
  };
  const list = paymentsByBooking.get(bid) ?? [];
  list.push(row);
  paymentsByBooking.set(bid, list);
});

export const BOOKINGS: Booking[] = arr("bookings").map((r) => {
  const id = String(r.id);
  const customer = customerById.get(String(r.customerId));
  return {
    id,
    customerId: String(r.customerId ?? ""),
    secondCustomerId: str(r.secondCustomerId),
    referredById: str(r.referredById),
    rating: r.rating == null || r.rating === "" ? null : num(r.rating),
    secondRating: r.secondRating == null || r.secondRating === "" ? null : num(r.secondRating),
    priority: r.priority == null || r.priority === "" ? null : num(r.priority),
    secondPriority: r.secondPriority == null || r.secondPriority === "" ? null : num(r.secondPriority),

    functionName: String(r.functionName ?? ""),
    functionType: String(r.functionType ?? ""),
    functionDate: isoize(r.functionDate),
    functionTime: String(r.functionTime ?? ""),
    startTime: str(r.startTime),
    endTime: str(r.endTime),
    startDateTime: isoMaybe(r.startDateTime),
    endDateTime: isoMaybe(r.endDateTime),
    expectedGuests: num(r.expectedGuests),
    confirmedGuests: r.confirmedGuests == null || r.confirmedGuests === "" ? null : num(r.confirmedGuests),

    totalAmount: num(r.totalAmount),
    totalBillAmount: str(r.totalBillAmount),
    totalBillAmountValue: r.totalBillAmountValue == null || r.totalBillAmountValue === "" ? null : num(r.totalBillAmountValue),
    finalAmount: str(r.finalAmount),
    finalAmountValue: r.finalAmountValue == null || r.finalAmountValue === "" ? null : num(r.finalAmountValue),

    discountAmount: num(r.discountAmount),
    discountPercentage: num(r.discountPercentage),
    discountAmount2nd: str(r.discountAmount2nd),
    discountAmount2ndValue: r.discountAmount2ndValue == null || r.discountAmount2ndValue === "" ? null : num(r.discountAmount2ndValue),
    discountPercentage2nd: str(r.discountPercentage2nd),
    discountPercentage2ndValue: r.discountPercentage2ndValue == null || r.discountPercentage2ndValue === "" ? null : num(r.discountPercentage2ndValue),

    settlementDiscountPercent: r.settlementDiscountPercent == null || r.settlementDiscountPercent === "" ? null : num(r.settlementDiscountPercent),
    settlementDiscountAmount: r.settlementDiscountAmount == null || r.settlementDiscountAmount === "" ? null : num(r.settlementDiscountAmount),
    settlementTotalAmount: r.settlementTotalAmount == null || r.settlementTotalAmount === "" ? null : num(r.settlementTotalAmount),

    taxAmount: num(r.taxAmount),
    grandTotal: num(r.grandTotal),

    advanceRequired: str(r.advanceRequired),
    advanceRequiredValue: r.advanceRequiredValue == null || r.advanceRequiredValue === "" ? null : num(r.advanceRequiredValue),
    paymentReceivedAmount: str(r.paymentReceivedAmount),
    paymentReceivedAmountValue: r.paymentReceivedAmountValue == null || r.paymentReceivedAmountValue === "" ? null : num(r.paymentReceivedAmountValue),
    dueAmount: str(r.dueAmount),
    dueAmountValue: r.dueAmountValue == null || r.dueAmountValue === "" ? null : num(r.dueAmountValue),

    status: (String(r.status ?? "confirmed").toLowerCase() as Booking["status"]) || "confirmed",
    isPencilBooking: bool(r.isPencilBooking),
    pencilExpiresAt: isoMaybe(r.pencilExpiresAt),

    quotation: r.quotation == null ? null : bool(r.quotation),
    isQuotation: bool(r.isQuotation),

    isLatest: bool(r.isLatest),
    previousBookingId: str(r.previousBookingId),
    versionNumber: num(r.versionNumber, 1),

    notes: str(r.notes),
    internalNotes: str(r.internalNotes),
    createdAt: isoize(r.createdAt),
    updatedAt: isoize(r.updatedAt),

    customer: customer ? {
      id: customer.id, name: customer.name, phone: customer.phone,
      alternatePhone: customer.alternatePhone, email: customer.email,
      city: customer.city, priority: customer.priority, rating: customer.rating,
    } : undefined,
    halls: bhByBooking.get(id) ?? [],
    packs: bpacksByBooking.get(id) ?? [],
    payments: paymentsByBooking.get(id) ?? [],
  };
});
export const bookingById = new Map(BOOKINGS.map((b) => [b.id, b]));

/* ─────────────────────────── USERS / AUDIT ──────────────────────────── */

export const USERS: User[] = arr("users").map((r) => ({
  id: String(r.id),
  email: String(r.email ?? ""),
  name: str(r.name),
  isVerified: bool(r.isVerified),
  createdAt: isoize(r.createdAt),
  updatedAt: isoize(r.updatedAt),
}));
export const userById = new Map(USERS.map((u) => [u.id, u]));

export const ROLES: Role[] = arr("roles").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
}));

export const PERMISSIONS: Permission[] = arr("permissions").map((r) => ({
  id: String(r.id),
  name: String(r.name ?? ""),
  description: str(r.description),
}));

export const USER_ROLES: UserRole[] = arr("user_roles").map((r) => ({
  id: String(r.id),
  userId: String(r.userId),
  roleId: String(r.roleId),
}));

export const AUDIT_LOGS: AuditLog[] = arr("audit_logs").map((r) => ({
  id: String(r.id),
  userId: str(r.userId),
  userName: str(r.userName),
  action: String(r.action ?? ""),
  resource: String(r.resource ?? ""),
  resourceId: str(r.resourceId),
  resourceLabel: str(r.resourceLabel),
  details: r.details ?? null,
  ipAddress: str(r.ipAddress),
  createdAt: isoize(r.createdAt),
}));

/* ─────────────────────────── HELPERS ───────────────────────────────── */

export function bookingMoney(b: Booking) {
  const packsTotal = (b.packs ?? []).reduce(
    (s, p) => s + p.packCount * p.ratePerPlate + p.setupCost + (p.extraAmountValue ?? 0) + p.extraCharges,
    0,
  );
  const hallTotal = (b.halls ?? []).reduce((s, h) => s + h.charges, 0);
  const sub = b.totalBillAmountValue ?? (hallTotal + packsTotal);
  const d1 = b.discountAmount ?? 0;
  const d2pct = b.discountPercentage2ndValue ?? 0;
  const afterD1 = Math.max(0, sub - d1);
  const afterD2 = afterD1 - (afterD1 * d2pct) / 100;
  const settle = b.settlementDiscountAmount ?? 0;
  const afterSettle = afterD2 - settle;
  const tax = b.taxAmount ?? 0;
  const grand = b.grandTotal || b.finalAmountValue || afterSettle + tax;
  const received = (b.payments ?? []).reduce((s, p) => s + p.amount, 0)
    || b.paymentReceivedAmountValue || 0;
  const balance = Math.max(0, grand - received);
  return { sub, hallTotal, packsTotal, d1, d2pct, afterD1, afterD2, settle, tax, grand, received, balance };
}

export const venueById = banquetById;
export { hallById };
