
import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

/**
 * Single source of truth for the theme. The initial value is applied before
 * paint by the inline script in app/layout.tsx (reads localStorage, falls back
 * to the OS preference, sets data-theme + color-scheme) — this store only
 * mirrors and mutates it. All toggles (TopNav, mobile header) share this
 * store, so they can never drift apart.
 */
let listeners: Array<() => void> = [];

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
  document.documentElement.style.colorScheme = next;
  window.localStorage.setItem('theme', next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

export function useTheme(): { theme: Theme; toggle: () => void } {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' as Theme);
  return {
    theme,
    toggle: () => applyTheme(readTheme() === 'dark' ? 'light' : 'dark'),
  };
}
