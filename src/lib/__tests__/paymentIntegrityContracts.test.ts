import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(clientRoot, path), 'utf8');

describe('payment integrity contracts', () => {
  it('sends clientMutationId from payment drafts to every payment create POST', () => {
    const ledger = read('src/components/BookingPaymentsLedger.tsx');
    const paymentsPage = read('src/app/dashboard/payments/page.tsx');
    const bookingForm = read('src/app/dashboard/bookings/_hooks/useBookingForm.tsx');
    const queryHooks = read('src/lib/query/hooks.ts');

    expect(ledger).toContain('clientMutationId: crypto.randomUUID()');
    expect(paymentsPage).toContain('clientMutationId: crypto.randomUUID()');
    expect(paymentsPage).toContain('clientMutationId: paymentForm.clientMutationId');
    expect(queryHooks).toContain('clientMutationId: input.clientMutationId');
    expect(bookingForm).toContain('clientMutationId: p.clientMutationId');
  });
});

describe('booking create idempotency contract', () => {
  it('keeps the create idempotency key until the saved booking id is confirmed', () => {
    const bookingForm = read('src/app/dashboard/bookings/_hooks/useBookingForm.tsx');
    const createCall = bookingForm.indexOf('const created = await api.createBooking');
    const savedBookingId = bookingForm.indexOf('savedBookingId = created', createCall);
    const clearKey = bookingForm.indexOf('clearCreateIdempotencyKey(idemFingerprint)', createCall);

    expect(createCall).toBeGreaterThan(-1);
    expect(savedBookingId).toBeGreaterThan(createCall);
    expect(clearKey).toBeGreaterThan(savedBookingId);
  });
});

describe('enquiry submit integrity contract', () => {
  it('guards enquiry submit with an in-flight ref', () => {
    const enquiriesPage = read('src/app/dashboard/enquiries/page.tsx');

    expect(enquiriesPage).toContain('const savingInFlightRef = useRef(false);');
    expect(enquiriesPage).toContain('if (savingInFlightRef.current) return;');
    expect(enquiriesPage).toContain('savingInFlightRef.current = true;');
    expect(enquiriesPage).toContain('savingInFlightRef.current = false;');
  });
});

describe('open edit booking integrity contract', () => {
  it('ignores stale openEditBooking responses after awaits', () => {
    const bookingForm = read('src/app/dashboard/bookings/_hooks/useBookingForm.tsx');

    expect(bookingForm).toContain('const openEditGenerationRef = useRef(0);');
    expect(bookingForm).toContain('const openEditGeneration = openEditGenerationRef.current + 1;');
    expect(
      bookingForm.match(/openEditGenerationRef\.current !== openEditGeneration/g) || []
    ).toHaveLength(4);
  });
});

describe('retry finalize integrity contract', () => {
  it('saves dirty edits before retrying finalize', () => {
    const bookingForm = read('src/app/dashboard/bookings/_hooks/useBookingForm.tsx');
    const retryStart = bookingForm.indexOf('const retryFinalizeBooking = async () => {');
    const retryEnd = bookingForm.indexOf('const renderCustomerTypeahead', retryStart);
    const retryBlock = bookingForm.slice(retryStart, retryEnd);
    const dirtyCheck = retryBlock.indexOf('isFormDirtyRef.current');
    const saveCall = retryBlock.indexOf('doSaveBooking({ keepOpen: true })');
    const finalizeCall = retryBlock.indexOf('api.finalizeBooking');

    expect(retryStart).toBeGreaterThan(-1);
    expect(dirtyCheck).toBeGreaterThan(-1);
    expect(saveCall).toBeGreaterThan(dirtyCheck);
    expect(finalizeCall).toBeGreaterThan(saveCall);
  });
});
