/** In-memory JWT for Capacitor (cross-origin API). Web uses HttpOnly cookie. */
let inMemoryAuthToken: string | null = null;

export function setInMemoryAuthToken(token: string | null): void {
  inMemoryAuthToken = token;
}

export function getInMemoryAuthToken(): string | null {
  return inMemoryAuthToken;
}

export function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)bika_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}
