/**
 * Mock fixtures shaped EXACTLY like the real Express/Prisma API responses.
 *
 * Source of truth: server/prisma/schema.prisma + server/src/routes/*.
 * When the UI is later pointed at the real API, only `src/lib/api/client.ts`
 * needs to change — every screen reads these types unchanged.
 *
 * Conventions matching the real server:
 *   • DateTime fields are ISO strings (not Date).
 *   • Amount fields exist in dual form: string (display) + Value (number).
 *   • Booking.halls is an array of BookingHall join rows, each with `hall`.
 *   • Booking.packs each carry their own bookingMenu (1:1 unique).
 */

import type {
  AuditLog,
  Banquet,
  Booking,
  BookingHall,
  BookingMenu,
  BookingPack,
  BookingPayment,
  BookingStatus,
  Customer,
  Enquiry,
  EnquiryStatus,
  GoogleCalendarEvent,
  Hall,
  Ingredient,
  Item,
  ItemType,
  MealSlot,
  PaymentMethod,
  Permission,
  Role,
  TemplateMenu,
  User,
  Vendor,
} from "./types";

/* ──────────────────────────  ID + DATE HELPERS  ───────────────────────── */

const uid = (p: string, n: number) => `${p}_${String(n).padStart(4, "0")}`;
const iso = (d: Date) => d.toISOString();
const today = new Date();
today.setHours(0, 0, 0, 0);
const addDays = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d;
};
const at = (date: Date, h: number, m = 0) => {
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
};
const hhmm = (h: number, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/* ───────────────────────────  USERS / ROLES  ──────────────────────────── */

export const PERMISSIONS: Permission[] = [
  "bookings.view", "bookings.create", "bookings.edit", "bookings.delete",
  "bookings.finalize", "payments.record", "payments.refund",
  "customers.view", "customers.edit", "enquiries.view", "enquiries.convert",
  "halls.manage", "menu.manage", "vendors.manage", "reports.view",
  "settings.manage", "users.manage", "audit.view",
].map((name, i) => ({ id: uid("perm", i + 1), name, description: null }));

export const ROLES: Role[] = [
  { id: uid("role", 1), name: "Owner", description: "Full access" },
  { id: uid("role", 2), name: "Manager", description: "Operations" },
  { id: uid("role", 3), name: "Front Desk", description: "Bookings + payments" },
  { id: uid("role", 4), name: "Chef", description: "Menu + ingredients" },
  { id: uid("role", 5), name: "Accountant", description: "Payments + reports" },
];

export const USERS: User[] = [
  { id: uid("user", 1), email: "harshit@bika.local", name: "Harshit Goyal", isVerified: true, createdAt: iso(addDays(-400)), updatedAt: iso(today) },
  { id: uid("user", 2), email: "priya@bika.local", name: "Priya Sharma", isVerified: true, createdAt: iso(addDays(-300)), updatedAt: iso(today) },
  { id: uid("user", 3), email: "rajesh@bika.local", name: "Rajesh Kumar", isVerified: true, createdAt: iso(addDays(-250)), updatedAt: iso(today) },
  { id: uid("user", 4), email: "neha@bika.local", name: "Neha Verma", isVerified: true, createdAt: iso(addDays(-200)), updatedAt: iso(today) },
  { id: uid("user", 5), email: "vikram@bika.local", name: "Vikram Singh", isVerified: true, createdAt: iso(addDays(-150)), updatedAt: iso(today) },
];

/* ───────────────────────────  VENUES + HALLS  ─────────────────────────── */

export const BANQUETS: Banquet[] = [
  { id: uid("banq", 1), name: "Bika 1", location: "Civil Lines", address: "12 Mall Road", city: "Bareilly", state: "UP", pincode: "243001", phone: "+91 9876500011", email: "bika1@bika.local", facilities: "Parking, AC, Stage, Sound, Catering", description: "Flagship banquet with two grand halls.", isActive: true, createdAt: iso(addDays(-1200)), updatedAt: iso(today) },
  { id: uid("banq", 2), name: "Bika 2", location: "Pilibhit Road", address: "55 Pilibhit Bypass", city: "Bareilly", state: "UP", pincode: "243006", phone: "+91 9876500022", email: "bika2@bika.local", facilities: "Parking, AC, Stage, Lawn", description: "Outdoor lawn + indoor combo.", isActive: true, createdAt: iso(addDays(-1100)), updatedAt: iso(today) },
  { id: uid("banq", 3), name: "Rangoli", location: "Rampur Garden", address: "8 Rampur Garden", city: "Bareilly", state: "UP", pincode: "243001", phone: "+91 9876500033", email: "rangoli@bika.local", facilities: "AC, Stage, Sound, Catering", description: "Intimate halls for engagements + receptions.", isActive: true, createdAt: iso(addDays(-900)), updatedAt: iso(today) },
];

export const HALLS: Hall[] = [
  { id: uid("hall", 1), name: "Heritage Hall", banquetId: BANQUETS[0].id, location: "Ground Floor", rate: "75000", capacity: 800, floatingCapacity: 1200, area: 6500, photo: null, order: 1, floorNumber: 0, amenities: "Stage, Green Room, VIP Lounge", description: "Largest hall, ideal for receptions.", basePrice: 75000, images: [], isActive: true, createdAt: iso(addDays(-1200)), updatedAt: iso(today), banquet: { id: BANQUETS[0].id, name: BANQUETS[0].name } },
  { id: uid("hall", 2), name: "Crystal Hall", banquetId: BANQUETS[0].id, location: "1st Floor", rate: "55000", capacity: 500, floatingCapacity: 750, area: 4200, photo: null, order: 2, floorNumber: 1, amenities: "Stage, Bar Counter", description: "Mid-size hall, weddings + engagements.", basePrice: 55000, images: [], isActive: true, createdAt: iso(addDays(-1200)), updatedAt: iso(today), banquet: { id: BANQUETS[0].id, name: BANQUETS[0].name } },
  { id: uid("hall", 3), name: "Pearl Lounge", banquetId: BANQUETS[0].id, location: "1st Floor", rate: "35000", capacity: 250, floatingCapacity: 400, area: 2400, photo: null, order: 3, floorNumber: 1, amenities: "Lounge, Bar", description: "Cocktail + corporate.", basePrice: 35000, images: [], isActive: true, createdAt: iso(addDays(-1200)), updatedAt: iso(today), banquet: { id: BANQUETS[0].id, name: BANQUETS[0].name } },
  { id: uid("hall", 4), name: "Emerald Lawn", banquetId: BANQUETS[1].id, location: "Outdoor", rate: "85000", capacity: 1000, floatingCapacity: 1500, area: 12000, photo: null, order: 1, floorNumber: 0, amenities: "Open-air Stage, Marquee", description: "Lawn for grand weddings.", basePrice: 85000, images: [], isActive: true, createdAt: iso(addDays(-1100)), updatedAt: iso(today), banquet: { id: BANQUETS[1].id, name: BANQUETS[1].name } },
  { id: uid("hall", 5), name: "Sapphire Hall", banquetId: BANQUETS[1].id, location: "Indoor", rate: "60000", capacity: 600, floatingCapacity: 900, area: 5000, photo: null, order: 2, floorNumber: 0, amenities: "Stage, AC, Sound", description: "Indoor backup for the lawn.", basePrice: 60000, images: [], isActive: true, createdAt: iso(addDays(-1100)), updatedAt: iso(today), banquet: { id: BANQUETS[1].id, name: BANQUETS[1].name } },
  { id: uid("hall", 6), name: "Garden Patio", banquetId: BANQUETS[1].id, location: "Outdoor", rate: "30000", capacity: 200, floatingCapacity: 300, area: 1800, photo: null, order: 3, floorNumber: 0, amenities: "Stage, Lights", description: "Mehendi + sangeet.", basePrice: 30000, images: [], isActive: true, createdAt: iso(addDays(-1100)), updatedAt: iso(today), banquet: { id: BANQUETS[1].id, name: BANQUETS[1].name } },
  { id: uid("hall", 7), name: "Diya Hall", banquetId: BANQUETS[2].id, location: "Ground", rate: "45000", capacity: 400, floatingCapacity: 600, area: 3200, photo: null, order: 1, floorNumber: 0, amenities: "Stage, AC", description: "Engagements + receptions.", basePrice: 45000, images: [], isActive: true, createdAt: iso(addDays(-900)), updatedAt: iso(today), banquet: { id: BANQUETS[2].id, name: BANQUETS[2].name } },
  { id: uid("hall", 8), name: "Mehendi Court", banquetId: BANQUETS[2].id, location: "Ground", rate: "25000", capacity: 200, floatingCapacity: 300, area: 1600, photo: null, order: 2, floorNumber: 0, amenities: "Open-air, Lights", description: "Mehendi + haldi.", basePrice: 25000, images: [], isActive: true, createdAt: iso(addDays(-900)), updatedAt: iso(today), banquet: { id: BANQUETS[2].id, name: BANQUETS[2].name } },
  { id: uid("hall", 9), name: "Ruby Room", banquetId: BANQUETS[2].id, location: "1st Floor", rate: "20000", capacity: 120, floatingCapacity: 180, area: 1100, photo: null, order: 3, floorNumber: 1, amenities: "AC, Sound", description: "Birthdays, intimate.", basePrice: 20000, images: [], isActive: true, createdAt: iso(addDays(-900)), updatedAt: iso(today), banquet: { id: BANQUETS[2].id, name: BANQUETS[2].name } },
  { id: uid("hall", 10), name: "Topaz Suite", banquetId: BANQUETS[2].id, location: "2nd Floor", rate: "18000", capacity: 80, floatingCapacity: 120, area: 800, photo: null, order: 4, floorNumber: 2, amenities: "AC", description: "Corporate boardroom + small events.", basePrice: 18000, images: [], isActive: true, createdAt: iso(addDays(-900)), updatedAt: iso(today), banquet: { id: BANQUETS[2].id, name: BANQUETS[2].name } },
];

/* ─────────────────────────────  CATALOG  ──────────────────────────────── */

export const MEAL_SLOTS: MealSlot[] = [
  { id: uid("slot", 1), name: "Breakfast", description: null, startTime: "08:00", endTime: "10:30", displayOrder: 1, isActive: true },
  { id: uid("slot", 2), name: "Lunch", description: null, startTime: "12:00", endTime: "15:00", displayOrder: 2, isActive: true },
  { id: uid("slot", 3), name: "Hi-Tea", description: null, startTime: "16:00", endTime: "18:30", displayOrder: 3, isActive: true },
  { id: uid("slot", 4), name: "Dinner", description: null, startTime: "19:30", endTime: "23:30", displayOrder: 4, isActive: true },
  { id: uid("slot", 5), name: "Late Night", description: null, startTime: "23:00", endTime: "02:00", displayOrder: 5, isActive: true },
];

export const ITEM_TYPES: ItemType[] = [
  { id: uid("itype", 1), name: "Starter (Veg)", order: 1, description: null, displayOrder: 1, isActive: true },
  { id: uid("itype", 2), name: "Starter (Non-Veg)", order: 2, description: null, displayOrder: 2, isActive: true },
  { id: uid("itype", 3), name: "Main Course", order: 3, description: null, displayOrder: 3, isActive: true },
  { id: uid("itype", 4), name: "Bread", order: 4, description: null, displayOrder: 4, isActive: true },
  { id: uid("itype", 5), name: "Rice / Biryani", order: 5, description: null, displayOrder: 5, isActive: true },
  { id: uid("itype", 6), name: "Dal", order: 6, description: null, displayOrder: 6, isActive: true },
  { id: uid("itype", 7), name: "Dessert", order: 7, description: null, displayOrder: 7, isActive: true },
  { id: uid("itype", 8), name: "Live Counter", order: 8, description: null, displayOrder: 8, isActive: true },
  { id: uid("itype", 9), name: "Beverages", order: 9, description: null, displayOrder: 9, isActive: true },
];

const ITEM_SEEDS: { name: string; type: number; veg: boolean; cost: number; points: number }[] = [
  { name: "Paneer Tikka",        type: 1, veg: true,  cost: 240, points: 8 },
  { name: "Hara Bhara Kebab",    type: 1, veg: true,  cost: 200, points: 7 },
  { name: "Mushroom Galouti",    type: 1, veg: true,  cost: 260, points: 8 },
  { name: "Chicken Tikka",       type: 2, veg: false, cost: 320, points: 9 },
  { name: "Mutton Seekh",        type: 2, veg: false, cost: 380, points: 10 },
  { name: "Fish Amritsari",      type: 2, veg: false, cost: 360, points: 9 },
  { name: "Paneer Butter Masala",type: 3, veg: true,  cost: 280, points: 9 },
  { name: "Dum Aloo",            type: 3, veg: true,  cost: 220, points: 7 },
  { name: "Butter Chicken",      type: 3, veg: false, cost: 360, points: 10 },
  { name: "Mutton Rogan Josh",   type: 3, veg: false, cost: 420, points: 11 },
  { name: "Tandoori Roti",       type: 4, veg: true,  cost: 25,  points: 1 },
  { name: "Butter Naan",         type: 4, veg: true,  cost: 35,  points: 2 },
  { name: "Veg Biryani",         type: 5, veg: true,  cost: 280, points: 8 },
  { name: "Hyderabadi Biryani",  type: 5, veg: false, cost: 380, points: 10 },
  { name: "Dal Makhani",         type: 6, veg: true,  cost: 180, points: 6 },
  { name: "Yellow Dal Tadka",    type: 6, veg: true,  cost: 140, points: 5 },
  { name: "Gulab Jamun",         type: 7, veg: true,  cost: 80,  points: 3 },
  { name: "Rasmalai",            type: 7, veg: true,  cost: 120, points: 4 },
  { name: "Ice Cream Station",   type: 7, veg: true,  cost: 220, points: 6 },
  { name: "Chaat Counter",       type: 8, veg: true,  cost: 320, points: 9 },
  { name: "Live Pasta",          type: 8, veg: true,  cost: 360, points: 10 },
  { name: "Welcome Drinks",      type: 9, veg: true,  cost: 90,  points: 3 },
  { name: "Mocktail Bar",        type: 9, veg: true,  cost: 180, points: 5 },
];

export const ITEMS: Item[] = ITEM_SEEDS.map((s, i) => ({
  id: uid("item", i + 1),
  itemTypeId: ITEM_TYPES[s.type - 1].id,
  name: s.name,
  description: null,
  photo: null,
  setupCost: null,
  itemCost: String(s.cost),
  point: s.points,
  cost: s.cost,
  points: s.points,
  isVeg: s.veg,
  isActive: true,
  itemType: { id: ITEM_TYPES[s.type - 1].id, name: ITEM_TYPES[s.type - 1].name },
}));

const itemId = (name: string) => ITEMS.find((i) => i.name === name)!.id;

export const TEMPLATE_MENUS: TemplateMenu[] = [
  {
    id: uid("tmenu", 1), name: "Silver Veg", description: "Standard vegetarian wedding menu",
    setupCost: 25000, ratePerPlate: 950, category: "Veg", isActive: true,
    items: [
      { id: uid("tmi", 1), templateMenuId: uid("tmenu", 1), itemId: itemId("Paneer Tikka"), quantity: 1 },
      { id: uid("tmi", 2), templateMenuId: uid("tmenu", 1), itemId: itemId("Hara Bhara Kebab"), quantity: 1 },
      { id: uid("tmi", 3), templateMenuId: uid("tmenu", 1), itemId: itemId("Paneer Butter Masala"), quantity: 1 },
      { id: uid("tmi", 4), templateMenuId: uid("tmenu", 1), itemId: itemId("Dum Aloo"), quantity: 1 },
      { id: uid("tmi", 5), templateMenuId: uid("tmenu", 1), itemId: itemId("Butter Naan"), quantity: 2 },
      { id: uid("tmi", 6), templateMenuId: uid("tmenu", 1), itemId: itemId("Veg Biryani"), quantity: 1 },
      { id: uid("tmi", 7), templateMenuId: uid("tmenu", 1), itemId: itemId("Dal Makhani"), quantity: 1 },
      { id: uid("tmi", 8), templateMenuId: uid("tmenu", 1), itemId: itemId("Gulab Jamun"), quantity: 1 },
    ],
  },
  {
    id: uid("tmenu", 2), name: "Gold Mixed", description: "Premium mixed menu with live counters",
    setupCost: 45000, ratePerPlate: 1350, category: "Mixed", isActive: true,
    items: [
      { id: uid("tmi", 10), templateMenuId: uid("tmenu", 2), itemId: itemId("Paneer Tikka"), quantity: 1 },
      { id: uid("tmi", 11), templateMenuId: uid("tmenu", 2), itemId: itemId("Chicken Tikka"), quantity: 1 },
      { id: uid("tmi", 12), templateMenuId: uid("tmenu", 2), itemId: itemId("Mushroom Galouti"), quantity: 1 },
      { id: uid("tmi", 13), templateMenuId: uid("tmenu", 2), itemId: itemId("Butter Chicken"), quantity: 1 },
      { id: uid("tmi", 14), templateMenuId: uid("tmenu", 2), itemId: itemId("Paneer Butter Masala"), quantity: 1 },
      { id: uid("tmi", 15), templateMenuId: uid("tmenu", 2), itemId: itemId("Hyderabadi Biryani"), quantity: 1 },
      { id: uid("tmi", 16), templateMenuId: uid("tmenu", 2), itemId: itemId("Dal Makhani"), quantity: 1 },
      { id: uid("tmi", 17), templateMenuId: uid("tmenu", 2), itemId: itemId("Chaat Counter"), quantity: 1 },
      { id: uid("tmi", 18), templateMenuId: uid("tmenu", 2), itemId: itemId("Live Pasta"), quantity: 1 },
      { id: uid("tmi", 19), templateMenuId: uid("tmenu", 2), itemId: itemId("Rasmalai"), quantity: 1 },
      { id: uid("tmi", 20), templateMenuId: uid("tmenu", 2), itemId: itemId("Ice Cream Station"), quantity: 1 },
    ],
  },
  {
    id: uid("tmenu", 3), name: "Platinum Royal", description: "Top-tier menu with mutton + premium counters",
    setupCost: 75000, ratePerPlate: 1850, category: "Mixed", isActive: true,
    items: [
      { id: uid("tmi", 30), templateMenuId: uid("tmenu", 3), itemId: itemId("Mutton Seekh"), quantity: 1 },
      { id: uid("tmi", 31), templateMenuId: uid("tmenu", 3), itemId: itemId("Fish Amritsari"), quantity: 1 },
      { id: uid("tmi", 32), templateMenuId: uid("tmenu", 3), itemId: itemId("Mushroom Galouti"), quantity: 1 },
      { id: uid("tmi", 33), templateMenuId: uid("tmenu", 3), itemId: itemId("Mutton Rogan Josh"), quantity: 1 },
      { id: uid("tmi", 34), templateMenuId: uid("tmenu", 3), itemId: itemId("Butter Chicken"), quantity: 1 },
      { id: uid("tmi", 35), templateMenuId: uid("tmenu", 3), itemId: itemId("Paneer Butter Masala"), quantity: 1 },
      { id: uid("tmi", 36), templateMenuId: uid("tmenu", 3), itemId: itemId("Hyderabadi Biryani"), quantity: 1 },
      { id: uid("tmi", 37), templateMenuId: uid("tmenu", 3), itemId: itemId("Dal Makhani"), quantity: 1 },
      { id: uid("tmi", 38), templateMenuId: uid("tmenu", 3), itemId: itemId("Chaat Counter"), quantity: 1 },
      { id: uid("tmi", 39), templateMenuId: uid("tmenu", 3), itemId: itemId("Live Pasta"), quantity: 1 },
      { id: uid("tmi", 40), templateMenuId: uid("tmenu", 3), itemId: itemId("Ice Cream Station"), quantity: 1 },
      { id: uid("tmi", 41), templateMenuId: uid("tmenu", 3), itemId: itemId("Mocktail Bar"), quantity: 1 },
    ],
  },
  {
    id: uid("tmenu", 4), name: "Hi-Tea Classic", description: "Hi-tea snacks + chaat",
    setupCost: 12000, ratePerPlate: 550, category: "Hi-Tea", isActive: true,
    items: [
      { id: uid("tmi", 50), templateMenuId: uid("tmenu", 4), itemId: itemId("Welcome Drinks"), quantity: 1 },
      { id: uid("tmi", 51), templateMenuId: uid("tmenu", 4), itemId: itemId("Chaat Counter"), quantity: 1 },
      { id: uid("tmi", 52), templateMenuId: uid("tmenu", 4), itemId: itemId("Paneer Tikka"), quantity: 1 },
      { id: uid("tmi", 53), templateMenuId: uid("tmenu", 4), itemId: itemId("Gulab Jamun"), quantity: 1 },
    ],
  },
];

export const INGREDIENTS: Ingredient[] = [
  { id: uid("ing", 1), name: "Paneer", defaultUnit: "kg" },
  { id: uid("ing", 2), name: "Chicken", defaultUnit: "kg" },
  { id: uid("ing", 3), name: "Mutton", defaultUnit: "kg" },
  { id: uid("ing", 4), name: "Basmati Rice", defaultUnit: "kg" },
  { id: uid("ing", 5), name: "Atta", defaultUnit: "kg" },
  { id: uid("ing", 6), name: "Butter", defaultUnit: "kg" },
  { id: uid("ing", 7), name: "Cream", defaultUnit: "liter" },
  { id: uid("ing", 8), name: "Onion", defaultUnit: "kg" },
  { id: uid("ing", 9), name: "Tomato", defaultUnit: "kg" },
  { id: uid("ing", 10), name: "Tandoori Masala", defaultUnit: "kg" },
];

export const VENDORS: Vendor[] = [
  { id: uid("vend", 1), name: "Sharma Dairy", contactPerson: "Mukesh Sharma", phone: "+91 9876511001", email: "sharma@dairy.local", address: "Mandi Road, Bareilly", gstNumber: "09ABCDE1234F1Z5",
    supplies: [
      { id: uid("vs", 1), vendorId: uid("vend", 1), productType: "ingredient", ingredientId: INGREDIENTS[0].id, itemId: null, price: 320, unit: "kg", ingredient: { id: INGREDIENTS[0].id, name: INGREDIENTS[0].name }, item: null },
      { id: uid("vs", 2), vendorId: uid("vend", 1), productType: "ingredient", ingredientId: INGREDIENTS[5].id, itemId: null, price: 480, unit: "kg", ingredient: { id: INGREDIENTS[5].id, name: INGREDIENTS[5].name }, item: null },
      { id: uid("vs", 3), vendorId: uid("vend", 1), productType: "ingredient", ingredientId: INGREDIENTS[6].id, itemId: null, price: 220, unit: "liter", ingredient: { id: INGREDIENTS[6].id, name: INGREDIENTS[6].name }, item: null },
    ],
  },
  { id: uid("vend", 2), name: "Bareilly Meats", contactPerson: "Imran Khan", phone: "+91 9876511002", email: "imran@meats.local", address: "Kotwali", gstNumber: "09ABCDE1234F2Z5",
    supplies: [
      { id: uid("vs", 4), vendorId: uid("vend", 2), productType: "ingredient", ingredientId: INGREDIENTS[1].id, itemId: null, price: 280, unit: "kg", ingredient: { id: INGREDIENTS[1].id, name: INGREDIENTS[1].name }, item: null },
      { id: uid("vs", 5), vendorId: uid("vend", 2), productType: "ingredient", ingredientId: INGREDIENTS[2].id, itemId: null, price: 720, unit: "kg", ingredient: { id: INGREDIENTS[2].id, name: INGREDIENTS[2].name }, item: null },
    ],
  },
  { id: uid("vend", 3), name: "Mandi Sabzi", contactPerson: "Ram Lal", phone: "+91 9876511003", email: null, address: "Sabzi Mandi", gstNumber: null,
    supplies: [
      { id: uid("vs", 6), vendorId: uid("vend", 3), productType: "ingredient", ingredientId: INGREDIENTS[7].id, itemId: null, price: 30, unit: "kg", ingredient: { id: INGREDIENTS[7].id, name: INGREDIENTS[7].name }, item: null },
      { id: uid("vs", 7), vendorId: uid("vend", 3), productType: "ingredient", ingredientId: INGREDIENTS[8].id, itemId: null, price: 40, unit: "kg", ingredient: { id: INGREDIENTS[8].id, name: INGREDIENTS[8].name }, item: null },
    ],
  },
  { id: uid("vend", 4), name: "Goyal Grains", contactPerson: "Sunil Goyal", phone: "+91 9876511004", email: "sunil@goyal.local", address: "Anaj Mandi", gstNumber: "09ABCDE1234F3Z5",
    supplies: [
      { id: uid("vs", 8), vendorId: uid("vend", 4), productType: "ingredient", ingredientId: INGREDIENTS[3].id, itemId: null, price: 110, unit: "kg", ingredient: { id: INGREDIENTS[3].id, name: INGREDIENTS[3].name }, item: null },
      { id: uid("vs", 9), vendorId: uid("vend", 4), productType: "ingredient", ingredientId: INGREDIENTS[4].id, itemId: null, price: 45, unit: "kg", ingredient: { id: INGREDIENTS[4].id, name: INGREDIENTS[4].name }, item: null },
    ],
  },
];

/* ───────────────────────────  CUSTOMERS  ──────────────────────────────── */

const CUSTOMER_SEEDS: { name: string; phone: string; city: string; community?: string; priority?: number; rating?: string; referredBy?: number }[] = [
  { name: "Anand & Pooja Agarwal", phone: "+91 9810010001", city: "Bareilly", community: "Marwari", priority: 1, rating: "5" },
  { name: "Rohan Mehta", phone: "+91 9810010002", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Saira & Imran Khan", phone: "+91 9810010003", city: "Bareilly", community: "Muslim", priority: 1, rating: "5" },
  { name: "Vivek Kapoor", phone: "+91 9810010004", city: "Moradabad", priority: 3, rating: "3" },
  { name: "Aarti Singhal", phone: "+91 9810010005", city: "Bareilly", priority: 2, rating: "4", referredBy: 1 },
  { name: "Sunita Verma", phone: "+91 9810010006", city: "Rampur", priority: 3, rating: "3" },
  { name: "Karan & Simran Sethi", phone: "+91 9810010007", city: "Delhi", community: "Punjabi", priority: 1, rating: "5" },
  { name: "Manish Tyagi", phone: "+91 9810010008", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Deepa Jindal", phone: "+91 9810010009", city: "Bareilly", priority: 2, rating: "4", referredBy: 5 },
  { name: "Rakesh Bansal", phone: "+91 9810010010", city: "Pilibhit", priority: 3, rating: "3" },
  { name: "Nisha Rastogi", phone: "+91 9810010011", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Yash & Riya Goyal", phone: "+91 9810010012", city: "Bareilly", community: "Marwari", priority: 1, rating: "5", referredBy: 1 },
  { name: "Tarun Saxena", phone: "+91 9810010013", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Pankaj Choudhary", phone: "+91 9810010014", city: "Shahjahanpur", priority: 3, rating: "3" },
  { name: "Meera Jain", phone: "+91 9810010015", city: "Bareilly", community: "Jain", priority: 2, rating: "4" },
  { name: "Aditya Khanna", phone: "+91 9810010016", city: "Delhi", priority: 2, rating: "4" },
  { name: "Sneha Mittal", phone: "+91 9810010017", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Harish Aggarwal", phone: "+91 9810010018", city: "Bareilly", community: "Marwari", priority: 1, rating: "5", referredBy: 12 },
  { name: "Komal Bhatia", phone: "+91 9810010019", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Ankit Tandon", phone: "+91 9810010020", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Reema Chawla", phone: "+91 9810010021", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Shankar Lal Gupta", phone: "+91 9810010022", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Vandana Mishra", phone: "+91 9810010023", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Sahil & Anjali Arora", phone: "+91 9810010024", city: "Delhi", community: "Punjabi", priority: 1, rating: "5" },
  { name: "Bhavna Tripathi", phone: "+91 9810010025", city: "Lucknow", priority: 3, rating: "3" },
  { name: "Mohit Sharma", phone: "+91 9810010026", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Geeta Devi", phone: "+91 9810010027", city: "Pilibhit", priority: 3, rating: "2" },
  { name: "Rajiv & Sonia Malhotra", phone: "+91 9810010028", city: "Delhi", priority: 1, rating: "5" },
  { name: "Prerna Singh", phone: "+91 9810010029", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Amit Bharadwaj", phone: "+91 9810010030", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Shweta Pandey", phone: "+91 9810010031", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Naveen Bajaj", phone: "+91 9810010032", city: "Moradabad", priority: 2, rating: "4" },
  { name: "Kavita Suri", phone: "+91 9810010033", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Dr. Sanjay Mehrotra", phone: "+91 9810010034", city: "Bareilly", priority: 1, rating: "5" },
  { name: "Pooja Bhasin", phone: "+91 9810010035", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Rajat Sehgal", phone: "+91 9810010036", city: "Bareilly", priority: 2, rating: "4" },
  { name: "Anjali Rao", phone: "+91 9810010037", city: "Bareilly", priority: 3, rating: "3" },
  { name: "Mahesh & Sushma Tiwari", phone: "+91 9810010038", city: "Shahjahanpur", priority: 2, rating: "4" },
  { name: "Bhupesh Modi", phone: "+91 9810010039", city: "Bareilly", priority: 1, rating: "5" },
  { name: "Latika Bhalla", phone: "+91 9810010040", city: "Bareilly", priority: 3, rating: "3" },
];

export const CUSTOMERS: Customer[] = CUSTOMER_SEEDS.map((s, i) => {
  const id = uid("cust", i + 1);
  return {
    id,
    name: s.name,
    phone: s.phone,
    phoneE164: s.phone.replace(/\s+/g, ""),
    phoneCountryCode: "+91",
    phoneVerified: i % 4 !== 0,
    email: i % 3 === 0 ? `${s.name.split(" ")[0].toLowerCase()}@example.com` : null,
    alternatePhone: i % 5 === 0 ? `+91 98100200${String(i).padStart(2, "0")}` : null,
    alternatePhoneE164: null,
    alterPhoneCountryCode: null,
    whatsapp: null, whatsappE164: null, isWhatsappSameAsPhone: true,
    address: null, country: "India",
    street1: null, street2: null,
    city: s.city, state: "UP", pincode: null,
    priority: s.priority ?? 3,
    caste: s.community ?? null,
    rating: s.rating ?? "0",
    visitCount: Math.max(0, ((i * 7) % 9)),
    dateOfBirth: null, anniversary: null,
    occupation: null, companyName: null,
    gstNumber: null, panNumber: null, aadharNumber: null,
    instagramHandle: null, twitter: null, linkedin: null, facebookProfile: null,
    isVerified: i % 3 !== 0,
    referredById: s.referredBy ? uid("cust", s.referredBy) : null,
    notes: null,
    createdAt: iso(addDays(-300 + i * 5)),
    updatedAt: iso(today),
  };
});

// Backfill referredBy + referrals relations
CUSTOMERS.forEach((c) => {
  if (c.referredById) {
    const parent = CUSTOMERS.find((p) => p.id === c.referredById);
    if (parent) {
      c.referredBy = { id: parent.id, name: parent.name, phone: parent.phone };
      parent.referrals = [...(parent.referrals ?? []), { id: c.id, name: c.name, phone: c.phone }];
    }
  }
});

/* ─────────────────────────────  BOOKINGS  ─────────────────────────────── */

const FUNCTION_TYPES = ["Wedding", "Engagement", "Reception", "Sangeet", "Mehendi", "Birthday", "Corporate", "Anniversary", "Annaprashan", "Mundan"];

interface BookingSeed {
  /** offset from today in days */
  day: number;
  customer: number;
  type: string;
  /** 1-based hall indices */
  halls: number[];
  guests: number;
  startHour: number;
  endHour: number; // can be > 24 to spill past midnight (modulo applied)
  templates: { slot: number; tmenu: number }[]; // 1-based meal slot + tmenu
  status?: "confirmed" | "cancelled" | "completed";
  isPencil?: boolean;
  pencilHrs?: number;
  isQuotation?: boolean;
  paid?: number; // amount received so far
  paymentsCount?: number;
  notes?: string;
}

const SEEDS: BookingSeed[] = [
  // ── This week ─────────────────────────────────────────────────────────
  { day: -2, customer: 1,  type: "Wedding",     halls: [1, 2], guests: 850, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }, { slot: 3, tmenu: 4 }], paid: 1800000, paymentsCount: 3 },
  { day: -2, customer: 6,  type: "Birthday",    halls: [9],    guests: 90,  startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 95000,  paymentsCount: 2 },
  { day: -1, customer: 2,  type: "Reception",   halls: [4],    guests: 650, startHour: 19, endHour: 24, templates: [{ slot: 4, tmenu: 2 }], paid: 950000, paymentsCount: 2 },
  { day: 0,  customer: 7,  type: "Engagement",  halls: [7],    guests: 320, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 2 }], paid: 380000, paymentsCount: 2 },
  { day: 0,  customer: 14, type: "Mehendi",     halls: [8],    guests: 180, startHour: 11, endHour: 16, templates: [{ slot: 2, tmenu: 1 }], paid: 140000, paymentsCount: 1 },
  { day: 0,  customer: 22, type: "Corporate",   halls: [10],   guests: 60,  startHour: 12, endHour: 16, templates: [{ slot: 2, tmenu: 4 }], paid: 80000,  paymentsCount: 1 },

  // ── Hall conflict: same hall (1), overlapping times tomorrow ──────────
  { day: 1,  customer: 24, type: "Wedding",     halls: [1, 2], guests: 900, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1500000, paymentsCount: 2, notes: "Big-fat wedding, multi-hall." },
  { day: 1,  customer: 18, type: "Sangeet",     halls: [1],    guests: 350, startHour: 20, endHour: 24, templates: [{ slot: 4, tmenu: 2 }], paid: 0,       paymentsCount: 0, isPencil: true, pencilHrs: 36, notes: "CONFLICT with Wedding on Heritage Hall." },

  { day: 1,  customer: 3,  type: "Mehendi",     halls: [8],    guests: 220, startHour: 11, endHour: 16, templates: [{ slot: 2, tmenu: 1 }, { slot: 3, tmenu: 4 }], paid: 180000, paymentsCount: 2 },
  { day: 2,  customer: 11, type: "Birthday",    halls: [9],    guests: 80,  startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 70000,  paymentsCount: 1 },
  { day: 2,  customer: 28, type: "Wedding",     halls: [4],    guests: 1100, startHour: 19, endHour: 26, templates: [{ slot: 4, tmenu: 3 }], paid: 2200000, paymentsCount: 4 },
  { day: 3,  customer: 5,  type: "Engagement",  halls: [3],    guests: 180, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 130000, paymentsCount: 1, isPencil: true, pencilHrs: 60 },
  { day: 3,  customer: 33, type: "Anniversary", halls: [10],   guests: 50,  startHour: 19, endHour: 22, templates: [{ slot: 4, tmenu: 4 }], paid: 35000,  paymentsCount: 1 },

  // ── Hall conflict #2: Emerald Lawn double-book ──────────────────────
  { day: 4,  customer: 8,  type: "Wedding",     halls: [4, 5], guests: 950, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1200000, paymentsCount: 2 },
  { day: 4,  customer: 19, type: "Reception",   halls: [4],    guests: 700, startHour: 18, endHour: 23, templates: [{ slot: 4, tmenu: 2 }], paid: 0, paymentsCount: 0, isQuotation: true, notes: "CONFLICT with wedding on Emerald Lawn." },

  { day: 5,  customer: 12, type: "Wedding",     halls: [1, 2, 3], guests: 1200, startHour: 19, endHour: 26, templates: [{ slot: 4, tmenu: 3 }, { slot: 3, tmenu: 4 }, { slot: 5, tmenu: 2 }], paid: 2800000, paymentsCount: 5 },
  { day: 5,  customer: 30, type: "Birthday",    halls: [9],    guests: 70,  startHour: 18, endHour: 22, templates: [{ slot: 4, tmenu: 1 }], paid: 55000, paymentsCount: 1 },
  { day: 6,  customer: 16, type: "Sangeet",     halls: [5],    guests: 380, startHour: 19, endHour: 24, templates: [{ slot: 4, tmenu: 2 }], paid: 480000, paymentsCount: 2 },
  { day: 6,  customer: 25, type: "Mehendi",     halls: [6],    guests: 150, startHour: 11, endHour: 16, templates: [{ slot: 2, tmenu: 1 }], paid: 0, paymentsCount: 0, isPencil: true, pencilHrs: 18 },
  { day: 7,  customer: 17, type: "Engagement",  halls: [7],    guests: 280, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 320000, paymentsCount: 2 },
  { day: 7,  customer: 31, type: "Corporate",   halls: [10],   guests: 55,  startHour: 9,  endHour: 13, templates: [{ slot: 1, tmenu: 4 }, { slot: 2, tmenu: 4 }], paid: 60000, paymentsCount: 1 },

  { day: 8,  customer: 38, type: "Reception",   halls: [4],    guests: 800, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1100000, paymentsCount: 2 },
  { day: 9,  customer: 13, type: "Birthday",    halls: [9],    guests: 65,  startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 50000, paymentsCount: 1 },
  { day: 10, customer: 21, type: "Wedding",     halls: [1, 2], guests: 720, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 2 }, { slot: 3, tmenu: 4 }], paid: 1500000, paymentsCount: 3 },
  { day: 10, customer: 29, type: "Mehendi",     halls: [8],    guests: 200, startHour: 11, endHour: 16, templates: [{ slot: 2, tmenu: 1 }], paid: 0, paymentsCount: 0, isQuotation: true },
  { day: 11, customer: 34, type: "Anniversary", halls: [3],    guests: 220, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 2 }], paid: 180000, paymentsCount: 1 },
  { day: 12, customer: 4,  type: "Wedding",     halls: [4, 5], guests: 1000, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1900000, paymentsCount: 3 },
  { day: 13, customer: 20, type: "Engagement",  halls: [7],    guests: 260, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 280000, paymentsCount: 2 },
  { day: 14, customer: 26, type: "Birthday",    halls: [9],    guests: 75,  startHour: 19, endHour: 22, templates: [{ slot: 4, tmenu: 1 }], paid: 58000, paymentsCount: 1 },
  { day: 14, customer: 36, type: "Wedding",     halls: [1, 3], guests: 900, startHour: 19, endHour: 26, templates: [{ slot: 4, tmenu: 3 }, { slot: 5, tmenu: 2 }], paid: 2100000, paymentsCount: 4 },

  { day: 15, customer: 9,  type: "Reception",   halls: [5],    guests: 540, startHour: 19, endHour: 24, templates: [{ slot: 4, tmenu: 2 }], paid: 720000, paymentsCount: 2 },
  { day: 16, customer: 32, type: "Mehendi",     halls: [8],    guests: 170, startHour: 11, endHour: 16, templates: [{ slot: 2, tmenu: 1 }], paid: 110000, paymentsCount: 1 },
  { day: 17, customer: 39, type: "Wedding",     halls: [1, 2], guests: 880, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1600000, paymentsCount: 2 },

  // ── Hall conflict #3: Pearl Lounge double-book in 3 weeks ──────────
  { day: 21, customer: 15, type: "Engagement",  halls: [3],    guests: 200, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 220000, paymentsCount: 2 },
  { day: 21, customer: 27, type: "Birthday",    halls: [3],    guests: 130, startHour: 18, endHour: 22, templates: [{ slot: 4, tmenu: 1 }], paid: 0, paymentsCount: 0, isPencil: true, pencilHrs: 96, notes: "CONFLICT with engagement on Pearl Lounge." },

  // ── Past completed events for reports ─────────────────────────────────
  { day: -10, customer: 1,  type: "Reception",  halls: [2],    guests: 480, startHour: 19, endHour: 24, templates: [{ slot: 4, tmenu: 2 }], paid: 650000, paymentsCount: 2, status: "completed" },
  { day: -15, customer: 7,  type: "Wedding",    halls: [4],    guests: 900, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 3 }], paid: 1800000, paymentsCount: 4, status: "completed" },
  { day: -20, customer: 24, type: "Engagement", halls: [7],    guests: 220, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 1 }], paid: 260000, paymentsCount: 2, status: "completed" },
  { day: -25, customer: 18, type: "Wedding",    halls: [1, 2], guests: 800, startHour: 19, endHour: 25, templates: [{ slot: 4, tmenu: 2 }], paid: 1450000, paymentsCount: 3, status: "completed" },
  { day: -30, customer: 33, type: "Birthday",   halls: [9],    guests: 80,  startHour: 19, endHour: 22, templates: [{ slot: 4, tmenu: 1 }], paid: 62000, paymentsCount: 1, status: "completed" },
  { day: -45, customer: 12, type: "Anniversary",halls: [7],    guests: 240, startHour: 19, endHour: 23, templates: [{ slot: 4, tmenu: 2 }], paid: 290000, paymentsCount: 1, status: "completed" },

  // ── Cancelled examples ─────────────────────────────────────────────────
  { day: 4, customer: 40, type: "Birthday",     halls: [9],    guests: 60,  startHour: 19, endHour: 22, templates: [{ slot: 4, tmenu: 1 }], paid: 10000, paymentsCount: 1, status: "cancelled", notes: "Cancelled by customer; advance forfeited." },
];

