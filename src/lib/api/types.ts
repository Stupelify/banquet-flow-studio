/**
 * Canonical TypeScript types — mirror server/prisma/schema.prisma 1:1.
 * Names, optionality, and string/number duality (e.g. `advanceRequired: string`
 * + `advanceRequiredValue: number`) are preserved exactly as the Express API
 * returns them so screens can be wired to the real backend later without
 * shape changes.
 *
 * All `DateTime` fields from Prisma are serialized as ISO strings over JSON;
 * we type them as `string` here. Conversion to `Date` happens at the UI edge.
 */

/* ────────────────────────────────  AUTH  ──────────────────────────────── */

export interface User {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  userRoles?: UserRole[];
  userBanquets?: UserBanquet[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions?: RolePermission[];
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  role?: Role;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  permission?: Permission;
}

export interface UserBanquet {
  id: string;
  userId: string;
  banquetId: string;
  banquet?: Banquet;
}

/* ──────────────────────────────  CUSTOMER  ────────────────────────────── */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneE164: string | null;
  phoneCountryCode: string | null;
  phoneVerified: boolean;
  email: string | null;
  alternatePhone: string | null;
  alternatePhoneE164: string | null;
  alterPhoneCountryCode: string | null;
  whatsapp: string | null;
  whatsappE164: string | null;
  isWhatsappSameAsPhone: boolean | null;
  address: string | null;
  country: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  priority: number | null; // 1 = VIP, 2 = High, 3 = Normal
  caste: string | null;
  rating: string | null; // stored as string in schema
  visitCount: number;
  dateOfBirth: string | null;
  anniversary: string | null;
  occupation: string | null;
  companyName: string | null;
  gstNumber: string | null;
  panNumber: string | null;
  aadharNumber: string | null;
  instagramHandle: string | null;
  twitter: string | null;
  linkedin: string | null;
  facebookProfile: string | null;
  isVerified: boolean;
  referredById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  referredBy?: Pick<Customer, "id" | "name" | "phone"> | null;
  referrals?: Pick<Customer, "id" | "name" | "phone">[];
}

/* ──────────────────────────────  VENUE  ───────────────────────────────── */

export interface Banquet {
  id: string;
  name: string;
  location: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  facilities: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  halls?: Hall[];
}

export interface Hall {
  id: string;
  name: string;
  banquetId: string | null;
  location: string | null;
  rate: string | null;
  capacity: number;
  floatingCapacity: number | null;
  area: number | null;
  photo: string | null;
  order: number | null;
  floorNumber: number | null;
  amenities: string | null;
  description: string | null;
  basePrice: number | null;
  images: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  banquet?: Pick<Banquet, "id" | "name"> | null;
}

/* ─────────────────────────────  CATALOG  ──────────────────────────────── */

export type QuantityUnit = "kg" | "g" | "liter" | "ml" | "piece" | "packet" | "dozen" | "box";

export interface MealSlot {
  id: string;
  name: string; // Breakfast, Lunch, Hi-Tea, Dinner, Late Night, etc.
  description: string | null;
  startTime: string; // "HH:mm"
  endTime: string;
  displayOrder: number;
  isActive: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  order: number;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface Item {
  id: string;
  itemTypeId: string;
  name: string;
  description: string | null;
  photo: string | null;
  setupCost: string | null;
  itemCost: string | null;
  point: number | null;
  cost: number;
  points: number;
  isVeg: boolean;
  isActive: boolean;
  itemType?: Pick<ItemType, "id" | "name">;
}

export interface Ingredient {
  id: string;
  name: string;
  defaultUnit: QuantityUnit;
}

export interface ItemRecipe {
  id: string;
  itemId: string;
  ingredientId: string;
  quantity: number;
  unit: QuantityUnit;
  ingredient?: Pick<Ingredient, "id" | "name" | "defaultUnit">;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  supplies?: VendorSupply[];
}

export type VendorProductType = "ingredient" | "item";

export interface VendorSupply {
  id: string;
  vendorId: string;
  productType: VendorProductType;
  ingredientId: string | null;
  itemId: string | null;
  price: number;
  unit: QuantityUnit;
  ingredient?: Pick<Ingredient, "id" | "name"> | null;
  item?: Pick<Item, "id" | "name"> | null;
}

export interface TemplateMenu {
  id: string;
  name: string;
  description: string | null;
  setupCost: number;
  ratePerPlate: number;
  category: string | null;
  isActive: boolean;
  items?: TemplateMenuItem[];
}

export interface TemplateMenuItem {
  id: string;
  templateMenuId: string;
  itemId: string;
  quantity: number;
  item?: Pick<Item, "id" | "name" | "isVeg"> & { itemType?: Pick<ItemType, "id" | "name"> };
}

/* ─────────────────────────────  ENQUIRY  ──────────────────────────────── */

export type EnquiryStatus = "pending" | "quoted" | "converted" | "cancelled";

export interface Enquiry {
  id: string;
  customerId: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  functionTime: string | null;
  startTime: string | null;
  endTime: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  expectedGuests: number;
  budgetPerPlate: number | null;
  specialRequirements: string | null;
  quotation: boolean;
  pencilBooking: boolean;
  validity: string | null;
  note: string | null;
  status: EnquiryStatus;
  isPencilBooked: boolean;
  pencilBookedUntil: string | null;
  quotationSent: boolean;
  quotationValidUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: Pick<Customer, "id" | "name" | "phone" | "email">;
  halls?: { id: string; hallId: string; hall?: Pick<Hall, "id" | "name"> }[];
  packs?: {
    id: string;
    mealSlotId: string;
    templateMenuId: string;
    packCount: number;
    timeSlot: string | null;
    notes: string | null;
    mealSlot?: Pick<MealSlot, "id" | "name">;
    templateMenu?: Pick<TemplateMenu, "id" | "name" | "ratePerPlate">;
  }[];
}

/* ─────────────────────────────  BOOKING  ──────────────────────────────── */

export type BookingStatus = "confirmed" | "cancelled" | "completed";

/**
 * Booking — note the dual storage pattern from the schema:
 *   `advanceRequired` (string, display)  +  `advanceRequiredValue` (number, calc)
 * UI should prefer the *Value fields for math and the string fields for raw display.
 */
export interface Booking {
  id: string;
  customerId: string;
  secondCustomerId: string | null;
  referredById: string | null;
  rating: number | null;
  secondRating: number | null;
  priority: number | null;
  secondPriority: number | null;

