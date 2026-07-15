
import { useCallback, useEffect } from 'react';

/**
 * Warns before leaving a dirty booking form. Guards the browser's
 * unload (refresh/close/hard nav) and returns a `guard` wrapper for
 * in-app navigation callbacks (back button, cancel).
 */
export function useUnsavedGuard(isDirty: boolean, isBusy = false) {
  const shouldGuard = isDirty || isBusy;

  useEffect(() => {
    if (!shouldGuard) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [shouldGuard]);

  // ponytail: window.confirm; swap for the ConfirmDialog component if design wants it.
  return useCallback(
    (proceed: () => void) => {
      if (isBusy) return;
      if (isDirty && !window.confirm('Discard unsaved changes to this booking?')) return;
      proceed();
    },
    [isBusy, isDirty]
  );
}
