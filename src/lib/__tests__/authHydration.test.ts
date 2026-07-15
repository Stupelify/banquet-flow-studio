import { describe, expect, it } from 'vitest';

/** Mirrors dashboard layout redirect guard */
export function shouldRedirectToLogin(
  isAuthenticated: boolean,
  isAuthReady: boolean,
  hasStoredToken: boolean
): boolean {
  return isAuthReady && !isAuthenticated && !hasStoredToken;
}

describe('auth session hydration redirect guard', () => {
  it('does not redirect before loadUser completes', () => {
    expect(shouldRedirectToLogin(false, false, true)).toBe(false);
  });

  it('does not redirect while token exists but profile is still loading', () => {
    expect(shouldRedirectToLogin(false, true, true)).toBe(false);
  });

  it('redirects when hydration finished and there is no token', () => {
    expect(shouldRedirectToLogin(false, true, false)).toBe(true);
  });

  it('does not redirect authenticated users', () => {
    expect(shouldRedirectToLogin(true, true, true)).toBe(false);
  });
});