const TAX_PCT = 18;

function buildBooking(seed: BookingSeed, idx: number): Booking {
  const bookingId = uid("bkg", idx + 1);
  const date = addDays(seed.day);
  const startHour = seed.startHour;
  const endHour = seed.endHour;
  const startDateTime = at(date, startHour % 24);
  const endDateTime = at(addDays(seed.day + (endHour >= 24 ? 1 : 0)), endHour % 24);

  const customer = CUSTOMERS[seed.customer - 1];

  // Halls
  const halls: BookingHall[] = seed.halls.map((h, i) => {
    const hall = HALLS[h - 1];
    return {
      id: uid(`bh${idx}`, i + 1),
      bookingId,
      hallId: hall.id,
      charges: hall.basePrice ?? 0,
      hall: {
        id: hall.id, name: hall.name, capacity: hall.capacity, banquetId: hall.banquetId,
        banquet: hall.banquet ? { id: hall.banquet.id, name: hall.banquet.name } : undefined,
      },
    };
  });
  const hallTotal = halls.reduce((s, h) => s + h.charges, 0);

  // Packs (each with its own BookingMenu — 1:1)
  const packs: BookingPack[] = seed.templates.map((t, i) => {
    const slot = MEAL_SLOTS[t.slot - 1];
    const tmenu = TEMPLATE_MENUS[t.tmenu - 1];
    const menuId = uid(`bm${idx}`, i + 1);
    const menu: BookingMenu = {
      id: menuId,
      name: tmenu.name,
      description: tmenu.description,
      mealSlotId: slot.id,
      setupCost: tmenu.setupCost,
      ratePerPlate: tmenu.ratePerPlate,
      items: (tmenu.items ?? []).map((ti, k) => ({
        id: uid(`bmi${idx}_${i}`, k + 1),
        bookingMenuId: menuId,
        itemId: ti.itemId,
        quantity: ti.quantity,
        item: ITEMS.find((it) => it.id === ti.itemId)
          ? { id: ti.itemId, name: ITEMS.find((it) => it.id === ti.itemId)!.name, isVeg: ITEMS.find((it) => it.id === ti.itemId)!.isVeg, itemType: ITEMS.find((it) => it.id === ti.itemId)!.itemType }
          : undefined,
      })),
    };

    // Pack times sit inside the event window (lunch/hi-tea/dinner placements)
    const slotStart = slot.startTime;
    const slotEnd = slot.endTime;
    return {
      id: uid(`bp${idx}`, i + 1),
      bookingId,
      mealSlotId: slot.id,
      bookingMenuId: menuId,
      noOfPack: seed.guests,
      packName: `${tmenu.name} — ${slot.name}`,
      packCount: seed.guests,
      hallIds: halls.map((h) => h.hallId),
      hallName: halls.map((h) => h.hall?.name).filter(Boolean).join(" + "),
      ratePerPlate: tmenu.ratePerPlate,
      setupCost: tmenu.setupCost,
      startTime: slotStart,
      endTime: slotEnd,
      startDateTime: iso(at(date, Number(slotStart.split(":")[0]), Number(slotStart.split(":")[1]))),
      endDateTime: iso(at(date, Number(slotEnd.split(":")[0]), Number(slotEnd.split(":")[1]))),
      extraPlate: null, extraRate: null, extraRateValue: null,
      extraAmount: null, extraAmountValue: null,
      menuPoint: null, hallRate: String(hallTotal), hallRateValue: hallTotal,
      boardToRead: null,
      extraCharges: 0,
      timeSlot: `${slotStart}–${slotEnd}`,
      tags: [],
      notes: null,
      mealSlot: { id: slot.id, name: slot.name, startTime: slot.startTime, endTime: slot.endTime },
      bookingMenu: menu,
    };
  });

  const packsTotal = packs.reduce((s, p) => s + p.setupCost + p.ratePerPlate * p.packCount, 0);
  const subtotal = hallTotal + packsTotal;

  // Discounts: alternate VIP customers get an absolute discount; everyone gets 2%
  const discountAmount = customer.priority === 1 ? 25000 : customer.priority === 2 ? 10000 : 0;
  const afterFirst = Math.max(0, subtotal - discountAmount);
  const discountPercentage2nd = 2;
  const second = (afterFirst * discountPercentage2nd) / 100;
  const settlementDiscountPercent = seed.day < -5 ? 1 : null;
  const settlementDiscountAmount = settlementDiscountPercent ? (afterFirst - second) * settlementDiscountPercent / 100 : null;
  const taxable = afterFirst - second - (settlementDiscountAmount ?? 0);
  const taxAmount = (taxable * TAX_PCT) / 100;
  const grandTotal = Math.round(taxable + taxAmount);
  const advanceRequired = Math.round(grandTotal * 0.3);
  const paymentReceived = seed.paid ?? 0;
  const due = Math.max(0, grandTotal - paymentReceived);

  // Payments
  const payments: BookingPayment[] = [];
  const count = seed.paymentsCount ?? (paymentReceived > 0 ? 1 : 0);
  if (count > 0 && paymentReceived > 0) {
    const methods: PaymentMethod[] = ["upi", "bank_transfer", "cheque", "cash", "card"];
    const each = Math.round(paymentReceived / count);
    for (let p = 0; p < count; p++) {
      const amount = p === count - 1 ? paymentReceived - each * (count - 1) : each;
      const method = methods[p % methods.length];
      const receiver = USERS[(idx + p) % USERS.length];
      payments.push({
        id: uid(`pay${idx}`, p + 1),
        bookingId,
        receivedBy: receiver.id,
        amount,
        method,
        paymentMethod: null,
        reference: method === "upi" ? `UPI/${(100000 + idx * 13 + p).toString().slice(-8)}` : method === "cheque" ? `CHQ/${500000 + idx * 7 + p}` : method === "bank_transfer" ? `NEFT/${(900000 + idx * 11 + p).toString().slice(-8)}` : null,
        narration: p === 0 ? "Advance" : p === count - 1 ? "Settlement" : "Part payment",
        paymentDate: iso(addDays(seed.day - (count - p) * 15)),
        clearingDate: method === "cheque" ? iso(addDays(seed.day - (count - p) * 15 + 3)) : null,
        createdAt: iso(addDays(seed.day - (count - p) * 15)),
        receiver: { id: receiver.id, name: receiver.name, email: receiver.email },
      });
    }
  }

  const status: BookingStatus = (seed.status ?? "confirmed") as BookingStatus;
  const isPencil = !!seed.isPencil;

  return {
    id: bookingId,
    customerId: customer.id,
    secondCustomerId: null,
    referredById: customer.referredById,
    rating: Number(customer.rating ?? "0") || 0,
    secondRating: 0, priority: customer.priority, secondPriority: null,

    functionName: `${customer.name} — ${seed.type}`,
    functionType: seed.type,
    functionDate: iso(date),
    functionTime: `${hhmm(startHour % 24)}–${hhmm(endHour % 24)}`,
    startTime: hhmm(startHour % 24),
    endTime: hhmm(endHour % 24),
    startDateTime: iso(startDateTime),
    endDateTime: iso(endDateTime),
    expectedGuests: seed.guests,
    confirmedGuests: status === "completed" ? seed.guests + ((idx % 9) - 4) : null,

    totalAmount: subtotal,
    totalBillAmount: String(subtotal),
    totalBillAmountValue: subtotal,
    finalAmount: String(grandTotal),
    finalAmountValue: grandTotal,

    discountAmount,
    discountPercentage: 0,
    discountAmount2nd: null,
    discountAmount2ndValue: null,
    discountPercentage2nd: String(discountPercentage2nd),
    discountPercentage2ndValue: discountPercentage2nd,

    settlementDiscountPercent,
    settlementDiscountAmount,
    settlementTotalAmount: settlementDiscountAmount ? Math.round(taxable + taxAmount) : null,

    taxAmount,
    grandTotal,

    advanceRequired: String(advanceRequired),
    advanceRequiredValue: advanceRequired,
    paymentReceivedAmount: String(paymentReceived),
    paymentReceivedAmountValue: paymentReceived,
    dueAmount: String(due),
    dueAmountValue: due,

    status,
    isPencilBooking: isPencil,
    pencilExpiresAt: isPencil ? iso(new Date(Date.now() + (seed.pencilHrs ?? 48) * 3600_000)) : null,

    quotation: seed.isQuotation ?? null,
    isQuotation: !!seed.isQuotation,

    isLatest: true,
    previousBookingId: null,
    versionNumber: idx % 11 === 0 ? 2 : 1,

    notes: seed.notes ?? null,
    internalNotes: null,
    createdAt: iso(addDays(seed.day - 30)),
    updatedAt: iso(addDays(seed.day - 1)),

    customer: { id: customer.id, name: customer.name, phone: customer.phone, alternatePhone: customer.alternatePhone, email: customer.email, city: customer.city, priority: customer.priority, rating: customer.rating },
    secondCustomer: null,
    halls,
    packs,
    additionalItems: idx % 7 === 0 ? [
      { id: uid(`add${idx}`, 1), bookingId, description: "DJ + Sound System", charges: 35000, quantity: 1, notes: null },
      { id: uid(`add${idx}`, 2), bookingId, description: "Floral Decor (Premium)", charges: 85000, quantity: 1, notes: null },
    ] : [],
    payments,
    finalizedBooking: status === "completed" ? { id: uid(`fin${idx}`, 1), bookingId, data: { snapshot: true }, finalizedBy: USERS[0].id, finalizedAt: iso(addDays(seed.day + 1)), user: { id: USERS[0].id, name: USERS[0].name } } : null,
  };
}

