import type { Booking, Customer, Enquiry, Hall, Venue } from "./types";

export const VENUES: Venue[] = [
  { id: "v1", name: "Royal Banquets — Andheri", city: "Mumbai" },
  { id: "v2", name: "Heritage Plaza — Bandra", city: "Mumbai" },
  { id: "v3", name: "Garden Pavilion — Thane", city: "Thane" },
];

export const HALLS: Hall[] = [
  { id: "h1", venueId: "v1", name: "Grand Ballroom", capacity: 1200, floatingCapacity: 1500, floor: "G", basePrice: 250000 },
  { id: "h2", venueId: "v1", name: "Crystal Hall", capacity: 450, floatingCapacity: 550, floor: "1", basePrice: 120000 },
  { id: "h3", venueId: "v1", name: "Emerald Lounge", capacity: 200, floatingCapacity: 250, floor: "1", basePrice: 60000 },
  { id: "h4", venueId: "v1", name: "Sapphire Court", capacity: 150, floatingCapacity: 180, floor: "2", basePrice: 45000 },
  { id: "h5", venueId: "v2", name: "Imperial Suite", capacity: 800, floatingCapacity: 1000, floor: "G", basePrice: 180000 },
  { id: "h6", venueId: "v2", name: "Diamond Hall", capacity: 400, floatingCapacity: 500, floor: "1", basePrice: 110000 },
  { id: "h7", venueId: "v2", name: "Pearl Banquet", capacity: 250, floatingCapacity: 300, floor: "1", basePrice: 75000 },
  { id: "h8", venueId: "v3", name: "Garden Lawn", capacity: 2000, floatingCapacity: 2500, floor: "G", basePrice: 320000 },
  { id: "h9", venueId: "v3", name: "Terrace Hall", capacity: 600, floatingCapacity: 700, floor: "2", basePrice: 140000 },
  { id: "h10", venueId: "v3", name: "Rose Pavilion", capacity: 300, floatingCapacity: 350, floor: "G", basePrice: 90000 },
];

const FIRST = ["Aditi", "Rahul", "Priya", "Suresh", "Vikram", "Anjali", "Rohit", "Sneha", "Karan", "Megha", "Arjun", "Pooja", "Nikhil", "Riya", "Aryan", "Kavya", "Sahil", "Tanvi", "Devansh", "Ishita"];
const LAST = ["Sharma", "Iyer", "Khan", "Patel", "Mehta", "Verma", "Khanna", "Bajaj", "Malhotra", "Reddy", "Gupta", "Singh", "Nair", "Joshi", "Kapoor", "Agarwal", "Chopra", "Desai"];
const TYPES = ["Wedding Reception", "Engagement", "Sangeet", "Mehendi", "Birthday", "Anniversary", "Corporate Meet", "Product Launch", "Conference", "Cocktail"];
const COMMUNITIES = ["Marwari", "Gujarati", "Punjabi", "South Indian", "Bengali", "Maharashtrian"];
const MENUS = ["Royal North Indian", "Premium Veg Thali", "Mughlai Special", "South Indian Feast", "Continental Buffet", "Punjabi Tadka"];

function rand<T>(arr: T[], seed: number): T { return arr[seed % arr.length]; }
function rint(min: number, max: number, seed: number): number {
  const x = Math.sin(seed) * 10000;
  return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
}

