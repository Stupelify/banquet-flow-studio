
import { memo } from 'react';
import { Building2, CalendarDays, Download, Edit, FileText, Trash2, Users } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/lib/date';
import { formatBookingHallNames } from '@/lib/hallLabel';
import { formatINR } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import RowActionsMenu from '@/components/RowActionsMenu';
import { formatDisplayInteger } from '@/lib/displayNumbers';

interface Booking {
    id: string;
    functionName: string;
    functionType: string;
    functionDate: string;
    expectedGuests: number;
    status: string;
    isQuotation: boolean;
    grandTotal: number;
    customer: {
        name: string;
        phone: string;
    };
    halls?: Array<{
        hall?: { id: string; name: string; banquet?: { id: string; name: string } | null } | null;
    }>;
}

interface MobileBookingCardProps {
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

function MobileBookingCard({
    booking,
    canExportMenuPdf,
    canEditBooking,
    canDeleteBooking,
    onExportPdf,
    onExportBookingPdf,
    bookingPdfLoading,
    onEdit,
    onDelete,
}: MobileBookingCardProps) {
    const hasActions = canExportMenuPdf || canEditBooking || canDeleteBooking;

    return (
        <div
            className="mobile-card"
            onClick={() => canEditBooking && onEdit?.(booking.id)}
            style={canEditBooking ? { cursor: 'pointer' } : undefined}
        >
            <div className="mobile-card-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="mobile-card-title">{booking.functionName}</div>
                    {booking.functionType?.trim().toLowerCase() !==
                      (booking.functionName || '').trim().toLowerCase() && (
                      <div className="mobile-card-subtitle">{booking.functionType}</div>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <StatusBadge status={booking.isQuotation ? 'quotation' : booking.status} />
                    {hasActions && (
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
                    )}
                </div>
            </div>

            <div className="mobile-card-row">
                <span className="mobile-card-label">Customer</span>
                <span className="mobile-card-value">
                    {booking.customer?.name || '—'}
                </span>
            </div>
            {booking.customer?.phone && (
                <div className="mobile-card-row">
                    <span className="mobile-card-label">Phone</span>
                    <span className="mobile-card-value">{booking.customer.phone}</span>
                </div>
            )}

            <div className="mobile-card-meta" style={{ marginTop: 8, marginBottom: 4 }}>
                <span className="mobile-card-meta-item">
                    <CalendarDays style={{ width: 14, height: 14 }} aria-hidden="true" />
                    {formatDateDDMMYYYY(booking.functionDate)}
                </span>
                <span className="mobile-card-meta-item">
                    <Users style={{ width: 14, height: 14 }} aria-hidden="true" />
                    {formatDisplayInteger(booking.expectedGuests)} guests
                </span>
            </div>

            {(booking.halls || []).length > 0 && (
                <div className="mobile-card-row">
                    <span className="mobile-card-label">
                        <Building2 style={{ width: 12, height: 12, display: 'inline', marginRight: 3 }} />
                        Hall
                    </span>
                    <span className="mobile-card-value">
                        {formatBookingHallNames(booking.halls)}
                    </span>
                </div>
            )}

            <div className="mobile-card-row" style={{ marginTop: 6 }}>
                <span className="mobile-card-label">Amount</span>
                <span className="mobile-card-amount">
                    {formatINR(booking.grandTotal || 0)}
                </span>
            </div>

        </div>
    );
}

// Memoised: relies on the parent passing stable handler identities.
export default memo(MobileBookingCard);
