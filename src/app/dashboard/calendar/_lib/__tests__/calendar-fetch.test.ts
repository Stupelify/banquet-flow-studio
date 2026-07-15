import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api', () => ({
  api: {
    getBookingsCalendarRange: vi.fn(),
    getEnquiriesCalendarRange: vi.fn(),
  },
}));

import { api } from '@/lib/api';
import { fetchBookings, fetchEnquiries } from '../calendar-helpers';

const mockedApi = api as unknown as {
  getBookingsCalendarRange: ReturnType<typeof vi.fn>;
  getEnquiriesCalendarRange: ReturnType<typeof vi.fn>;
};

describe('calendar range fetch helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses booking truncation from the API response', async () => {
    mockedApi.getBookingsCalendarRange.mockResolvedValue({
      data: { data: { bookings: [{ id: 'booking-1' }], truncated: true } },
    });

    const result = await fetchBookings(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T23:59:59.999Z')
    );

    expect(result).toEqual({
      rows: [{ id: 'booking-1' }],
      truncated: true,
    });
  });

  it('parses enquiry truncation from the API response', async () => {
    mockedApi.getEnquiriesCalendarRange.mockResolvedValue({
      data: { data: { enquiries: [{ id: 'enquiry-1' }], truncated: true } },
    });

    const result = await fetchEnquiries(
      new Date('2026-08-01T00:00:00.000Z'),
      new Date('2026-08-31T23:59:59.999Z')
    );

    expect(result).toEqual({
      rows: [{ id: 'enquiry-1' }],
      truncated: true,
    });
  });
});
