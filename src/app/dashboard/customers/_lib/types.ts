export interface CustomerFormData {
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

/** List-row projection returned by GET /customers. */
export interface CustomerRow {
  id: string;
  name: string;
  phoneCountryCode?: string | null;
  phone: string;
  alterPhone?: string | null;
  alternatePhone?: string | null;
  whatsappNumber?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  createdAt: string;
  _count?: {
    enquiries?: number;
    bookings?: number;
  };
}

export interface CustomerDetailBooking {
  id: string;
  functionName: string;
  functionDate: string;
  status: string;
  grandTotal?: number | null;
}

export interface CustomerDetailData {
  id: string;
  name: string;
  phone: string;
  phoneCountryCode?: string | null;
  alterPhone?: string | null;
  alternatePhone?: string | null;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  caste?: string | null;
  occupation?: string | null;
  companyName?: string | null;
  gstNumber?: string | null;
  panNumber?: string | null;
  dateOfBirth?: string | null;
  anniversary?: string | null;
  priority?: number | null;
  rating?: string | null;
  visitCount?: number | null;
  notes?: string | null;
  createdAt: string;
  referredBy?: { id: string; name: string } | null;
  referrals?: Array<{ id: string; name: string }>;
  bookings?: CustomerDetailBooking[];
}

export type PhoneFieldErrors = {
  phone?: string;
  alterPhone?: string;
  whatsappNumber?: string;
};

export type ColumnSearch = {
  name: string;
  contact: string;
  location: string;
  stats: string;
  createdAt: string;
};

export const initialColumnSearch: ColumnSearch = {
  name: '',
  contact: '',
  location: '',
  stats: '',
  createdAt: '',
};

export const CUSTOMERS_PAGE_SIZE = 100;

export function customerInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
