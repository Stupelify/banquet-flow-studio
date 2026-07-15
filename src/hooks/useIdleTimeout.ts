
import { useEffect, useRef, useCallback } from 'react';

/**
 * Idle timeout hook — fires onWarn when `timeoutMs - warnBeforeMs` ms of
 * inactivity have elapsed, then fires onTimeout after the remaining
 * `warnBeforeMs` ms unless the user resumes activity (which cancels both).
 *
 * Activity events: mousemove, keydown, click, touchstart, scroll.
 *
 * @param timeoutMs      Total idle duration before logout (default: 30 min)
 * @param warnBeforeMs   How early to show the warning (default: 60 s)
 * @param onWarn         Called when the warning window opens
 * @param onTimeout      Called when time is fully up — should trigger logout
 * @param onActivity     Called when activity resets the timer (use to dismiss warning)
 * @param enabled        Set false to suspend the timer (e.g. when not authenticated)
 */
export function useIdleTimeout({
  timeoutMs = 30 * 60 * 1000,
  warnBeforeMs = 60 * 1000,
  onWarn,
  onTimeout,
  onActivity,
  enabled = true,
}: {
  timeoutMs?: number;
  warnBeforeMs?: number;
  onWarn: () => void;
  onTimeout: () => void;
  onActivity: () => void;
  enabled?: boolean;
}) {
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track whether the warning is currently showing so we can decide whether
  // to call onActivity when the user moves again.
  const warningActiveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current !== null) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (logoutTimerRef.current !== null) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    warnTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      onWarn();
      logoutTimerRef.current = setTimeout(() => {
        warningActiveRef.current = false;
        onTimeout();
      }, warnBeforeMs);
    }, timeoutMs - warnBeforeMs);
  }, [clearTimers, onWarn, onTimeout, timeoutMs, warnBeforeMs]);

  const handleActivity = useCallback(() => {
    if (warningActiveRef.current) {
      // User came back during the warning window — dismiss it and restart
      warningActiveRef.current = false;
      onActivity();
    }
    scheduleTimers();
  }, [scheduleTimers, onActivity]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'keydown',
      'click',
      'touchstart',
      'scroll',
    ];

    events.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true })
    );

    // Kick off the initial timer
    scheduleTimers();

    return () => {
      clearTimers();
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [enabled, handleActivity, scheduleTimers, clearTimers]);
}
