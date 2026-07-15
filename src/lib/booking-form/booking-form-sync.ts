/** Cross-page signal: booking financials changed on the server (payment, etc.). */

export const BOOKING_EXTERNAL_UPDATE_EVENT = 'bika:booking-external-update';

export function notifyBookingExternalUpdate(bookingId: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(BOOKING_EXTERNAL_UPDATE_EVENT, { detail: { bookingId } })
  );
}
