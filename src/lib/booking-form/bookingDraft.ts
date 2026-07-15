/**
 * R5 — local retention of unsaved booking-form edits so a browser refresh,
 * tab close, or crash cannot silently destroy in-progress work. Drafts are
 * best-effort (storage may be full/unavailable) and never a source of truth:
 * the server copy always wins unless the user explicitly resumes a draft.
 */

const DRAFT_KEY_PREFIX = 'bika_booking_draft:';
const IDEM_KEY_PREFIX = 'bika_booking_idem:';
const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/** Stable fingerprint for a new-booking create so all tabs share one idempotency key. */
export function newBookingIdemFingerprint(
  customerId: string,
  functionDate: string,
  functionType: string
): string {
  return `${customerId}|${functionDate}|${functionType.trim().toLowerCase()}`;
}

export function readCreateIdempotencyKey(fingerprint: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(`${IDEM_KEY_PREFIX}${fingerprint}`);
  } catch {
    return null;
  }
}

export function writeCreateIdempotencyKey(fingerprint: string, key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(`${IDEM_KEY_PREFIX}${fingerprint}`, key);
  } catch {
    // best-effort
  }
}

export function clearCreateIdempotencyKey(fingerprint: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(`${IDEM_KEY_PREFIX}${fingerprint}`);
  } catch {
    // ignore
  }
}

export interface BookingDraft<TForm = unknown> {
  savedAt: string;
  /** Server `updatedAt` of the booking when the draft was captured (null for new). */
  baselineUpdatedAt: string | null;
  formData: TForm;
}

export function bookingDraftKey(bookingId: string | null): string {
  return `${DRAFT_KEY_PREFIX}${bookingId || 'new'}`;
}

export function saveBookingDraft<TForm>(
  bookingId: string | null,
  draft: BookingDraft<TForm>
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(bookingDraftKey(bookingId), JSON.stringify(draft));
  } catch {
    // Storage full or unavailable — draft retention is best-effort.
  }
}

export function readBookingDraft<TForm>(
  bookingId: string | null
): BookingDraft<TForm> | null {
  if (typeof window === 'undefined') return null;
  const key = bookingDraftKey(bookingId);
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookingDraft<TForm>;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.savedAt !== 'string' ||
      typeof parsed.formData !== 'object' ||
      parsed.formData === null
    ) {
      window.localStorage.removeItem(key);
      return null;
    }
    const savedAtMs = new Date(parsed.savedAt).getTime();
    if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > DRAFT_MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return null;
  }
}

export function clearBookingDraft(bookingId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(bookingDraftKey(bookingId));
  } catch {
    // ignore
  }
}

/** Remove expired or unreadable drafts so storage doesn't accumulate forever. */
export function pruneStaleBookingDrafts(): void {
  if (typeof window === 'undefined') return;
  try {
    const staleKeys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(DRAFT_KEY_PREFIX)) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      try {
        const parsed = JSON.parse(raw) as { savedAt?: string };
        const savedAtMs = parsed?.savedAt ? new Date(parsed.savedAt).getTime() : NaN;
        if (!Number.isFinite(savedAtMs) || Date.now() - savedAtMs > DRAFT_MAX_AGE_MS) {
          staleKeys.push(key);
        }
      } catch {
        staleKeys.push(key);
      }
    }
    staleKeys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // ignore
  }
}
