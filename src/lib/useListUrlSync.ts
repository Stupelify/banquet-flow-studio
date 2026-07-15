import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';

/**
 * Mirror list state (q/page/sort/view/…) into the URL via replaceState so
 * filtered views are shareable, survive refresh, and come back on back-nav.
 *
 * - Empty values remove the param (defaults keep URLs clean).
 * - Params not owned by the caller (e.g. deep-link section/id) are preserved.
 * - Silent replace on purpose: no history spam, no router.load, and
 *   useSearchParams-driven deep-link effects don't refire.
 */
export function useListUrlSync(params: Record<string, string>) {
  const router = useRouter();
  const serialized = JSON.stringify(params);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const owned = JSON.parse(serialized) as Record<string, string>;
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(owned)) {
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    const next = url.pathname + url.search;
    if (next !== window.location.pathname + window.location.search) {
      // ponytail: TanStack patches history.replaceState and notifies on every
      // call; flip its private ignore flag (same as history.flush()) so list
      // URL mirrors stay silent — no router.load, no useSearchParams re-fire.
      const history = router.history as { _ignoreSubscribers?: boolean };
      history._ignoreSubscribers = true;
      try {
        window.history.replaceState(window.history.state, '', next);
      } finally {
        history._ignoreSubscribers = false;
      }
    }
  }, [serialized, router.history]);
}
