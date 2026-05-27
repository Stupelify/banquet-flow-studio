export type BookingStatus = "confirmed" | "pencil" | "quotation" | "enquiry" | "cancelled";
export type EventSource = "in-app" | "google";

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

export type MealPack = {
  slot: "Breakfast" | "Lunch" | "Hi-Tea" | "Dinner";
  menuName: string;
  plates: number;
  ratePerPlate: number;
  setupCost: number;
};

export type Payment = {
  id: string;
  date: Date;
  method: "Cash" | "UPI" | "Card" | "Cheque" | "Bank Transfer";
  ref?: string;
  amount: number;
  receivedBy: string;
};

export type Booking = {
  id: string;
  status: BookingStatus;
  source: EventSource;
  functionName: string;
  functionType: string;
  customerId: string;
  start: Date;
  end: Date;
  hallIds: string[];
  expectedGuests: number;
  confirmedGuests: number;
  packs: MealPack[];
  hallCharges: number;
  extras: { label: string; amount: number }[];
  discount1: number; // amount
  discount2Pct: number; // percent
  settlementDiscount: number;
  taxPct: number;
  advanceRequired: number;
  payments: Payment[];
  notes?: string;
  pencilExpiresAt?: Date;
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
