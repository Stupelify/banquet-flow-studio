import { setAuthHydrationComplete } from '@/lib/authSession';
import { setInMemoryAuthToken } from '@/lib/authToken';
import { useAuthStore } from '@/store/authStore';


/**
 * Soft session expiry: clear local auth and client-navigate to /login.
 * Avoids a full document reload (the old Next/window.location feel).
 */
export function softRedirectToLogin(): void {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.startsWith('/login')) return;

  setInMemoryAuthToken(null);
  setAuthHydrationComplete(true);
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isAuthReady: true,
    isLoading: false,
  });

  window.location.href = '/login';
}
