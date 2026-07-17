import { create } from 'zustand';
import axios from 'axios';
import { api } from '@/lib/api';
import { setAuthHydrationComplete } from '@/lib/authSession';
import { setInMemoryAuthToken } from '@/lib/authToken';
import { Capacitor } from '@capacitor/core';

interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  permissions: string[];
  deniedPermissions?: string[];
  banquetIds?: string[];
  hasAllVenueAccess?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  /** True while login() is in flight — drives the Sign In button only */
  isLoading: boolean;
  /** False until the first loadUser() finishes (session restore on refresh) */
  isAuthReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  setToken: (token: string) => void;
}

/** Bearer token for Capacitor only; web relies on HttpOnly cookie. */
export function getBearerAuthToken(): string | null {
  return useAuthStore.getState().token;
}

let loadUserInFlight: Promise<void> | null = null;

function storeSessionToken(token: string | null): void {
  if (Capacitor.isNativePlatform() && token) {
    setInMemoryAuthToken(token);
  } else {
    setInMemoryAuthToken(null);
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
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
      'manage_menu',
      'view_calendar',
      'manage_payments',
      'view_reports',
      'view_audit_logs',
      'view_banquet',
      'view_item',
      'view_itemtype',
      'view_templatemenu',
      'view_hall',
    ],
  },
  token: 'mock-token',
  isLoading: false,
  isAuthReady: true,
  isAuthenticated: true,

  setToken: (token: string) => {
    storeSessionToken(token);
    setAuthHydrationComplete(true);
    set({ token, isAuthenticated: true, isAuthReady: true });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.login(email, password);
      const { token, user } = response.data.data;

      storeSessionToken(token);
      setAuthHydrationComplete(true);
      set({
        user,
        token: Capacitor.isNativePlatform() ? token : null,
        isAuthenticated: true,
        isLoading: false,
        isAuthReady: true,
      });
    } catch (error: unknown) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storeSessionToken(null);
      setAuthHydrationComplete(true);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isAuthReady: true,
      });
    }
  },

  loadUser: async () => {
    setAuthHydrationComplete(true);
    set({
      user: {
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
          'manage_menu',
          'view_calendar',
          'manage_payments',
          'view_reports',
          'view_audit_logs',
          'view_banquet',
          'view_item',
          'view_itemtype',
          'view_templatemenu',
          'view_hall',
        ],
      },
      token: 'mock-token',
      isAuthenticated: true,
      isLoading: false,
      isAuthReady: true,
    });
  },
}));
