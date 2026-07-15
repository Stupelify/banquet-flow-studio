
import { memo } from 'react';
import {
  Building2,
  CalendarDays,
  Download,
  Edit,
  FileText,
  IndianRupee,
  Trash2,
  Users,
} from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';
import { formatBookingHallNames } from '@/lib/hallLabel';
import { formatINR } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import RowActionsMenu from '@/components/RowActionsMenu';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  expectedGuests: number;
  status: string;
  isQuotation: boolean;
  grandTotal: number;
  dueAmountValue?: number | null;
  customer: {
    name: string;
    phone: string;
  };
  halls?: Array<{
    hall?: { id: string; name: string; banquet?: { id: string; name: string } | null } | null;
  }>;
}

interface BookingCardProps {
  booking: Booking;
  canExportMenuPdf: boolean;
  canEditBooking: boolean;
  canDeleteBooking: boolean;
  onExportPdf?: (booking: Booking) => void;
  onExportBookingPdf?: (booking: Booking) => void;
  bookingPdfLoading?: string | null;
  onEdit?: (bookingId: string) => void;
  onDelete?: (bookingId: string) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => formatINR(n);

function PaymentBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, (paid / total) * 100) : 100;
  const color = pct >= 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        marginTop: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: 'var(--text-4)',
        }}
      >
        <span>Paid {fmt(paid)}</span>
        <span style={{ color }}>
          {pct >= 100 ? 'Fully paid' : `Due ${fmt(total - paid)}`}
        </span>
      </div>
      <div
        style={{
          height: 4,
          borderRadius: 100,
          background: 'var(--surface-2)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            borderRadius: 100,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

function BookingCard({
  booking,
  canExportMenuPdf,
  canEditBooking,
  canDeleteBooking,
  onExportPdf,
  onExportBookingPdf,
  bookingPdfLoading,
  onEdit,
  onDelete,
}: BookingCardProps) {
  const paidAmount = Math.max(
    0,
    (booking.grandTotal || 0) - (booking.dueAmountValue ?? booking.grandTotal ?? 0)
  );

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'box-shadow 0.15s, border-color 0.15s',
        cursor: canEditBooking ? 'pointer' : undefined,
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => canEditBooking && onEdit?.(booking.id)}
      onMouseOver={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--teal-300)';
      }}
      onMouseOut={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background:
            booking.status === 'confirmed'
              ? 'var(--teal-500)'
              : booking.status === 'cancelled'
              ? '#ef4444'
              : booking.status === 'completed'
              ? '#8b5cf6'
              : booking.isQuotation
              ? '#f59e0b'
              : 'var(--border)',
          borderRadius: '16px 16px 0 0',
        }}
      />

      {/* Row 1: Title + Status */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingTop: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: 'var(--text-1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {booking.functionName || booking.functionType}
          </div>
          {booking.functionType?.trim().toLowerCase() !==
            (booking.functionName || '').trim().toLowerCase() && (
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 1 }}>
              {booking.functionType}
            </div>
          )}
        </div>
        <StatusBadge status={booking.isQuotation ? 'quotation' : booking.status} />
      </div>

      {/* Row 2: Customer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          color: 'var(--text-2)',
          marginTop: 10,
          fontWeight: 500,
        }}
      >
        <Users size={13} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {booking.customer?.name || '—'}
        </span>
        {booking.customer?.phone && (
          <span style={{ color: 'var(--text-4)', fontSize: 12 }}>
            · {booking.customer.phone}
          </span>
        )}
      </div>

      {/* Row 3: Date + Guests */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          <CalendarDays size={12} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          {formatDateDDMMYYYY(booking.functionDate)}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: 'var(--text-3)',
          }}
        >
          <Users size={12} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          {booking.expectedGuests ?? 0} guests
        </div>
      </div>

      {/* Row 3b: Hall / Venue */}
      {(booking.halls || []).length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            color: 'var(--text-3)',
            marginTop: 5,
            overflow: 'hidden',
          }}
        >
          <Building2 size={12} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {formatBookingHallNames(booking.halls)}
          </span>
        </div>
      )}

      {/* Row 4: Amount + payment bar */}
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 16,
              fontWeight: 700,
              color: 'var(--text-1)',
            }}
          >
            <IndianRupee size={14} />
            {(booking.grandTotal || 0).toLocaleString('en-IN')}
          </div>
        </div>
        <PaymentBar paid={paidAmount} total={booking.grandTotal || 0} />
      </div>

      {/* Row 5: Actions */}
      {(canExportMenuPdf || canEditBooking || canDeleteBooking) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginTop: 12,
            paddingTop: 10,
            borderTop: '1px solid var(--border)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <RowActionsMenu
            label="Booking actions"
            actions={[
              canExportMenuPdf && onExportBookingPdf && {
                label: bookingPdfLoading === booking.id ? 'Preparing PDF…' : 'Booking PDF',
                icon: Download,
                onSelect: () => onExportBookingPdf(booking),
                disabled: bookingPdfLoading === booking.id,
              },
              canExportMenuPdf && onExportPdf && {
                label: 'Menu PDF',
                icon: FileText,
                onSelect: () => onExportPdf(booking),
              },
              canEditBooking && onEdit && {
                label: 'Edit booking',
                icon: Edit,
                onSelect: () => onEdit(booking.id),
              },
              canDeleteBooking && onDelete && {
                label: 'Delete booking',
                icon: Trash2,
                onSelect: () => onDelete(booking.id),
                danger: true,
              },
            ]}
          />
        </div>
      )}
    </div>
  );
}

// Memoised: re-renders only when its props change. The parent must pass stable
// handler identities (see bookings page) for this to be effective.
export default memo(BookingCard);