export const BOOKINGS: Booking[] = SEEDS.map(buildBooking);

/* ─────────────────────────────  ENQUIRIES  ────────────────────────────── */

interface EnquirySeed {
  customer: number; day: number; type: string; halls: number[]; guests: number; stage: EnquiryStatus; quoted?: boolean; pencil?: boolean; pencilHrs?: number;
}
const E_SEEDS: EnquirySeed[] = [
  { customer: 23, day: 18, type: "Wedding",    halls: [1, 2], guests: 850, stage: "pending" },
  { customer: 35, day: 22, type: "Engagement", halls: [7],    guests: 250, stage: "quoted", quoted: true },
  { customer: 37, day: 28, type: "Wedding",    halls: [4],    guests: 1100, stage: "quoted", quoted: true },
  { customer: 10, day: 19, type: "Birthday",   halls: [9],    guests: 70,  stage: "pending" },
  { customer: 40, day: 25, type: "Reception",  halls: [5],    guests: 480, stage: "quoted", quoted: true, pencil: true, pencilHrs: 72 },
  { customer: 32, day: 30, type: "Mehendi",    halls: [8],    guests: 200, stage: "pending" },
  { customer: 6,  day: 35, type: "Wedding",    halls: [1, 2], guests: 800, stage: "converted" },
  { customer: 13, day: 40, type: "Anniversary",halls: [3],    guests: 200, stage: "cancelled" },
  { customer: 19, day: 32, type: "Corporate",  halls: [10],   guests: 60,  stage: "quoted", quoted: true },
  { customer: 31, day: 45, type: "Sangeet",    halls: [5],    guests: 400, stage: "pending" },
  { customer: 26, day: 50, type: "Wedding",    halls: [4, 5], guests: 950, stage: "pending" },
  { customer: 17, day: 26, type: "Engagement", halls: [7],    guests: 300, stage: "converted" },
  { customer: 28, day: 55, type: "Reception",  halls: [1],    guests: 700, stage: "pending" },
  { customer: 3,  day: 60, type: "Wedding",    halls: [4],    guests: 1000, stage: "quoted", quoted: true, pencil: true, pencilHrs: 120 },
  { customer: 11, day: 38, type: "Birthday",   halls: [9],    guests: 80,  stage: "cancelled" },
];

