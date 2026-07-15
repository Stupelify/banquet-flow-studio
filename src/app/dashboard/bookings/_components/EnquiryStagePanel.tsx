
import { PhoneCall, Search } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import StatusBadge, { getRowStatusClass } from '@/components/StatusBadge';
import { BookingsTableSkeleton } from '@/components/Skeletons';
import { formatDateCompact } from '@/lib/date';
import { CTA_NEW_ENQUIRY } from '@/lib/copy';
import { formatBookingHallNames } from '@/lib/hallLabel';
import { formatDisplayInteger } from '@/lib/displayNumbers';

export interface EnquiryStageRow {
  id: string;
  functionName: string;
  functionType: string;
  functionDate: string;
  expectedGuests: number;
  status: string;
  quotationSent?: boolean;
  isPencilBooked?: boolean;
  customer?: { name?: string; phone?: string } | null;
  halls?: Array<{ hall?: { name?: string } | null }> | null;
}

// Enquiries are pre-booking leads (a separate model), shown here as the first
// stage of the one pipeline. The booking list is server-paginated, so rather
// than interleave two paginated sources, the Enquiries stage renders its own
// client-fetched panel. Rows deep-link to the enquiry editor.
function stageStatus(row: EnquiryStageRow): string {
  if (row.isPencilBooked) return 'pencil';
  if (row.quotationSent) return 'quotation';
  return row.status;
}

interface EnquiryStagePanelProps {
  rows: EnquiryStageRow[];
  loading: boolean;
  search: string;
  onOpen?: (id: string) => void;
  onNewEnquiry?: () => void;
}

export default function EnquiryStagePanel({ rows, loading, search, onOpen, onNewEnquiry }: EnquiryStagePanelProps) {
  return (
    <div className="ops-table-card">
      {loading ? (
        <div className="py-6">
          <BookingsTableSkeleton rows={8} showActions={false} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={search ? Search : PhoneCall}
          variant={search ? 'search' : 'page'}
          title={search ? 'No enquiries match your search' : 'No enquiries yet'}
          description={
            search
              ? `"${search}" returned no results.`
              : 'New leads land here as the first stage of the pipeline.'
          }
          action={!search && onNewEnquiry ? { label: CTA_NEW_ENQUIRY, onClick: onNewEnquiry } : undefined}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden">
            <div className="mobile-card-list">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="mobile-card"
                  onClick={() => onOpen?.(row.id)}
                  style={onOpen ? { cursor: 'pointer' } : undefined}
                >
                  <div className="mobile-card-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="mobile-card-title">{row.functionName}</div>
                      {row.functionType?.trim().toLowerCase() !==
                        (row.functionName || '').trim().toLowerCase() && (
                        <div className="mobile-card-subtitle">{row.functionType}</div>
                      )}
                    </div>
                    <StatusBadge status={stageStatus(row)} />
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Customer</span>
                    <span className="mobile-card-value">{row.customer?.name || '—'}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Date</span>
                    <span className="mobile-card-value">{formatDateCompact(row.functionDate)}</span>
                  </div>
                  <div className="mobile-card-row">
                    <span className="mobile-card-label">Guests</span>
                    <span className="mobile-card-value">{formatDisplayInteger(row.expectedGuests)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block table-shell">
            <table className="data-table">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Function / Customer</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Date</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Hall</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Guests</th>
                  <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Stage</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className={`ops-click-row cv-auto-row border-b border-[var(--border)] hover:bg-[var(--surface-2)] ${getRowStatusClass(stageStatus(row))}`}
                    onClick={() => onOpen?.(row.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpen?.(row.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="py-2.5 px-4 main">
                      <p className="font-medium text-[var(--text-1)]">{row.functionName}</p>
                      <p className="text-xs text-[var(--text-4)] mt-1">{row.customer?.name}</p>
                    </td>
                    <td className="py-2.5 px-4 text-sm text-[var(--text-2)] whitespace-nowrap">
                      {formatDateCompact(row.functionDate)}
                    </td>
                    <td className="py-2.5 px-4 text-sm text-[var(--text-2)]">
                      {(row.halls || []).length > 0
                        ? formatBookingHallNames(row.halls as never)
                        : <span className="text-[var(--text-4)]">—</span>}
                    </td>
                    <td className="py-2.5 px-4 text-right text-sm text-[var(--text-2)] num">
                      {formatDisplayInteger(row.expectedGuests)}
                    </td>
                    <td className="py-2.5 px-4">
                      <StatusBadge status={stageStatus(row)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
