import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyBookingExternalUpdate } from '../booking-form-sync';

describe('booking-form-sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('dispatches external update event with booking id', () => {
    const seen: string[] = [];
    vi.stubGlobal('window', {
      dispatchEvent: (event: CustomEvent<{ bookingId?: string }>) => {
        if (event.detail?.bookingId) seen.push(event.detail.bookingId);
        return true;
      },
    });
    notifyBookingExternalUpdate('booking-abc');
    expect(seen).toEqual(['booking-abc']);
  });
});