export const CUSTOMERS: Customer[] = Array.from({ length: 40 }, (_, i) => {
  const fn = rand(FIRST, i * 7 + 3);
  const ln = rand(LAST, i * 11 + 5);
  return {
    id: `c${i + 1}`,
    name: `${fn} ${ln}`,
    phone: `+91 9${rint(10000, 99999, i + 100)}${rint(10000, 99999, i + 200)}`.replace(/\s+/g, " ").slice(0, 16),
    altPhone: i % 3 === 0 ? `+91 9${rint(10000, 99999, i + 300)}${rint(10000, 99999, i + 400)}`.slice(0, 16) : undefined,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@gmail.com`,
    community: rand(COMMUNITIES, i),
    city: rand(["Mumbai", "Pune", "Thane", "Navi Mumbai", "Delhi"], i),
    dob: new Date(1970 + (i % 25), i % 12, (i % 27) + 1),
    anniversary: i % 4 === 0 ? new Date(2010 + (i % 12), (i + 3) % 12, ((i + 5) % 27) + 1) : undefined,
    occupation: rand(["Business Owner", "Doctor", "CA", "Engineer", "Architect", "Lawyer"], i),
    company: i % 2 === 0 ? `${ln} Enterprises` : undefined,
    gst: i % 3 === 0 ? `27AAAPL${rint(1000, 9999, i)}C1Z${rint(0, 9, i)}` : undefined,
    pan: `AAAPL${rint(1000, 9999, i)}C`,
    priority: i % 7 === 0 ? "VIP" : i % 3 === 0 ? "High" : "Normal",
    rating: rint(3, 5, i),
    visitCount: rint(1, 12, i),
    referredBy: i > 5 && i % 4 === 0 ? `c${(i - 3)}` : undefined,
    referrals: [],
  };
});
// fill referrals
CUSTOMERS.forEach((c) => {
  if (c.referredBy) {
    const ref = CUSTOMERS.find((x) => x.id === c.referredBy);
    if (ref) ref.referrals.push(c.id);
  }
});

// Booking generation — span -10 to +50 days from today
const today = new Date();
today.setHours(0, 0, 0, 0);

function mkDate(dayOffset: number, hour: number, min = 0): Date {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d;
}

type Seed = {
  dayOffset: number; startH: number; endH: number;
  hallIds: string[]; status: Booking["status"]; source?: Booking["source"];
  guests: number; slot: Booking["packs"][0]["slot"]; rate: number;
  customerIdx: number; type: string; functionName?: string;
  pencilExpHours?: number;
};

const SEEDS: Seed[] = [
  // Today — busy day with a conflict
  { dayOffset: 0, startH: 10, endH: 15, hallIds: ["h1"], status: "confirmed", guests: 850, slot: "Lunch", rate: 1850, customerIdx: 0, type: "Wedding Reception" },
  { dayOffset: 0, startH: 14, endH: 19, hallIds: ["h1"], status: "confirmed", guests: 300, slot: "Hi-Tea", rate: 950, customerIdx: 1, type: "Engagement" }, // CONFLICT with above on h1
  { dayOffset: 0, startH: 18, endH: 23, hallIds: ["h2"], status: "pencil", pencilExpHours: 4, guests: 250, slot: "Dinner", rate: 1450, customerIdx: 2, type: "Corporate Meet" },
  { dayOffset: 0, startH: 11, endH: 21, hallIds: ["h3"], status: "confirmed", guests: 150, slot: "Lunch", rate: 1200, customerIdx: 3, type: "Birthday" },
  { dayOffset: 0, startH: 19, endH: 23, hallIds: ["h5"], status: "confirmed", guests: 600, slot: "Dinner", rate: 2100, customerIdx: 4, type: "Sangeet" },
  { dayOffset: 0, startH: 12, endH: 16, hallIds: ["h8"], status: "confirmed", guests: 1800, slot: "Lunch", rate: 1650, customerIdx: 5, type: "Wedding Reception" },
  { dayOffset: 0, startH: 9, endH: 12, hallIds: ["h6"], status: "confirmed", source: "google", guests: 120, slot: "Breakfast", rate: 850, customerIdx: 6, type: "Conference" },
  // +1
  { dayOffset: 1, startH: 11, endH: 16, hallIds: ["h1"], status: "confirmed", guests: 1000, slot: "Lunch", rate: 1950, customerIdx: 7, type: "Wedding Reception" },
  { dayOffset: 1, startH: 18, endH: 23, hallIds: ["h2", "h3"], status: "confirmed", guests: 400, slot: "Dinner", rate: 1750, customerIdx: 8, type: "Anniversary" },
  { dayOffset: 1, startH: 14, endH: 18, hallIds: ["h7"], status: "pencil", pencilExpHours: 22, guests: 180, slot: "Hi-Tea", rate: 1100, customerIdx: 9, type: "Product Launch" },
  // +2 — another conflict
  { dayOffset: 2, startH: 19, endH: 23, hallIds: ["h5"], status: "confirmed", guests: 700, slot: "Dinner", rate: 1900, customerIdx: 10, type: "Sangeet" },
  { dayOffset: 2, startH: 20, endH: 23, hallIds: ["h5"], status: "pencil", pencilExpHours: 8, guests: 200, slot: "Dinner", rate: 1500, customerIdx: 11, type: "Cocktail" }, // CONFLICT
  { dayOffset: 2, startH: 11, endH: 14, hallIds: ["h8"], status: "confirmed", guests: 1500, slot: "Lunch", rate: 1700, customerIdx: 12, type: "Wedding Reception" },
  { dayOffset: 2, startH: 16, endH: 22, hallIds: ["h9"], status: "confirmed", guests: 500, slot: "Dinner", rate: 1600, customerIdx: 13, type: "Mehendi" },
  // +3
  { dayOffset: 3, startH: 10, endH: 22, hallIds: ["h1", "h2"], status: "confirmed", guests: 1100, slot: "Dinner", rate: 2200, customerIdx: 14, type: "Wedding Reception", functionName: "Bajaj Diamond Jubilee" },
  { dayOffset: 3, startH: 12, endH: 16, hallIds: ["h6"], status: "quotation", guests: 300, slot: "Lunch", rate: 1350, customerIdx: 15, type: "Conference" },
  { dayOffset: 3, startH: 18, endH: 23, hallIds: ["h10"], status: "confirmed", guests: 280, slot: "Dinner", rate: 1450, customerIdx: 16, type: "Engagement" },
  // +4
  { dayOffset: 4, startH: 19, endH: 23, hallIds: ["h8"], status: "confirmed", guests: 2000, slot: "Dinner", rate: 2400, customerIdx: 17, type: "Wedding Reception" },
  { dayOffset: 4, startH: 11, endH: 15, hallIds: ["h3"], status: "enquiry", guests: 100, slot: "Lunch", rate: 1100, customerIdx: 18, type: "Birthday" },
  { dayOffset: 4, startH: 14, endH: 18, hallIds: ["h7"], status: "confirmed", source: "google", guests: 220, slot: "Hi-Tea", rate: 1000, customerIdx: 19, type: "Corporate Meet" },
  // +5..+15 spread
  ...Array.from({ length: 35 }, (_, k): Seed => {
    const i = k + 20;
    const day = 5 + (k % 25);
    const statusPool: Booking["status"][] = ["confirmed", "confirmed", "confirmed", "pencil", "quotation", "enquiry", "confirmed"];
    const startH = 9 + ((i * 3) % 12);
    const endH = Math.min(startH + 3 + ((i * 7) % 6), 23);
    const hallPool = ["h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10"];
    const hall = hallPool[i % hallPool.length];
    return {
      dayOffset: day,
      startH, endH,
      hallIds: i % 5 === 0 ? [hall, hallPool[(i + 2) % hallPool.length]] : [hall],
      status: statusPool[i % statusPool.length],
      pencilExpHours: statusPool[i % statusPool.length] === "pencil" ? 24 + (i % 48) : undefined,
      guests: 100 + ((i * 37) % 1500),
      slot: (["Breakfast", "Lunch", "Hi-Tea", "Dinner"] as const)[i % 4],
      rate: 850 + ((i * 53) % 1600),
      customerIdx: i % CUSTOMERS.length,
      type: rand(TYPES, i),
    };
  }),
  // Past completed (for history)
  ...Array.from({ length: 10 }, (_, k): Seed => {
    const i = k + 100;
    return {
      dayOffset: -1 - (k % 10), startH: 18, endH: 23,
      hallIds: [["h1", "h5", "h8", "h2"][k % 4]],
      status: "confirmed", guests: 300 + (k * 80),
      slot: "Dinner", rate: 1200 + (k * 100),
      customerIdx: (k * 3) % CUSTOMERS.length,
      type: rand(TYPES, i),
    };
  }),
];

export const BOOKINGS: Booking[] = SEEDS.map((s, i) => {
  const c = CUSTOMERS[s.customerIdx];
  const start = mkDate(s.dayOffset, s.startH);
  const end = mkDate(s.dayOffset, s.endH);
  const hallCharges = s.hallIds.reduce((sum, hid) => sum + (HALLS.find((h) => h.id === hid)?.basePrice ?? 0), 0);
  const plates = s.guests;
  const packs = [{
    slot: s.slot, menuName: rand(MENUS, i),
    plates, ratePerPlate: s.rate, setupCost: 25000,
  }];
  const subTotal = hallCharges + plates * s.rate + 25000;
  const advancePct = s.status === "confirmed" ? (i % 3 === 0 ? 50 : i % 3 === 1 ? 35 : 70) : s.status === "pencil" ? 10 : 0;
  const advanceRequired = Math.round(subTotal * 0.4);
  const advanceReceived = Math.round(subTotal * (advancePct / 100));
  const payments = advanceReceived > 0 ? [
    { id: `p${i}a`, date: new Date(start.getTime() - 14 * 86400000), method: "Bank Transfer" as const, ref: `NEFT${1000 + i}`, amount: Math.round(advanceReceived * 0.6), receivedBy: "Suresh" },
    { id: `p${i}b`, date: new Date(start.getTime() - 7 * 86400000), method: "UPI" as const, ref: `UPI${2000 + i}`, amount: advanceReceived - Math.round(advanceReceived * 0.6), receivedBy: "Anita" },
  ] : [];
  return {
    id: `BK-${9000 + i}`,
    status: s.status,
    source: s.source ?? "in-app",
    functionName: s.functionName ?? `${c.name.split(" ")[0]} ${s.type}`,
    functionType: s.type,
    customerId: c.id,
    start, end,
    hallIds: s.hallIds,
    expectedGuests: s.guests,
    confirmedGuests: s.status === "confirmed" ? s.guests : 0,
    packs,
    hallCharges,
    extras: i % 4 === 0 ? [{ label: "Floral Decor", amount: 125000 }] : [],
    discount1: i % 5 === 0 ? 50000 : 0,
    discount2Pct: i % 7 === 0 ? 5 : 0,
    settlementDiscount: 0,
    taxPct: 18,
    advanceRequired,
    payments,
    notes: i % 6 === 0 ? "VIP — manager to greet personally" : undefined,
    pencilExpiresAt: s.pencilExpHours ? new Date(Date.now() + s.pencilExpHours * 3_600_000) : undefined,
    versions: 1 + (i % 4),
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
  return { sub, afterD1, afterD2, afterSettle, tax, grand, received, balance: grand - received };
}

export const ENQUIRIES: Enquiry[] = Array.from({ length: 18 }, (_, i): Enquiry => {
  const stages: Enquiry["stage"][] = ["Lead", "Lead", "Quotation", "Quotation", "Pencil", "Won", "Lost"];
  const c = CUSTOMERS[(i * 5) % CUSTOMERS.length];
  return {
    id: `EN-${500 + i}`,
    customerId: c.id,
    functionType: rand(TYPES, i),
    date: mkDate(7 + (i * 3) % 45, 18),
    expectedGuests: 100 + ((i * 73) % 900),
    hallIds: [HALLS[i % HALLS.length].id],
    stage: stages[i % stages.length],
    estValue: 200000 + ((i * 87654) % 2000000),
    createdAt: new Date(Date.now() - (i + 1) * 86400000),
    notes: i % 3 === 0 ? "Followed up via WhatsApp" : undefined,
  };
});

export function customerById(id: string) { return CUSTOMERS.find((c) => c.id === id)!; }
export function hallById(id: string) { return HALLS.find((h) => h.id === id)!; }
export function venueById(id: string) { return VENUES.find((v) => v.id === id)!; }