export const ENQUIRIES: Enquiry[] = E_SEEDS.map((s, i) => {
  const cust = CUSTOMERS[s.customer - 1];
  const date = addDays(s.day);
  return {
    id: uid("enq", i + 1),
    customerId: cust.id,
    functionName: `${cust.name} — ${s.type}`,
    functionType: s.type,
    functionDate: iso(date),
    functionTime: "19:00–23:30",
    startTime: "19:00", endTime: "23:30",
    startDateTime: iso(at(date, 19)), endDateTime: iso(at(addDays(s.day + 1), 0)),
    expectedGuests: s.guests,
    budgetPerPlate: 800 + (i % 6) * 150,
    specialRequirements: i % 3 === 0 ? "Need separate veg/non-veg sections." : null,
    quotation: !!s.quoted, pencilBooking: !!s.pencil,
    validity: s.quoted ? iso(addDays(s.day - 7)) : null,
    note: null,
    status: s.stage,
    isPencilBooked: !!s.pencil,
    pencilBookedUntil: s.pencil ? iso(new Date(Date.now() + (s.pencilHrs ?? 48) * 3600_000)) : null,
    quotationSent: !!s.quoted,
    quotationValidUntil: s.quoted ? iso(addDays(s.day - 5)) : null,
    notes: null,
    createdAt: iso(addDays(s.day - 30)),
    updatedAt: iso(addDays(s.day - 5)),
    customer: { id: cust.id, name: cust.name, phone: cust.phone, email: cust.email },
    halls: s.halls.map((h, k) => {
      const hall = HALLS[h - 1];
      return { id: uid(`eh${i}`, k + 1), hallId: hall.id, hall: { id: hall.id, name: hall.name } };
    }),
    packs: [
      {
        id: uid(`ep${i}`, 1),
        mealSlotId: MEAL_SLOTS[3].id,
        templateMenuId: TEMPLATE_MENUS[1].id,
        packCount: s.guests,
        timeSlot: "19:30–23:30",
        notes: null,
        mealSlot: { id: MEAL_SLOTS[3].id, name: MEAL_SLOTS[3].name },
        templateMenu: { id: TEMPLATE_MENUS[1].id, name: TEMPLATE_MENUS[1].name, ratePerPlate: TEMPLATE_MENUS[1].ratePerPlate },
      },
    ],
  };
});

