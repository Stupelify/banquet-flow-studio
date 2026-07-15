/**
 * Domain types for the Bika Banquet API, mirroring server/prisma/schema.prisma
 * as the shapes arrive over JSON (DateTime → ISO string, Json → unknown).
 *
 * Relations are optional because controllers vary their `include`s; a field is
 * only guaranteed when the endpoint documents it (e.g. GET /bookings includes
 * customer + packs).
 *
 * Write payloads use the `*Input` types: same fields, everything optional, no
 * server-managed columns (id/createdAt/updatedAt/relations).
 */

// ── Envelope ────────────────────────────────────────────────────────────────

/** Every endpoint wraps its payload: `{ success, data, message? }`. */
export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Auth / RBAC ─────────────────────────────────────────────────────────────

/** Shape of GET /auth/me — flattened role/permission names, not DB relations. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  deniedPermissions?: string[];
  banquetIds?: string[];
  hasAllVenueAccess?: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  isVerified: boolean;
  isActive: boolean;
  disabledAt: string | null;
  disabledReason: string | null;
  hasAllVenueAccess: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  userRoles?: UserRole[];
  roles?: Role[];
  permissions?: string[];
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  permissions?: RolePermission[];
  _count?: { userRoles: number };
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  /** Required: every endpoint returning userRoles includes the role. */
  role: Role;
}

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  /** Required: every endpoint returning role permissions includes it. */
  permission: Permission;
}

// ── Customers ───────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  phoneE164: string | null;
  phoneCountryCode: string | null;
  phoneVerified: boolean;
  email: string | null;
  alterPhone: string | null;
  alterPhoneCountryCode: string | null;
  alternatePhone: string | null;
  alternatePhoneE164: string | null;
  whatsapp: string | null;
  whatsappE164: string | null;
  whatsappNumber: string | null;
  whatsappCountryCode: string | null;
  isWhatsappSameAsPhone: boolean | null;
  address: string | null;
  country: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  priority: number | null;
  caste: string | null;
  rating: string | null;
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
  referredBy?: Customer | null;
  bookings?: Booking[];
  enquiries?: Enquiry[];
}

export type CustomerInput = Partial<
  Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'visitCount' | 'referredBy' | 'bookings' | 'enquiries'>
>;

// ── Enquiries ───────────────────────────────────────────────────────────────

export type EnquiryStatus = 'pending' | 'quoted' | 'converted' | 'cancelled';

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
  customer?: Customer;
  halls?: EnquiryHall[];
  packs?: EnquiryPack[];
}

export interface EnquiryHall {
  id: string;
  enquiryId: string;
  hallId: string;
  hall?: Hall;
}

export interface EnquiryPack {
  id: string;
  enquiryId: string;
  mealSlotId: string;
  templateMenuId: string;
  packCount: number;
  timeSlot: string | null;
  notes: string | null;
  mealSlot?: MealSlot;
  templateMenu?: TemplateMenu;
}

export type EnquiryInput = Partial<
  Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt' | 'customer' | 'halls' | 'packs'>
> & {
  hallIds?: string[];
  packs?: Array<Partial<Omit<EnquiryPack, 'id' | 'enquiryId' | 'mealSlot' | 'templateMenu'>>>;
};

// ── Venues ──────────────────────────────────────────────────────────────────

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

export type BanquetInput = Partial<Omit<Banquet, 'id' | 'createdAt' | 'updatedAt' | 'halls'>>;

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
  banquet?: Banquet | null;
}

export type HallInput = Partial<Omit<Hall, 'id' | 'createdAt' | 'updatedAt' | 'banquet'>>;

// ── Menu & catalog ──────────────────────────────────────────────────────────

export type QuantityUnit =
  | 'kg'
  | 'g'
  | 'liter'
  | 'ml'
  | 'piece'
  | 'packet'
  | 'dozen'
  | 'box';

export interface MealSlot {
  id: string;
  name: string;
  description: string | null;
  startTime: string;
  endTime: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ItemType {
  id: string;
  name: string;
  order: number;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items?: Item[];
}

export type ItemTypeInput = Partial<Omit<ItemType, 'id' | 'createdAt' | 'updatedAt' | 'items'>>;

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
  createdAt: string;
  updatedAt: string;
  itemType?: ItemType;
}

export type ItemInput = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt' | 'itemType'>>;

export interface Ingredient {
  id: string;
  name: string;
  defaultUnit: QuantityUnit;
  createdAt: string;
  updatedAt: string;
  itemRecipes?: ItemRecipe[];
  vendorSupplies?: VendorSupply[];
}

export type IngredientInput = Partial<
  Omit<
    Ingredient,
    'id' | 'createdAt' | 'updatedAt' | 'itemRecipes' | 'vendorSupplies' | 'defaultUnit'
  >
