import { describe, it, expect } from 'vitest';
import { matchesEventPrefix, makeSseLifecycle } from '../sseSubscription';

describe('matchesEventPrefix', () => {
  it('matches a known prefix', () => {
    expect(matchesEventPrefix('booking:created', ['booking:', 'enquiry:'])).toBe(true);
    expect(matchesEventPrefix('enquiry:updated', ['booking:', 'enquiry:'])).toBe(true);
  });
  it('rejects unknown types', () => {
    expect(matchesEventPrefix('payment:created', ['booking:', 'enquiry:'])).toBe(false);
  });
  it('handles undefined/empty type safely', () => {
    expect(matchesEventPrefix(undefined, ['booking:'])).toBe(false);
    expect(matchesEventPrefix('', ['booking:'])).toBe(false);
  });
});

describe('makeSseLifecycle — guards the async open/close race and per-nav re-subscribe', () => {
  it('one event triggers onEvent exactly once', () => {
    let calls = 0;
    const lc = makeSseLifecycle({ onEvent: () => { calls++; }, prefixes: ['booking:'] });
    lc.handleMessage(JSON.stringify({ type: 'booking:created' }));
    expect(calls).toBe(1);
  });

  it('ignores malformed payloads', () => {
    let calls = 0;
    const lc = makeSseLifecycle({ onEvent: () => { calls++; }, prefixes: ['booking:'] });
    lc.handleMessage('not-json');
    lc.handleMessage(JSON.stringify({ type: 'other:thing' }));
    expect(calls).toBe(0);
  });

  it('a connection created AFTER cancel is closed and never delivers events (race guard)', () => {
    let closed = false;
    let calls = 0;
    const lc = makeSseLifecycle({ onEvent: () => { calls++; }, prefixes: ['booking:'] });
    lc.cancel(); // sync cleanup runs first
    // async token fetch resolves late and tries to register the source:
    const accepted = lc.registerSource({ close: () => { closed = true; } });
    expect(accepted).toBe(false);
    expect(closed).toBe(true);
    // even if a late message somehow arrives, it must not fire onEvent
    lc.handleMessage(JSON.stringify({ type: 'booking:created' }));
    expect(calls).toBe(0);
  });

  it('a connection registered before cancel is accepted', () => {
    const lc = makeSseLifecycle({ onEvent: () => {}, prefixes: ['booking:'] });
    const accepted = lc.registerSource({ close: () => {} });
    expect(accepted).toBe(true);
  });

  it('updating onEvent via ref does not require a new lifecycle (no reconnect storm)', () => {
    let first = 0;
    let second = 0;
    const lc = makeSseLifecycle({ onEvent: () => { first++; }, prefixes: ['booking:'] });
    lc.setOnEvent(() => { second++; });
    lc.handleMessage(JSON.stringify({ type: 'booking:created' }));
    expect(first).toBe(0);
    expect(second).toBe(1);
  });
});

describe('SSE reconnect backoff', () => {
  it('produces increasing, capped delays', async () => {
    const { nextBackoffDelay } = await import('../sseSubscription');
    const d0 = nextBackoffDelay(0);
    const d1 = nextBackoffDelay(1);
    const d2 = nextBackoffDelay(2);
    const dBig = nextBackoffDelay(50);
    expect(d0).toBeGreaterThan(0);
    expect(d1).toBeGreaterThanOrEqual(d0);
    expect(d2).toBeGreaterThanOrEqual(d1);
    expect(dBig).toBeLessThanOrEqual(30_000); // capped
  });
});
