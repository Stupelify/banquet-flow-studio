/** Primary dashboard routes — prefetch on nav hover/focus for faster transitions. */
export const PRIMARY_PREFETCH_HREFS = new Set([
  '/dashboard',
  '/dashboard/bookings',
  '/dashboard/calendar',
  '/dashboard/customers',
  '/dashboard/enquiries',
  '/dashboard/payments',
]);

export function shouldPrefetchDashboardRoute(href: string): boolean {
  return PRIMARY_PREFETCH_HREFS.has(href);
}