> & {
  /** Loose on purpose: forms hold free string; server validates the enum. */
  defaultUnit?: string;
};

export interface ItemRecipe {
  id: string;
  itemId: string;
  ingredientId: string;
  quantity: number;
  unit: QuantityUnit;
  ingredient?: Ingredient;
  item?: Item;
}

export type ItemRecipeInput = Partial<
  Omit<ItemRecipe, 'id' | 'ingredient' | 'item' | 'unit'>
> & {
  /** Loose on purpose: forms hold free string; server validates the enum. */
  unit?: string;
};

export interface Vendor {
  id: string;
  name: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gstNumber: string | null;
  createdAt: string;
  updatedAt: string;
  supplies?: VendorSupply[];
}

export type VendorInput = Partial<Omit<Vendor, 'id' | 'createdAt' | 'updatedAt' | 'supplies'>>;

export interface VendorSupply {
  id: string;
  vendorId: string;
  productType: 'ingredient' | 'item';
  ingredientId: string | null;
  itemId: string | null;
  price: number;
  unit: QuantityUnit;
  vendor?: Vendor;
  ingredient?: Ingredient | null;
  item?: Item | null;
  priceHistory?: VendorSupplyPriceHistory[];
}

export type VendorSupplyInput = Partial<
  Omit<VendorSupply, 'id' | 'vendor' | 'ingredient' | 'item' | 'priceHistory' | 'unit'>
> & {
  /** Loose on purpose: forms hold free string; server validates the enum. */
  unit?: string;
};

export interface VendorSupplyPriceHistory {
  id: string;
  vendorSupplyId: string;
  previousPrice: number | null;
  newPrice: number;
  changedBy: string | null;
  changedAt: string;
}

export interface TemplateMenu {
  id: string;
  name: string;
  description: string | null;
  setupCost: number;
  ratePerPlate: number;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  /** Always present: full entries with includeItems=true, [] otherwise. */
  items: TemplateMenuItem[];
  /** Only on list responses without includeItems. */
  itemCount?: number | null;
}

export type TemplateMenuInput = Partial<
  Omit<TemplateMenu, 'id' | 'createdAt' | 'updatedAt' | 'items'>
> & {
  items?: Array<{ itemId: string; quantity?: number }>;
};

export interface TemplateMenuItem {
  id: string;
  templateMenuId: string;
  itemId: string;
  quantity: number;
  item: Item;
}

// ── Bookings ────────────────────────────────────────────────────────────────

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'cheque' | 'bank_transfer';

export interface Booking {
  id: string;
  bookingNumber?: string | null;
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
  customer?: Customer;
  secondCustomer?: Customer | null;
  referredBy?: Customer | null;
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
  /** Always 0 — association only. Hall money lives on pack hallRate. */
  charges: number;
  hall?: Hall;
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
  mealSlot?: MealSlot;
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
  notes?: string | null;
  item?: Item;
}

export interface AdditionalBookingItem {
  id: string;
  bookingId: string;
  description: string;
  charges: number;
  quantity: number;
  notes: string | null;
}

export interface BookingPayment {
  id: string;
  bookingId: string;
  clientMutationId?: string | null;
  receivedBy: string;
  amount: number;
  method: PaymentMethod;
  paymentMethod: string | null;
  reference: string | null;
  narration: string | null;
  paymentDate: string;
  clearingDate: string | null;
  createdAt: string;
  updatedAt: string;
  receiver?: User;
}

export type BookingPaymentInput = Partial<
  Omit<BookingPayment, 'id' | 'bookingId' | 'createdAt' | 'updatedAt' | 'receiver' | 'method'>
> & {
  /** Loose on purpose: forms hold free string; server validates the method. */
  method?: string;
};

export interface FinalizedBooking {
  id: string;
  bookingId: string;
  data: unknown;
  finalizedBy: string | null;
  finalizedAt: string;
}

/**
 * Booking write payload. Deliberately loose: the exact shape is owned by the
 * booking form + server mapper pair (see AGENTS.md billing invariants) — do
 * not tighten this without changing both ends together.
 */
export type BookingInput = Record<string, unknown>;

// ── Audit logs ──────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  resourceLabel: string | null;
  details: unknown;
  ipAddress: string | null;
  createdAt: string;
}

// ── List payloads (server-paginated endpoints) ──────────────────────────────

export interface CustomersListData {
  customers: Customer[];
  pagination: PaginationMeta;
}

export interface BookingsListData {
  bookings: Booking[];
  pagination: PaginationMeta;
}

export interface BookingsCalendarRangeData {
  bookings: Booking[];
  truncated?: boolean;
}

export interface EnquiriesListData {
  enquiries: Enquiry[];
  pagination: PaginationMeta;
}

export interface EnquiriesCalendarRangeData {
  enquiries: Enquiry[];
  truncated?: boolean;
}
