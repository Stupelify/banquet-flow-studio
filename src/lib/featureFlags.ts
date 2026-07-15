/**
 * featureFlags.ts
 *
 * Per-list runtime feature flags for server-side pagination. Each flag is
 * resolved from (in priority order):
 *   1. a localStorage override (instant toggle, no deploy) — values 'on'/'off'
 *   2. a build-time env var (VITE_*) — values 'true'/'false'/'1'/'0'
 *   3. a hard-coded default (below)
 *
 * Defaults are documented in docs/server-pagination-plan.md. They default ON
 * so the migrated path is exercised, but ANY list can be flipped OFF instantly
 * via localStorage to revert to the legacy client-side path:
 *
 *   localStorage.setItem('bika_ff_server_pagination_customers', 'off')
 *
 * The resolver is pure given its inputs so it is unit-testable without a DOM.
 */

export type ServerPaginationList = 'customers' | 'bookings' | 'payments' | 'enquiries';

export const SERVER_PAGINATION_FLAG_KEYS: Record<ServerPaginationList, string> = {
  customers: 'bika_ff_server_pagination_customers',
  bookings: 'bika_ff_server_pagination_bookings',
  payments: 'bika_ff_server_pagination_payments',
  enquiries: 'bika_ff_server_pagination_enquiries',
};

const ENV_FLAGS: Record<ServerPaginationList, string | undefined> = {
  customers: import.meta.env.VITE_SERVER_PAGINATION_CUSTOMERS,
  bookings: import.meta.env.VITE_SERVER_PAGINATION_BOOKINGS,
  payments: import.meta.env.VITE_SERVER_PAGINATION_PAYMENTS,
  enquiries: import.meta.env.VITE_SERVER_PAGINATION_ENQUIRIES,
};

// Safe-to-merge defaults. All ON; revert any single list instantly via the
// localStorage override above without a code change or redeploy.
const DEFAULTS: Record<ServerPaginationList, boolean> = {
  customers: true,
  bookings: true,
  payments: true,
  enquiries: true,
};

/**
 * Pure resolution of a flag from its three sources. Exported for testing.
 */
export function resolveFlag(
  localStorageValue: string | null | undefined,
  envValue: string | undefined,
  defaultValue: boolean
): boolean {
  if (localStorageValue != null) {
    const v = localStorageValue.trim().toLowerCase();
    if (v === 'on' || v === 'true' || v === '1') return true;
    if (v === 'off' || v === 'false' || v === '0') return false;
  }
  if (envValue != null) {
    const v = envValue.trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'off') return false;
  }
  return defaultValue;
}

function readLocalStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function usesServerPagination(list: ServerPaginationList): boolean {
  return resolveFlag(
    readLocalStorage(SERVER_PAGINATION_FLAG_KEYS[list]),
    ENV_FLAGS[list],
    DEFAULTS[list]
  );
}