/* ────────────────────  GOOGLE CALENDAR OVERLAYS  ──────────────────────── */

export const GOOGLE_EVENTS: GoogleCalendarEvent[] = [
  { id: uid("gcal", 1), googleEventId: "g_001", calendarId: "bika1@group.calendar.google.com", venueName: "Bika 1", title: "Site Visit — Anand family", description: "Walkthrough + tasting.", location: "Heritage Hall", status: "confirmed", start: iso(at(addDays(1), 10)), end: iso(at(addDays(1), 11, 30)), isAllDay: false, htmlLink: "#", origin: "google" },
  { id: uid("gcal", 2), googleEventId: "g_002", calendarId: "bika2@group.calendar.google.com", venueName: "Bika 2", title: "Maintenance — AC service", location: "Sapphire Hall", status: "confirmed", start: iso(at(addDays(2), 9)), end: iso(at(addDays(2), 12)), isAllDay: false, origin: "google" },
  { id: uid("gcal", 3), googleEventId: "g_003", calendarId: "rangoli@group.calendar.google.com", venueName: "Rangoli", title: "Pre-bridal photoshoot", location: "Diya Hall", status: "confirmed", start: iso(at(addDays(3), 14)), end: iso(at(addDays(3), 17)), isAllDay: false, origin: "google" },
  { id: uid("gcal", 4), googleEventId: "g_004", calendarId: "bika1@group.calendar.google.com", venueName: "Bika 1", title: "Vendor meeting — Florist", location: "Pearl Lounge", status: "tentative", start: iso(at(addDays(5), 16)), end: iso(at(addDays(5), 17, 30)), isAllDay: false, origin: "google" },
];

