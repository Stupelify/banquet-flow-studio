// 2 minutes — matches the TTL of the removed axios memCache so list pages keep
// the same freshness economics with React Query as the single cache.
export const STALE_TIME_MS = 120_000;

export const queryKeys = {
  bookings: {
    all: ['bookings'] as const,
    list: (params: { page: number; limit: number } = { page: 1, limit: 5000 }) =>
      ['bookings', 'list', params] as const,
    // Server-paginated list keyed on page/search/sort params.
    serverList: (params: Record<string, unknown>) =>
      ['bookings', 'serverList', params] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: () => ['customers', 'list'] as const,
    // Server-paginated list keyed on page/search/sort params.
    serverList: (params: Record<string, unknown>) =>
      ['customers', 'serverList', params] as const,
  },
  enquiries: {
    all: ['enquiries'] as const,
    list: (status: string) => ['enquiries', 'list', { status }] as const,
    serverList: (params: Record<string, unknown>) =>
      ['enquiries', 'serverList', params] as const,
  },
  calendar: {
    all: ['calendar'] as const,
    range: (params: { from: string; to: string }) =>
      ['calendar', 'range', params] as const,
    halls: () => ['calendar', 'halls'] as const,
  },
} as const;
