
import { formatDateDDMMYYYY } from '@/lib/date';
import type { BookingCalendarRow, BookingDetail } from '../_lib/types';
import { bookingTimeLabel, getBookingHallNames, toSafeNumber } from '../_lib/calendar-helpers';

interface DayPrintViewProps {
  selectedDateLabel: string;
  printBookings: BookingDetail[];
}

export default function DayPrintView({ selectedDateLabel, printBookings }: DayPrintViewProps) {
  return (
    <div className="print-only">
      <div style={{ padding: '24px' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          Day Schedule — {selectedDateLabel}
        </h1>
        {printBookings.length === 0 ? (
          <p style={{ fontSize: 12 }}>No bookings available for this date.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {printBookings.map((booking) => (
              <div
                key={booking.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: 12,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700 }}>{booking.functionName}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  {booking.functionType || '-'} • {formatDateDDMMYYYY(booking.functionDate)} •{' '}
                  {bookingTimeLabel(booking)}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Halls: {getBookingHallNames(booking as BookingCalendarRow).join(', ') || 'Unassigned'}
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Guests: {toSafeNumber(booking.expectedGuests).toLocaleString('en-IN')} • Phone:{' '}
                  {booking.customer?.phone || '-'}
                </div>
                <div style={{ fontSize: 12, marginTop: 6 }}>
                  Menu Slots:{' '}
                  {booking.packs && booking.packs.length > 0
                    ? booking.packs
                      .map((pack) => {
                        const label = pack.packName || pack.mealSlot?.name || 'Meal';
                        const count = pack.packCount ?? pack.noOfPack ?? '';
                        return `${label}${count ? ` (${count})` : ''}`;
                      })
                      .join(', ')
                    : 'Not specified'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
