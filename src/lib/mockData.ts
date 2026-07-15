// Dynamic LocalStorage database for Mocking the Backend in Lovable preview with real data

import type {
  AuthUser,
  Banquet,
  Booking,
  BookingPayment,
  Customer,
  Enquiry,
  Hall,
  Ingredient,
  Item,
  ItemType,
  Role,
  Permission,
  TemplateMenu,
  User,
  Vendor,
  AuditLog
} from '@/types/api';

// Helper to get or set localStorage data
function getStorage<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(`bika_mock_${key}`);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }
  return defaultValue;
}

function setStorage<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(`bika_mock_${key}`, JSON.stringify(value));
  }
}

// ── In-Memory Store Initialization ──────────────────────────────────────────

export const store = {
  banquets: getStorage<Banquet[]>('banquets', []),
  halls: getStorage<Hall[]>('halls', []),
  customers: getStorage<Customer[]>('customers', []),
  itemTypes: getStorage<ItemType[]>('itemTypes', []),
  items: getStorage<Item[]>('items', []),
  templateMenus: getStorage<TemplateMenu[]>('templateMenus', []),
  bookings: getStorage<Booking[]>('bookings', []),
  enquiries: getStorage<Enquiry[]>('enquiries', []),
  ingredients: getStorage<Ingredient[]>('ingredients', []),
  vendors: getStorage<Vendor[]>('vendors', []),
  auditLogs: getStorage<AuditLog[]>('auditLogs', [])
};

// Update storage helpers
const saveStore = (key: keyof typeof store) => {
  setStorage(key, store[key]);
};

// ── Async Exporter Loader ───────────────────────────────────────────────────

let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem('bika_mock_initialized') === 'true') {
    // If store is empty in-memory but initialized in localStorage, reload it
    if (store.customers.length === 0 && localStorage.getItem('bika_mock_customers')) {
      store.banquets = getStorage('banquets', []);
      store.halls = getStorage('halls', []);
      store.customers = getStorage('customers', []);
      store.itemTypes = getStorage('itemTypes', []);
      store.items = getStorage('items', []);
      store.templateMenus = getStorage('templateMenus', []);
      store.bookings = getStorage('bookings', []);
      store.enquiries = getStorage('enquiries', []);
      store.ingredients = getStorage('ingredients', []);
      store.vendors = getStorage('vendors', []);
      store.auditLogs = getStorage('auditLogs', []);
    }
    return;
  }
  if (initPromise) return initPromise;

  console.log('Loading database snapshot from mock-db.json...');
  initPromise = fetch('/mock-db.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
      return res.json();
    })
    .then((data) => {
      // Save tables to localStorage
      Object.keys(data).forEach((key) => {
        localStorage.setItem(`bika_mock_${key}`, JSON.stringify(data[key]));
      });
      localStorage.setItem('bika_mock_initialized', 'true');
      
      // Load into in-memory store
      store.banquets = data.banquets || [];
      store.halls = data.halls || [];
      store.customers = data.customers || [];
      store.itemTypes = data.itemTypes || [];
      store.items = data.items || [];
      store.templateMenus = data.templateMenus || [];
      store.bookings = data.bookings || [];
      store.enquiries = data.enquiries || [];
      store.ingredients = data.ingredients || [];
      store.vendors = data.vendors || [];
      store.auditLogs = data.auditLogs || [];
      
      console.log('Database snapshot loaded successfully!');
    })
    .catch((err) => {
      console.error('Failed to load mock-db.json snapshot, using empty database', err);
      localStorage.setItem('bika_mock_initialized', 'true');
    });
    
  return initPromise;
}

// ── CRUD Mock Implementations ───────────────────────────────────────────────

