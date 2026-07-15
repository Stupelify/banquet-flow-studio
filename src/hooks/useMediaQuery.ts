
import { useEffect, useState } from 'react';

// Returns whether the media query currently matches. False during SSR / first
// paint, then corrected on mount — callers use it for behaviour (which overlay
// to open), not for hiding content, so the one-frame default is harmless.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, [query]);

  return matches;
}
