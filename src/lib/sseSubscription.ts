/**
 * Pure-logic core for the SSE subscription lifecycle, extracted so the
 * open/close race + re-subscribe behaviour can be unit-tested without a browser.
 *
 * Bug fixed: useSSE previously re-ran its effect on every `onEvent` change
 * (which changes on each calendar navigation), tearing down and re-opening the
 * EventSource. Because the open is async (`await getSseToken()`), a slow token
 * fetch could resolve AFTER the sync cleanup ran, leaking an EventSource that
 * the cleanup never closed -> repeated refetches -> duplicated bookings.
 *
 * The lifecycle here:
 *  - holds onEvent in a mutable ref (setOnEvent) so the latest handler is used
 *    without re-subscribing;
 *  - tracks a `cancelled` flag and refuses (and closes) any source registered
 *    after cancellation, fixing the async-open / sync-cleanup race.
 */

export function matchesEventPrefix(
  type: string | undefined,
  prefixes: string[],
): boolean {
  if (!type) return false;
  return prefixes.some((prefix) => type.startsWith(prefix));
}

export interface ClosableSource {
  close: () => void;
}

export interface SseLifecycle {
  /** Register the EventSource once the async token fetch resolves. Returns
   * false (and closes the source) if the lifecycle was already cancelled. */
  registerSource: (source: ClosableSource) => boolean;
  /** Dispatch a raw SSE message payload; fires onEvent on a matching, well-formed event. */
  handleMessage: (raw: string) => void;
  /** Swap the event handler without re-subscribing. */
  setOnEvent: (fn: () => void) => void;
  /** Cancel: close any registered source and reject future registrations. */
  cancel: () => void;
}

export function makeSseLifecycle(opts: {
  onEvent: () => void;
  prefixes: string[];
}): SseLifecycle {
  let onEvent = opts.onEvent;
  let cancelled = false;
  let source: ClosableSource | null = null;

  return {
    registerSource(s: ClosableSource): boolean {
      if (cancelled) {
        s.close();
        return false;
      }
      source = s;
      return true;
    },
    handleMessage(raw: string): void {
      if (cancelled) return;
      let payload: { type?: string };
      try {
        payload = JSON.parse(raw) as { type?: string };
      } catch {
        return;
      }
      if (matchesEventPrefix(payload.type, opts.prefixes)) {
        onEvent();
      }
    },
    setOnEvent(fn: () => void): void {
      onEvent = fn;
    },
    cancel(): void {
      cancelled = true;
      source?.close();
      source = null;
    },
  };
}

const BASE_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

/** Exponential backoff with jitter, capped, for SSE reconnects. */
export function nextBackoffDelay(attempt: number): number {
  const exp = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt));
  const jitter = exp * 0.25 * Math.random();
  return Math.min(MAX_BACKOFF_MS, exp + jitter);
}
