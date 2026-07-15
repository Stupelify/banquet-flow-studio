// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/router', () => ({
  router: {
    navigate: vi.fn(() => Promise.resolve()),
  },
}));

vi.mock('@/lib/authToken', () => ({
  setInMemoryAuthToken: vi.fn(),
}));

vi.mock('@/lib/authSession', () => ({
  setAuthHydrationComplete: vi.fn(),
}));

import { softRedirectToLogin } from '../authRedirect';
import { useAuthStore } from '@/store/authStore';
import { router } from '@/router';

describe('softRedirectToLogin', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: '1', email: 'a@b.c', name: 'A', roles: [], permissions: [] },
      token: 't',
      isAuthenticated: true,
      isAuthReady: true,
      isLoading: false,
    });
    window.history.replaceState({}, '', '/dashboard/bookings');
    vi.mocked(router.navigate).mockClear();
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isAuthReady: true,
      isLoading: false,
    });
  });

  it('clears local session and soft-navigates to /login', () => {
    softRedirectToLogin();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith({ to: '/login', replace: true });
  });

  it('no-ops when already on /login', () => {
    window.history.replaceState({}, '', '/login');
    softRedirectToLogin();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