export const mockDb = {
  // Auth
  getCurrentUser: (): AuthUser => ({
    id: 'admin-id',
    email: 'admin@bikabanquet.com',
    name: 'Bika Admin',
    roles: ['admin'],
    permissions: [
      'view_dashboard',
      'view_bookings',
      'manage_bookings',
      'view_customers',
      'manage_customers',
      'view_enquiries',
      'manage_enquiries',
      'view_users',
      'manage_users',
      'view_halls',
      'manage_halls',
      'view_items',
      'manage_items',
      'view_vendors',
      'manage_vendors'
    ],
    hasAllVenueAccess: true
  }),

  // Customers
  getCustomers: async (params?: any) => {
    await ensureInitialized();
    let list = [...store.customers];
    const search = params?.search?.toLowerCase();
    if (search) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.phone.includes(search) ||
          (c.email && c.email.toLowerCase().includes(search))
      );
    }
    const page = Number(params?.page || 1);
    const limit = Number(params?.limit || 10);
    const start = (page - 1) * limit;
    const paginated = list.slice(start, start + limit);

    return {
      customers: paginated,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit)
      }
    };
  },

  getCustomer: async (id: string): Promise<Customer> => {
    await ensureInitialized();
    const cust = store.customers.find((c) => c.id === id);
    if (!cust) throw new Error('Customer not found');
    return {
      ...cust,
      bookings: store.bookings.filter((b) => b.customerId === id),
      enquiries: store.enquiries.filter((e) => e.customerId === id)
    };
  },

  createCustomer: async (input: any): Promise<Customer> => {
    await ensureInitialized();
    const nextId = `customer-${Date.now()}`;
    const newCust: Customer = {
      ...input,
      id: nextId,
      visitCount: 0,
      phoneVerified: false,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as Customer;
    store.customers.unshift(newCust);
    saveStore('customers');
    return newCust;
  },

  updateCustomer: async (id: string, input: any): Promise<Customer> => {
    await ensureInitialized();
    const index = store.customers.findIndex((c) => c.id === id);
    if (index === -1) throw new Error('Customer not found');
    const updated = {
      ...store.customers[index],
      ...input,
      updatedAt: new Date().toISOString()
    };
    store.customers[index] = updated;
    saveStore('customers');
    return updated;
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await ensureInitialized();
    store.customers = store.customers.filter((c) => c.id !== id);
    saveStore('customers');
  },

  search: async (q: string) => {
    await ensureInitialized();
    const query = q.toLowerCase();
    const customers = store.customers
      .filter((c) => c.name.toLowerCase().includes(query) || c.phone.includes(query))
      .map((c) => ({
        id: c.id,
        label: c.name,
        secondary: c.phone,
        href: `/dashboard/customers/${c.id}`,
        type: 'customer' as const
      }));

    const bookings = store.bookings
      .filter((b) => b.functionName.toLowerCase().includes(query))
      .map((b) => ({
        id: b.id,
        label: b.functionName,
        secondary: b.functionDate,
        href: `/dashboard/bookings/${b.id}`,
        type: 'booking' as const,
        functionDate: b.functionDate
      }));

    const enquiries = store.enquiries
      .filter((e) => e.functionName.toLowerCase().includes(query))
      .map((e) => ({
        id: e.id,
        label: e.functionName,
        secondary: e.functionDate,
        href: `/dashboard/enquiries/${e.id}`,
        type: 'enquiry' as const,
        functionDate: e.functionDate
      }));

    return {
      bookings,
      customers,
      enquiries
    };
  },

  // Bookings
  getBookings: async (params?: any) => {
    await ensureInitialized();
    let list = [...store.bookings];
    
    // Sort
    const sort = params?.sort || 'createdAt';
    const order = params?.order || 'desc';
    list.sort((a: any, b: any) => {
      const valA = a[sort] || '';
      const valB = b[sort] || '';
      return order === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
    });

    // Exclude cancelled
    if (params?.excludeCancelled === true || params?.excludeCancelled === 'true') {
      list = list.filter((b) => b.status !== 'cancelled');
    }

    const page = Number(params?.page || 1);
    const limit = Number(params?.limit || 10);
    const start = (page - 1) * limit;
    
    // Embed customer
    const populated = list.slice(start, start + limit).map((booking) => ({
      ...booking,
      customer: store.customers.find((c) => c.id === booking.customerId)
    }));

    return {
      bookings: populated,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit)
      }
    };
  },

  getBookingsCalendarRange: async (params: { fromDate: string; toDate: string }) => {
    await ensureInitialized();
    const list = store.bookings.filter(
      (b) => b.functionDate >= params.fromDate && b.functionDate <= params.toDate
    ).map((b) => ({
      ...b,
      customer: store.customers.find((c) => c.id === b.customerId)
    }));
    return { bookings: list };
  },

  getBooking: async (id: string): Promise<Booking> => {
    await ensureInitialized();
    const item = store.bookings.find((b) => b.id === id);
    if (!item) throw new Error('Booking not found');
    return {
      ...item,
      customer: store.customers.find((c) => c.id === item.customerId)
    };
  },

  createBooking: async (input: any): Promise<Booking> => {
    await ensureInitialized();
    const nextId = `booking-${Date.now()}`;
    const newBooking: Booking = {
      ...input,
      id: nextId,
      bookingNumber: `BKBQ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'confirmed',
      isLatest: true,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    
    // Add dummy payment record to match advance if payment received
    if (newBooking.paymentReceivedAmountValue && newBooking.paymentReceivedAmountValue > 0) {
      const newPayment: BookingPayment = {
        id: `payment-${Date.now()}`,
        bookingId: nextId,
        receivedBy: 'admin-id',
        amount: Number(newBooking.paymentReceivedAmountValue),
        method: 'cash',
        paymentMethod: 'Cash',
        reference: 'CASH-ADV',
        narration: 'Advance received',
        paymentDate: new Date().toISOString().split('T')[0],
        clearingDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      newBooking.payments = [newPayment];
    }
    
    store.bookings.unshift(newBooking);
    saveStore('bookings');
    return newBooking;
  },

  updateBooking: async (id: string, input: any): Promise<Booking> => {
    await ensureInitialized();
    const index = store.bookings.findIndex((b) => b.id === id);
    if (index === -1) throw new Error('Booking not found');
    const updated = {
      ...store.bookings[index],
      ...input,
      updatedAt: new Date().toISOString()
    } as any;
    store.bookings[index] = updated;
    saveStore('bookings');
    return updated;
  },

  deleteBooking: async (id: string): Promise<void> => {
    await ensureInitialized();
    store.bookings = store.bookings.filter((b) => b.id !== id);
    saveStore('bookings');
  },

  // Enquiries
  getEnquiries: async (params?: any) => {
    await ensureInitialized();
    let list = [...store.enquiries];
    
    if (params?.isPencilBooked === 'true') {
      list = list.filter((e) => e.isPencilBooked);
    }
    
    const page = Number(params?.page || 1);
    const limit = Number(params?.limit || 10);
    const start = (page - 1) * limit;

    const populated = list.slice(start, start + limit).map((enquiry) => ({
      ...enquiry,
      customer: store.customers.find((c) => c.id === enquiry.customerId)
    }));

    return {
      enquiries: populated,
      pagination: {
        page,
        limit,
        total: list.length,
        totalPages: Math.ceil(list.length / limit)
      }
    };
  },

  getEnquiriesCalendarRange: async (params: { fromDate: string; toDate: string }) => {
    await ensureInitialized();
    const list = store.enquiries.filter(
      (e) => e.functionDate >= params.fromDate && e.functionDate <= params.toDate
    ).map((e) => ({
      ...e,
      customer: store.customers.find((c) => c.id === e.customerId)
    }));
    return { enquiries: list };
  },

  getEnquiry: async (id: string): Promise<Enquiry> => {
    await ensureInitialized();
    const item = store.enquiries.find((e) => e.id === id);
    if (!item) throw new Error('Enquiry not found');
    return {
      ...item,
      customer: store.customers.find((c) => c.id === item.customerId)
    };
  },

  createEnquiry: async (input: any): Promise<Enquiry> => {
    await ensureInitialized();
    const nextId = `enquiry-${Date.now()}`;
    const newEnq: Enquiry = {
      ...input,
      id: nextId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;
    store.enquiries.unshift(newEnq);
    saveStore('enquiries');
    return newEnq;
  },

  updateEnquiry: async (id: string, input: any): Promise<Enquiry> => {
    await ensureInitialized();
    const index = store.enquiries.findIndex((e) => e.id === id);
    if (index === -1) throw new Error('Enquiry not found');
    const updated = {
      ...store.enquiries[index],
      ...input,
      updatedAt: new Date().toISOString()
    } as any;
    store.enquiries[index] = updated;
    saveStore('enquiries');
    return updated;
  },

  deleteEnquiry: async (id: string): Promise<void> => {
    await ensureInitialized();
    store.enquiries = store.enquiries.filter((e) => e.id !== id);
    saveStore('enquiries');
  },

  // Banquets
  getBanquets: async (params?: any) => {
    await ensureInitialized();
    return { banquets: store.banquets };
  },

  // Halls
  getHalls: async (params?: any) => {
    await ensureInitialized();
    return { halls: store.halls };
  },

  getHall: async (id: string) => {
    await ensureInitialized();
    return store.halls.find((h) => h.id === id);
  },

  // Menu / Catalog
  getItemTypes: async (params?: any) => {
    await ensureInitialized();
    return { itemTypes: store.itemTypes };
  },

  getItems: async (params?: any) => {
    await ensureInitialized();
    return { items: store.items };
  },

  getTemplateMenus: async (params?: any) => {
    await ensureInitialized();
    return { templateMenus: store.templateMenus };
  },

  // Ingredients & Vendors
  getIngredients: async (params?: any) => {
    await ensureInitialized();
    return { ingredients: store.ingredients };
  },

  getVendors: async (params?: any) => {
    await ensureInitialized();
    return { vendors: store.vendors };
  },

  // Analytics Dashboard Summary
  getDashboardSummary: async (params?: any) => {
    await ensureInitialized();
    const totalRev = store.bookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((sum, b) => sum + (b.grandTotal || 0), 0);

    return {
      range: {
        startDate: new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
      },
      summary: {
        totalCustomers: store.customers.length,
        totalBookings: store.bookings.length,
        bookingsInRange: store.bookings.length,
        totalRevenue: totalRev,
        cancelledBookings: store.bookings.filter((b) => b.status === 'cancelled').length
      },
      trends: {
        monthly: [
          { month: '2026-03', bookings: 2, revenue: 150000 },
          { month: '2026-04', bookings: 4, revenue: 320000 },
          { month: '2026-05', bookings: 7, revenue: 580000 },
          { month: '2026-06', bookings: 5, revenue: 410000 },
          { month: '2026-07', bookings: store.bookings.length, revenue: totalRev }
        ]
      },
      breakdown: {
        functionTypes: [
          { name: 'Wedding Reception', count: 4 },
          { name: 'Engagement', count: 2 },
          { name: 'Birthday Party', count: 1 }
        ],
        hallPerformance: [
          { hallId: 'hall-1', hallName: 'Grand Royal Ballroom', bookings: 3 },
          { hallId: 'hall-2', hallName: 'Palace Lawn', bookings: 4 }
        ]
      }
    };
  },

  getAuditLogs: async (params?: any) => {
    await ensureInitialized();
    return { logs: store.auditLogs };
  }
};
