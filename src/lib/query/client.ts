import { QueryClient } from '@tanstack/react-query';
import { STALE_TIME_MS } from './keys';

// Keep cached lists in memory for a while after their last observer unmounts so
// back-navigation (common on phone) shows data instantly instead of refetching.
// Freshness is unchanged (staleTime stays); this only affects garbage
// collection of inactive cache entries.
const GC_TIME_MS = 5 * 60 * 1000; // 5 minutes

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE_TIME_MS,
        gcTime: GC_TIME_MS,
        refetchOnWindowFocus: false,
        // Retry transient failures with capped exponential backoff (helps flaky
        // mobile networks); errors still surface after the retries.
        retry: 2,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
    },
  });
}