/* ───────────────────────────  AUDIT LOG  ──────────────────────────────── */

const AUDIT_ACTIONS = ["create", "update", "delete", "finalize", "payment.record", "login", "pencil.expire"] as const;
const AUDIT_RESOURCES = ["booking", "customer", "payment", "enquiry", "hall", "template_menu", "user"] as const;
export const AUDIT_LOGS: AuditLog[] = Array.from({ length: 60 }).map((_, i) => {
  const user = USERS[i % USERS.length];
  const action = AUDIT_ACTIONS[i % AUDIT_ACTIONS.length];
  const resource = AUDIT_RESOURCES[i % AUDIT_RESOURCES.length];
  const sampleBooking = BOOKINGS[i % BOOKINGS.length];
  return {
    id: uid("audit", i + 1),
    userId: user.id,
    userName: user.name,
    action,
    resource,
    resourceId: sampleBooking.id,
    resourceLabel: sampleBooking.functionName,
    details: { note: `${action} on ${resource}` },
    ipAddress: `10.0.${i % 8}.${(i * 17) % 250}`,
    createdAt: iso(new Date(Date.now() - i * 47 * 60_000)),
  };
});

/* ────────────────────────────  ACCESSORS  ─────────────────────────────── */

export const customerById = (id: string) => CUSTOMERS.find((c) => c.id === id);
export const hallById = (id: string) => HALLS.find((h) => h.id === id);
export const banquetById = (id: string) => BANQUETS.find((b) => b.id === id);
export const bookingById = (id: string) => BOOKINGS.find((b) => b.id === id);
export const userById = (id: string) => USERS.find((u) => u.id === id);
export const itemById = (id: string) => ITEMS.find((i) => i.id === id);
export const itemTypeById = (id: string) => ITEM_TYPES.find((t) => t.id === id);
export const mealSlotById = (id: string) => MEAL_SLOTS.find((s) => s.id === id);
export const templateMenuById = (id: string) => TEMPLATE_MENUS.find((t) => t.id === id);
export const ingredientById = (id: string) => INGREDIENTS.find((i) => i.id === id);
export const vendorById = (id: string) => VENDORS.find((v) => v.id === id);

