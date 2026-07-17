import axios from 'axios';
import type { AxiosError, AxiosInstance } from 'axios';
import { softRedirectToLogin } from './authRedirect';
import { isAuthHydrationComplete } from './authSession';
import { getInMemoryAuthToken, readCsrfCookie } from './authToken';
import { mockDb } from './mockData';
import type {
  ApiEnvelope,
  AuditLog,
  AuthUser,
  Banquet,
  BanquetInput,
  Booking,
  BookingInput,
  BookingPayment,
  BookingPaymentInput,
  BookingsListData,
  BookingsCalendarRangeData,
  Customer,
  CustomerInput,
  CustomersListData,
  EnquiriesListData,
  EnquiriesCalendarRangeData,
  Enquiry,
  EnquiryInput,
  Hall,
  HallInput,
  Ingredient,
  IngredientInput,
  Item,
  ItemInput,
  ItemRecipe,
  ItemRecipeInput,
  ItemType,
  ItemTypeInput,
  PaginationMeta,
  Permission,
  Role,
  TemplateMenu,
  TemplateMenuInput,
  User,
  Vendor,
  VendorInput,
  VendorSupply,
  VendorSupplyInput,
} from '@/types/api';

/** Query-string params (page/limit/search/filters). Values are serialized by axios. */
export type QueryParams = Record<string, string | number | boolean | undefined>;

/** One hit from GET /search (searchAll). functionDate only on booking/enquiry hits. */
export interface GlobalSearchHit {
  id: string;
  label: string;
  secondary?: string | null;
  href: string;
  type: 'booking' | 'customer' | 'enquiry';
  functionDate?: string | null;
}

export interface GlobalSearchData {
  bookings: GlobalSearchHit[];
  customers: GlobalSearchHit[];
  enquiries: GlobalSearchHit[];
}

const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 30_000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const USE_MOCK =
  typeof window !== 'undefined' &&
  (window.location.hostname !== 'banquet.bikafood.com' &&
   import.meta.env.VITE_USE_MOCK_API !== 'false');

