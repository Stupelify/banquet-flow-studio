import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bookingDraftKey,
  clearBookingDraft,
  pruneStaleBookingDrafts,
  readBookingDraft,
  saveBookingDraft,
} from '../bookingDraft';

function createLocalStorageStub() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size;
    },
    _store: store,
  };
}

describe('bookingDraft', () => {
  let localStorage: ReturnType<typeof createLocalStorageStub>;

  beforeEach(() => {
    localStorage = createLocalStorageStub();
    vi.stubGlobal('window', { localStorage });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keys drafts by booking id, with "new" for creates', () => {
    expect(bookingDraftKey('abc')).toBe('bika_booking_draft:abc');
    expect(bookingDraftKey(null)).toBe('bika_booking_draft:new');
  });

  it('round-trips a draft', () => {
    const draft = {
      savedAt: new Date().toISOString(),
      baselineUpdatedAt: '2026-06-01T10:00:00.000Z',
      formData: { functionDate: '2026-07-01', packs: {} },
    };
    saveBookingDraft('abc', draft);
    expect(readBookingDraft('abc')).toEqual(draft);
  });

  it('returns null and removes the key for malformed drafts', () => {
    localStorage.setItem(bookingDraftKey('bad'), 'not json');
    expect(readBookingDraft('bad')).toBeNull();
    expect(localStorage.getItem(bookingDraftKey('bad'))).toBeNull();

    localStorage.setItem(bookingDraftKey('bad2'), JSON.stringify({ savedAt: 123 }));
    expect(readBookingDraft('bad2')).toBeNull();
    expect(localStorage.getItem(bookingDraftKey('bad2'))).toBeNull();
  });

  it('expires drafts older than the max age', () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    saveBookingDraft('old', { savedAt: old, baselineUpdatedAt: null, formData: {} });
    expect(readBookingDraft('old')).toBeNull();
    expect(localStorage.getItem(bookingDraftKey('old'))).toBeNull();
  });

  it('clears a draft', () => {
    saveBookingDraft(null, {
      savedAt: new Date().toISOString(),
      baselineUpdatedAt: null,
      formData: {},
    });
    clearBookingDraft(null);
    expect(readBookingDraft(null)).toBeNull();
  });

  it('prunes only stale or unreadable drafts and ignores foreign keys', () => {
    const fresh = new Date().toISOString();
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    saveBookingDraft('fresh', { savedAt: fresh, baselineUpdatedAt: null, formData: {} });
    saveBookingDraft('old', { savedAt: old, baselineUpdatedAt: null, formData: {} });
    localStorage.setItem(bookingDraftKey('garbled'), '{oops');
    localStorage.setItem('bika_palette_bookings', '[]');

    pruneStaleBookingDrafts();

    expect(localStorage.getItem(bookingDraftKey('fresh'))).not.toBeNull();
    expect(localStorage.getItem(bookingDraftKey('old'))).toBeNull();
    expect(localStorage.getItem(bookingDraftKey('garbled'))).toBeNull();
    expect(localStorage.getItem('bika_palette_bookings')).toBe('[]');
  });
});