/* ─────────────────────  DERIVED MONEY (server math)  ──────────────────── */

export interface MoneyBreakdown {
  hallTotal: number;
  packsTotal: number;
  subtotal: number;
  discountAmount: number;
  afterFirstDiscount: number;
  discountPercentage2nd: number;
  secondDiscount: number;
  settlementDiscountAmount: number;
  taxable: number;
  taxAmount: number;
  grandTotal: number;
  advanceRequired: number;
  paymentReceived: number;
  due: number;
  paidPct: number;
}

/** Re-derive the money stack from booking fields — matches buildBooking math. */
export function bookingMoney(b: Booking): MoneyBreakdown {
  const hallTotal = (b.halls ?? []).reduce((s, h) => s + h.charges, 0);
  const packsTotal = (b.packs ?? []).reduce((s, p) => s + p.setupCost + p.ratePerPlate * p.packCount, 0);
  const subtotal = b.totalBillAmountValue ?? hallTotal + packsTotal;
  const discountAmount = b.discountAmount ?? 0;
  const afterFirstDiscount = Math.max(0, subtotal - discountAmount);
  const discountPercentage2nd = b.discountPercentage2ndValue ?? 0;
  const secondDiscount = (afterFirstDiscount * discountPercentage2nd) / 100;
  const settlementDiscountAmount = b.settlementDiscountAmount ?? 0;
  const taxable = afterFirstDiscount - secondDiscount - settlementDiscountAmount;
  const taxAmount = b.taxAmount;
  const grandTotal = b.grandTotal || Math.round(taxable + taxAmount);
  const advanceRequired = b.advanceRequiredValue ?? 0;
  const paymentReceived = b.paymentReceivedAmountValue ?? (b.payments ?? []).reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, grandTotal - paymentReceived);
  const paidPct = grandTotal > 0 ? Math.min(100, Math.round((paymentReceived / grandTotal) * 100)) : 0;
  return { hallTotal, packsTotal, subtotal, discountAmount, afterFirstDiscount, discountPercentage2nd, secondDiscount, settlementDiscountAmount, taxable, taxAmount, grandTotal, advanceRequired, paymentReceived, due, paidPct };
}