if (USE_MOCK) {
  // @ts-ignore
  apiClient.request = async (config: any) => {
    const url = config.url || '';
    const method = config.method?.toLowerCase() || 'get';
    const params = config.params || {};
    const data = config.data || {};

    const res = (payload: any) => {
      return {
        data: {
          success: true,
          data: payload,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config,
      };
    };

    // Auth routes
    if (url === '/auth/me') {
      return res({ user: mockDb.getCurrentUser() });
    }
    if (url === '/auth/login') {
      return res({ token: 'mock-token', user: mockDb.getCurrentUser() });
    }
    if (url === '/auth/logout') {
      return res(null);
    }
    if (url === '/auth/sse-token') {
      return res({ token: 'mock-sse-token' });
    }

    // Customers
    if (url === '/customers') {
      if (method === 'get') return res(await mockDb.getCustomers(params));
      if (method === 'post') return res(await mockDb.createCustomer(data));
    }
    if (url.startsWith('/customers/')) {
      const id = url.split('/')[2];
      if (method === 'get') return res({ customer: await mockDb.getCustomer(id) });
      if (method === 'put') return res({ customer: await mockDb.updateCustomer(id, data) });
      if (method === 'delete') {
        await mockDb.deleteCustomer(id);
        return res(null);
      }
    }

    // Search
    if (url === '/search') {
      return res(await mockDb.search(params.q || ''));
    }

    // Enquiries
    if (url === '/enquiries') {
      if (method === 'get') return res(await mockDb.getEnquiries(params));
      if (method === 'post') return res(await mockDb.createEnquiry(data));
    }
    if (url === '/enquiries/calendar-range') {
      return res(await mockDb.getEnquiriesCalendarRange(params));
    }
    if (url.startsWith('/enquiries/')) {
      const id = url.split('/')[2];
      if (method === 'get') return res({ enquiry: await mockDb.getEnquiry(id) });
      if (method === 'put') return res({ enquiry: await mockDb.updateEnquiry(id, data) });
      if (method === 'delete') {
        await mockDb.deleteEnquiry(id);
        return res(null);
      }
    }

    // Bookings
    if (url === '/bookings') {
      if (method === 'get') return res(await mockDb.getBookings(params));
      if (method === 'post') return res(await mockDb.createBooking(data));
    }
    if (url === '/bookings/calendar-range') {
      return res(await mockDb.getBookingsCalendarRange(params));
    }
    if (url.startsWith('/bookings/')) {
      const parts = url.split('/');
      const id = parts[2];
      if (parts.length === 3) {
        if (method === 'get') return res({ booking: await mockDb.getBooking(id) });
        if (method === 'put') return res({ booking: await mockDb.updateBooking(id, data) });
        if (method === 'delete') {
          await mockDb.deleteBooking(id);
          return res(null);
        }
      }
      if (parts[3] === 'finalize') {
        return res(null);
      }
      if (parts[3] === 'cancel') {
        const booking = await mockDb.updateBooking(id, { status: 'cancelled' });
        return res({ booking });
      }
      if (parts[3] === 'payments') {
        const booking = await mockDb.getBooking(id);
        const newPayment = {
          id: `payment-${Date.now()}`,
          bookingId: id,
          receivedBy: 'admin-id',
          amount: Number(data.amount),
          method: data.method || 'cash',
          paymentMethod: data.method || 'Cash',
          reference: data.reference || null,
          narration: data.narration || null,
          paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
          clearingDate: data.clearingDate || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        const payments = [...(booking.payments || []), newPayment];
        const received = payments.reduce((sum, p) => sum + p.amount, 0);
        const due = (booking.grandTotal || 0) - received;
        await mockDb.updateBooking(id, {
          payments,
          paymentReceivedAmount: String(received),
          paymentReceivedAmountValue: received,
          dueAmount: String(due),
          dueAmountValue: due
        });
        return res({ payment: newPayment });
      }
    }

    // Banquets
    if (url === '/banquets') {
      return res(await mockDb.getBanquets());
    }

    // Halls
    if (url === '/halls') {
      return res(await mockDb.getHalls());
    }
    if (url.startsWith('/halls/')) {
      const id = url.split('/')[2];
      return res({ hall: await mockDb.getHall(id) });
    }

    // Menu / Catalog
    if (url === '/item-types') {
      return res(await mockDb.getItemTypes());
    }
    if (url === '/items') {
      return res(await mockDb.getItems());
    }
    if (url === '/template-menus') {
      return res(await mockDb.getTemplateMenus());
    }

    // Ingredients & Vendors
    if (url === '/ingredients') {
      return res(await mockDb.getIngredients());
    }
    if (url === '/vendors') {
      return res(await mockDb.getVendors());
    }

    // Analytics
    if (url === '/analytics/dashboard') {
      return res(await mockDb.getDashboardSummary());
    }

    // Audit Logs
    if (url === '/audit-logs') {
      return res(await mockDb.getAuditLogs());
    }

    return res(null);
  };
}

const MUTATING_METHODS = new Set(['post', 'put', 'patch', 'delete']);

// React Query is the only client-side cache. Requests always reach the
// network; freshness and invalidation live in lib/query (queryKeys + staleTime).
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = getInMemoryAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      const method = config.method?.toLowerCase();
      if (method && MUTATING_METHODS.has(method)) {
        const csrf = readCsrfCookie();
        if (csrf) {
          config.headers['X-CSRF-Token'] = csrf;
        }
      }
    }

    if (config.method?.toLowerCase() === 'get') {
      // Bypass the browser's HTTP cache so mutations immediately reflect in
      // subsequent fetches (the server sets max-age=120 on GET routes).
      config.headers['Cache-Control'] = 'no-cache';
      config.headers['Pragma'] = 'no-cache';
    }

    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const requestUrl = String(error.config?.url || '');
    const isLoginRequest =
      requestUrl.includes('/auth/login') || requestUrl.endsWith('auth/login');
    const isRegisterRequest =
      requestUrl.includes('/auth/register') || requestUrl.endsWith('auth/register');
    const isMeRequest =
      requestUrl.includes('/auth/me') || requestUrl.endsWith('auth/me');

    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      isAuthHydrationComplete() &&
      !isLoginRequest &&
      !isRegisterRequest &&
      !isMeRequest
    ) {
      // Soft SPA redirect — clears session + client-navigates (no full reload).
      softRedirectToLogin();
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: { email: string; password: string; name?: string }) =>
    apiClient.post('/auth/register', data),
  getCurrentUser: () => apiClient.get<ApiEnvelope<{ user: AuthUser }>>('/auth/me'),
  getSseToken: () => apiClient.get<{ token: string }>('/auth/sse-token'),
  logout: () => apiClient.post('/auth/logout'),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    apiClient.post('/auth/change-password', data),

  // Customers
  getCustomers: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<CustomersListData>>('/customers', { params }),
  getCustomer: (id: string) =>
    apiClient.get<ApiEnvelope<{ customer: Customer }>>(`/customers/${id}`),
  createCustomer: (data: CustomerInput) => apiClient.post('/customers', data),
  updateCustomer: (id: string, data: CustomerInput) =>
    apiClient.put(`/customers/${id}`, data),
  deleteCustomer: (id: string) => apiClient.delete(`/customers/${id}`),

  // Global search (same endpoint as the command palette)
  search: (q: string) =>
    apiClient.get<ApiEnvelope<GlobalSearchData>>('/search', { params: { q } }),

  // Enquiries
  getEnquiries: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<EnquiriesListData>>('/enquiries', { params }),
  getEnquiriesCalendarRange: (params: { fromDate: string; toDate: string }) =>
    apiClient.get<ApiEnvelope<EnquiriesCalendarRangeData>>('/enquiries/calendar-range', { params }),
  getEnquiry: (id: string) =>
    apiClient.get<ApiEnvelope<{ enquiry: Enquiry }>>(`/enquiries/${id}`),
  createEnquiry: (data: EnquiryInput) => apiClient.post('/enquiries', data),
  updateEnquiry: (id: string, data: EnquiryInput) =>
    apiClient.put(`/enquiries/${id}`, data),
  deleteEnquiry: (id: string) => apiClient.delete(`/enquiries/${id}`),

  // Bookings
  getBookings: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<BookingsListData>>('/bookings', { params }),
  getBookingsCalendarRange: (params: { fromDate: string; toDate: string }) =>
    apiClient.get<ApiEnvelope<BookingsCalendarRangeData>>('/bookings/calendar-range', { params }),
  getBooking: (id: string) =>
    apiClient.get<ApiEnvelope<{ booking: Booking }>>(`/bookings/${id}`),
  createBooking: (data: BookingInput, idempotencyKey?: string) =>
    apiClient.post(
      '/bookings',
      data,
      idempotencyKey ? { headers: { 'X-Idempotency-Key': idempotencyKey } } : undefined
    ),
  updateBooking: (id: string, data: BookingInput) =>
    apiClient.put(`/bookings/${id}`, data),
  deleteBooking: (id: string) => apiClient.delete(`/bookings/${id}`),
  getBookingMenuPdf: (id: string, packId?: string) =>
    apiClient.get(`/bookings/${id}/menu-pdf`, {
      params: packId ? { packId } : undefined,
      responseType: 'blob',
    }),
  getBookingPdf: (id: string) =>
    apiClient.get(`/bookings/${id}/booking-pdf`, { responseType: 'blob' }),
  finalizeBooking: (id: string) => apiClient.post(`/bookings/${id}/finalize`),
  partyOverBooking: (
    id: string,
    data: {
      packs: Array<{ bookingPackId: string; extraPlate: number; extraRate?: number }>;
      settlementDiscountPercent?: number;
      settlementDiscountAmount?: number;
      settlementTotalAmount?: number;
    }
  ) => apiClient.post(`/bookings/${id}/party-over`, data),
  getBookingHistory: (id: string) => apiClient.get(`/bookings/${id}/history`),
  cancelBooking: (id: string) => apiClient.post(`/bookings/${id}/cancel`),
  addPayment: (id: string, data: BookingPaymentInput) =>
    apiClient.post<ApiEnvelope<{ payment: BookingPayment }>>(
      `/bookings/${id}/payments`,
      data
    ),
  updatePayment: (id: string, paymentId: string, data: BookingPaymentInput) =>
    apiClient.patch<ApiEnvelope<{ payment: BookingPayment }>>(
      `/bookings/${id}/payments/${paymentId}`,
      data
    ),
  checkBookingAvailability: (params?: QueryParams) =>
    apiClient.get('/bookings/check-availability', { params }),

  // Banquets
  getBanquets: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ banquets: Banquet[]; pagination?: PaginationMeta }>>(
      '/banquets',
      { params }
    ),
  getBanquet: (id: string) =>
    apiClient.get<ApiEnvelope<{ banquet: Banquet }>>(`/banquets/${id}`),
  createBanquet: (data: BanquetInput) => apiClient.post('/banquets', data),
  updateBanquet: (id: string, data: BanquetInput) =>
    apiClient.put(`/banquets/${id}`, data),
  deleteBanquet: (id: string) => apiClient.delete(`/banquets/${id}`),

  // Halls
  getHalls: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ halls: Hall[]; pagination?: PaginationMeta }>>('/halls', {
      params,
    }),
  getHall: (id: string) => apiClient.get<ApiEnvelope<{ hall: Hall }>>(`/halls/${id}`),
  createHall: (data: HallInput) => apiClient.post('/halls', data),
  updateHall: (id: string, data: HallInput) => apiClient.put(`/halls/${id}`, data),
  deleteHall: (id: string) => apiClient.delete(`/halls/${id}`),

  // Menu
  getItemTypes: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ itemTypes: ItemType[]; pagination?: PaginationMeta }>>(
      '/item-types',
      { params }
    ),
  getItemType: (id: string) =>
    apiClient.get<ApiEnvelope<{ itemType: ItemType }>>(`/item-types/${id}`),
  createItemType: (data: ItemTypeInput) => apiClient.post('/item-types', data),
  updateItemType: (id: string, data: ItemTypeInput) =>
    apiClient.put(`/item-types/${id}`, data),
  deleteItemType: (id: string) => apiClient.delete(`/item-types/${id}`),

  getItems: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ items: Item[]; pagination?: PaginationMeta }>>('/items', {
      params,
    }),
  getItem: (id: string) => apiClient.get<ApiEnvelope<{ item: Item }>>(`/items/${id}`),
  createItem: (data: ItemInput) => apiClient.post('/items', data),
  updateItem: (id: string, data: ItemInput) => apiClient.put(`/items/${id}`, data),
  deleteItem: (id: string) => apiClient.delete(`/items/${id}`),

  getTemplateMenus: (params?: QueryParams) =>
    apiClient.get<
      ApiEnvelope<{ templateMenus: TemplateMenu[]; pagination?: PaginationMeta }>
    >('/template-menus', { params }),
  getTemplateMenu: (id: string) =>
    apiClient.get<ApiEnvelope<{ templateMenu: TemplateMenu }>>(`/template-menus/${id}`),
  createTemplateMenu: (data: TemplateMenuInput) => apiClient.post('/template-menus', data),
  updateTemplateMenu: (id: string, data: TemplateMenuInput) =>
    apiClient.put(`/template-menus/${id}`, data),
  deleteTemplateMenu: (id: string) => apiClient.delete(`/template-menus/${id}`),

  // Ingredients
  getIngredients: (params?: QueryParams) =>
    apiClient.get<
      ApiEnvelope<{ ingredients: Ingredient[]; pagination?: PaginationMeta }>
    >('/ingredients', { params }),
  getIngredient: (id: string) =>
    apiClient.get<ApiEnvelope<{ ingredient: Ingredient }>>(`/ingredients/${id}`),
  createIngredient: (data: IngredientInput) => apiClient.post('/ingredients', data),
  updateIngredient: (id: string, data: IngredientInput) =>
    apiClient.put(`/ingredients/${id}`, data),
  deleteIngredient: (id: string) => apiClient.delete(`/ingredients/${id}`),
  addIngredientVendor: (id: string, data: VendorSupplyInput) =>
    apiClient.post(`/ingredients/${id}/vendors`, data),
  updateIngredientVendor: (id: string, supplyId: string, data: VendorSupplyInput) =>
    apiClient.put(`/ingredients/${id}/vendors/${supplyId}`, data),
  deleteIngredientVendor: (id: string, supplyId: string) =>
    apiClient.delete(`/ingredients/${id}/vendors/${supplyId}`),

  // Vendors
  getVendors: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ vendors: Vendor[]; pagination?: PaginationMeta }>>(
      '/vendors',
      { params }
    ),
  getVendor: (id: string) =>
    apiClient.get<ApiEnvelope<{ vendor: Vendor }>>(`/vendors/${id}`),
  createVendor: (data: VendorInput) => apiClient.post('/vendors', data),
  updateVendor: (id: string, data: VendorInput) => apiClient.put(`/vendors/${id}`, data),
  deleteVendor: (id: string) => apiClient.delete(`/vendors/${id}`),
  addVendorSupply: (id: string, data: VendorSupplyInput) =>
    apiClient.post(`/vendors/${id}/supplies`, data),
  updateVendorSupply: (id: string, supplyId: string, data: VendorSupplyInput) =>
    apiClient.put(`/vendors/${id}/supplies/${supplyId}`, data),
  deleteVendorSupply: (id: string, supplyId: string) =>
    apiClient.delete(`/vendors/${id}/supplies/${supplyId}`),

  // Item recipes & vendor supplies
  getItemRecipes: (id: string) =>
    apiClient.get<ApiEnvelope<{ recipes: ItemRecipe[] }>>(`/items/${id}/recipes`),
  addItemRecipe: (id: string, data: ItemRecipeInput) =>
    apiClient.post(`/items/${id}/recipes`, data),
  updateItemRecipe: (id: string, recipeId: string, data: ItemRecipeInput) =>
    apiClient.put(`/items/${id}/recipes/${recipeId}`, data),
  deleteItemRecipe: (id: string, recipeId: string) =>
    apiClient.delete(`/items/${id}/recipes/${recipeId}`),
  getItemVendors: (id: string) =>
    apiClient.get<ApiEnvelope<{ supplies: VendorSupply[] }>>(`/items/${id}/vendors`),
  addItemVendor: (id: string, data: VendorSupplyInput) =>
    apiClient.post(`/items/${id}/vendors`, data),
  updateItemVendor: (id: string, supplyId: string, data: VendorSupplyInput) =>
    apiClient.put(`/items/${id}/vendors/${supplyId}`, data),
  deleteItemVendor: (id: string, supplyId: string) =>
    apiClient.delete(`/items/${id}/vendors/${supplyId}`),

  // Users & RBAC
  getUsers: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ users: User[]; pagination?: PaginationMeta }>>('/users', {
      params,
    }),
  getUsersSimple: () => apiClient.get('/users/simple'),
  getUser: (id: string) => apiClient.get<ApiEnvelope<{ user: User }>>(`/users/${id}`),
  createUser: (data: { email: string; password: string; name?: string; roleId?: string }) =>
    apiClient.post('/users', data),
  deleteUser: (id: string) => apiClient.delete(`/users/${id}`),
  resetUserPassword: (id: string, data: { newPassword: string }) =>
    apiClient.post(`/users/${id}/reset-password`, data),
  updateUser: (id: string, data: { name?: string; email?: string }) =>
    apiClient.put(`/users/${id}`, data),
  setUserStatus: (id: string, data: { isActive: boolean; reason?: string }) =>
    apiClient.patch(`/users/${id}/status`, data),
  setUserAllVenues: (id: string, hasAllVenueAccess: boolean) =>
    apiClient.put(`/users/${id}/all-venues`, { hasAllVenueAccess }),
  getUserDirectPermissions: (id: string) =>
    apiClient.get(`/users/${id}/direct-permissions`),
  setUserDirectPermissions: (
    id: string,
    data: { grants: string[]; denies: string[] }
  ) => apiClient.put(`/users/${id}/direct-permissions`, data),
  getUserBanquets: (id: string) => apiClient.get(`/users/${id}/banquets`),
  setUserBanquets: (id: string, banquetIds: string[]) =>
    apiClient.put(`/users/${id}/banquets`, { banquetIds }),

  getRoles: () => apiClient.get<ApiEnvelope<{ roles: Role[] }>>('/roles'),
  createRole: (data: { name: string; description?: string }) =>
    apiClient.post('/roles', data),
  updateRole: (id: string, data: { name?: string; description?: string }) =>
    apiClient.put(`/roles/${id}`, data),
  deleteRole: (id: string) => apiClient.delete(`/roles/${id}`),

  getPermissions: () =>
    apiClient.get<ApiEnvelope<{ permissions: Permission[] }>>('/permissions'),
  createPermission: (data: { name: string; description?: string }) =>
    apiClient.post('/permissions', data),
  updatePermission: (id: string, data: { name?: string; description?: string }) =>
    apiClient.put(`/permissions/${id}`, data),
  deletePermission: (id: string) => apiClient.delete(`/permissions/${id}`),

  updateUserRoles: (data: { userId: string; roleIds: string[] }) =>
    apiClient.post('/rbac/update-roles', data),
  updateRolePermissions: (data: { roleId: string; permissionIds: string[] }) =>
    apiClient.post('/rbac/update-permissions', data),
  getUserPermissions: (userId: string) => apiClient.get(`/rbac/user-permissions/${userId}`),

  // Analytics
  getDashboardSummary: (params?: QueryParams) =>
    apiClient.get('/analytics/dashboard', { params }),

  // Calendar
  getGoogleCalendarEvents: (params?: QueryParams) =>
    apiClient.get('/calendar/google-events', { params }),

  // Audit Logs
  getAuditLogs: (params?: QueryParams) =>
    apiClient.get<ApiEnvelope<{ logs: AuditLog[]; pagination?: PaginationMeta }>>(
      '/audit-logs',
      { params }
    ),
};

/** Fetches every customer page (for dropdowns / typeahead). */
export async function fetchAllCustomers(params?: { search?: string }): Promise<Customer[]> {
  const rows: Customer[] = [];
  const limit = 500;
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await api.getCustomers({ page, limit, ...params });
    const data = response.data?.data;
    rows.push(...(data?.customers || []));
    totalPages = Math.max(1, Number(data?.pagination?.totalPages || 1));
    page += 1;
    if (page > 100) break;
  }

  return rows;
}

export default apiClient;