  functionName: string;
  functionType: string;
  functionDate: string;
  functionTime: string;
  startTime: string | null;
  endTime: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  expectedGuests: number;
  confirmedGuests: number | null;

  totalAmount: number;
  totalBillAmount: string | null;
  totalBillAmountValue: number | null;
  finalAmount: string | null;
  finalAmountValue: number | null;

  discountAmount: number;
  discountPercentage: number;
  discountAmount2nd: string | null;
  discountAmount2ndValue: number | null;
  discountPercentage2nd: string | null;
  discountPercentage2ndValue: number | null;

  settlementDiscountPercent: number | null;
  settlementDiscountAmount: number | null;
  settlementTotalAmount: number | null;

  taxAmount: number;
  grandTotal: number;

  advanceRequired: string | null;
  advanceRequiredValue: number | null;
  paymentReceivedAmount: string | null;
  paymentReceivedAmountValue: number | null;
  dueAmount: string | null;
  dueAmountValue: number | null;

  status: BookingStatus;
  isPencilBooking: boolean;
  pencilExpiresAt: string | null;

  quotation: boolean | null;
  isQuotation: boolean;

  isLatest: boolean;
  previousBookingId: string | null;
  versionNumber: number;

  notes: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;

  customer?: Pick<Customer, "id" | "name" | "phone" | "alternatePhone" | "email" | "city" | "priority" | "rating">;
  secondCustomer?: Pick<Customer, "id" | "name" | "phone"> | null;
  halls?: BookingHall[];
  packs?: BookingPack[];
  additionalItems?: AdditionalBookingItem[];
  payments?: BookingPayment[];
  finalizedBooking?: FinalizedBooking | null;
}

export interface BookingHall {
  id: string;
  bookingId: string;
  hallId: string;
  charges: number;
  hall?: Pick<Hall, "id" | "name" | "capacity" | "banquetId"> & { banquet?: Pick<Banquet, "id" | "name"> };
}

export interface BookingPack {
  id: string;
  bookingId: string;
  mealSlotId: string;
  bookingMenuId: string;
  noOfPack: number | null;
  packName: string;
  packCount: number;
  hallIds: string[];
  hallName: string | null;
  ratePerPlate: number;
  setupCost: number;
  startTime: string | null;
  endTime: string | null;
  startDateTime: string | null;
  endDateTime: string | null;
  extraPlate: number | null;
  extraRate: string | null;
  extraRateValue: number | null;
  extraAmount: string | null;
  extraAmountValue: number | null;
  menuPoint: number | null;
  hallRate: string | null;
  hallRateValue: number | null;
  boardToRead: string | null;
  extraCharges: number;
  timeSlot: string | null;
  tags: string[];
  notes: string | null;
  mealSlot?: Pick<MealSlot, "id" | "name" | "startTime" | "endTime">;
  bookingMenu?: BookingMenu;
}

export interface BookingMenu {
  id: string;
  name: string;
  description: string | null;
  mealSlotId: string | null;
  setupCost: number;
  ratePerPlate: number;
  items?: BookingMenuItem[];
}

export interface BookingMenuItem {
  id: string;
  bookingMenuId: string;
  itemId: string;
  quantity: number;
  item?: Pick<Item, "id" | "name" | "isVeg"> & { itemType?: Pick<ItemType, "id" | "name"> };
}

export interface AdditionalBookingItem {
  id: string;
  bookingId: string;
  description: string;
  charges: number;
  quantity: number;
  notes: string | null;
}

export type PaymentMethod = "cash" | "card" | "upi" | "cheque" | "bank_transfer";

export interface BookingPayment {
  id: string;
  bookingId: string;
  receivedBy: string;
  amount: number;
  method: PaymentMethod;
  paymentMethod: string | null;
  reference: string | null;
  narration: string | null;
  paymentDate: string;
  clearingDate: string | null;
  createdAt: string;
  receiver?: Pick<User, "id" | "name" | "email">;
}

export interface FinalizedBooking {
  id: string;
  bookingId: string;
  data: unknown; // Json snapshot
  finalizedBy: string | null;
  finalizedAt: string;
  user?: Pick<User, "id" | "name"> | null;
}

/* ─────────────────────────────  AUDIT  ────────────────────────────────── */

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string; // "create" | "update" | "delete" | "login" | ...
  resource: string; // "booking" | "customer" | "payment" | ...
  resourceId: string | null;
  resourceLabel: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

/* ─────────────────────  GOOGLE CALENDAR (IMPORT)  ─────────────────────── */

export interface GoogleCalendarEvent {
  id: string;
  googleEventId: string;
  calendarId: string;
  venueName: string;
  title: string;
  description?: string;
  location?: string;
  status: string;
  start: string;
  end: string;
  isAllDay: boolean;
  htmlLink?: string;
  origin: "software" | "google";
}
