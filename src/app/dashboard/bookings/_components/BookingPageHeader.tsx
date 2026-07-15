
import { ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/StatusBadge';
import { CTA_NEW_BOOKING } from '@/lib/copy';
import { formatAppDate } from '@/lib/format';
import type { Booking } from '../_lib/types';

export type BookingPageHeaderProps = {
  /** The loaded booking (activeBookingObj). Null on a new/unsaved booking. */
  booking?: Booking | null;
  onBack: () => void;
};

/**
 * Document-style header for the routed booking pages. Shows function type,
 * live status, and the human booking number + customer + date. The version
 * timeline lives inside the body (FinalizedVersionHistory), not here.
 */
export default function BookingPageHeader({ booking, onBack }: BookingPageHeaderProps) {
  const status = booking?.isPencilBooking
    ? 'pencil'
    : booking?.isQuotation
    ? 'quotation'
    : booking?.status;

  const subtitle = [
    booking?.bookingNumber,
    booking?.customer?.name,
    booking?.functionDate ? formatAppDate(booking.functionDate, { withYear: true }) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="page-head flex items-center gap-3">
      <Button
        type="button"
        onClick={onBack}
        aria-label="Back to bookings"
        icon={<ArrowLeft className="icon-16" aria-hidden="true" />}
      />
      <div className="min-w-0">
        <h1 className="page-title flex items-center gap-2">
          {booking?.functionType || CTA_NEW_BOOKING}
          {status && <StatusBadge status={status} />}
        </h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}
