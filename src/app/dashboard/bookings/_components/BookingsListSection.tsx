
import { CalendarCheck, Plus, Search, Edit, Trash2, Download, FileText, PencilLine } from 'lucide-react';
import EmptyState from '@/components/EmptyState';
import ColumnFilter from './ColumnFilter';
import VenueHallFilter from './VenueHallFilter';
import SortableHeader from '@/components/SortableHeader';
import TablePagination from '@/components/TablePagination';
import { BookingsTableSkeleton } from '@/components/Skeletons';
import MobileBookingCard from '@/components/MobileBookingCard';
import BookingCard from '@/components/BookingCard';
import RowActionsMenu from '@/components/RowActionsMenu';
import EnquiryStagePanel, { type EnquiryStageRow } from './EnquiryStagePanel';
import StatusBadge, { getRowStatusClass } from '@/components/StatusBadge';
import { formatDateCompact } from '@/lib/date';
import { formatBookingHallNames } from '@/lib/hallLabel';
import { getNextSort, type SortState } from '@/lib/tableUtils';
import { formatDisplayInteger } from '@/lib/displayNumbers';
import { formatINR } from '@/lib/format';
import { resolveDueAmount } from '@bika/booking-core';
import {
  BOOKING_SAVED_VIEWS,
  BOOKINGS_PAGE_SIZE,
  formatInrCompact,
  initialColumnSearch,
  pencilExpiryDays,
  type Booking,
} from '../_lib/types';

interface BookingsListSectionProps {
  canViewBooking: boolean;
  canAddBooking: boolean;
  canEditBooking: boolean;
  canDeleteBooking: boolean;
  canExportMenuPdf: boolean;
  loading: boolean;
  bookingPdfLoading: string | null;
  savedView: string;
  setSavedView: (id: string) => void;
  viewMode: 'table' | 'cards';
  globalSearch: string;
  setGlobalSearch: (value: string) => void;
  columnSearch: typeof initialColumnSearch;
  setColumnSearch: React.Dispatch<React.SetStateAction<typeof initialColumnSearch>>;
  handleColumnSearch: (key: keyof typeof initialColumnSearch, value: string) => void;
  hallFilterOptions: Array<{
    banquetId: string;
    banquetName: string;
    halls: Array<{ id: string; name: string }>;
  }>;
  sort: SortState;
  setSort: React.Dispatch<React.SetStateAction<SortState>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
  totalBookingsCount: number;
  viewBookings: Booking[];
  openEditBooking: (bookingId: string) => void;
  stableOnEdit: (id: string) => void;
  stableOnDelete: (id: string) => void;
  handleDeleteBooking: (bookingId: string) => void;
  handleDownloadBookingPdf: (booking: Booking) => void;
  setMenuPdfBooking: (booking: Booking | null) => void;
  setShowCreateForm: (open: boolean) => void;
  // Pipeline: the Enquiries stage folds pre-booking leads into this screen.
  canViewEnquiry?: boolean;
  enquiryStage?: boolean;
  enquiryRows?: EnquiryStageRow[];
  enquiryLoading?: boolean;
  enquiryCount?: number | null;
  onOpenEnquiry?: (id: string) => void;
  onNewEnquiry?: () => void;
}

/**
 * Saved-view bar, search/filter controls, and the bookings table / card list
 * with pagination. JSX moved verbatim from page.tsx; state stays in the page.
 */
export default function BookingsListSection({
  canViewBooking,
  canAddBooking,
  canEditBooking,
  canDeleteBooking,
  canExportMenuPdf,
  loading,
  bookingPdfLoading,
  savedView,
  setSavedView,
  viewMode,
  globalSearch,
  setGlobalSearch,
  columnSearch,
  setColumnSearch,
  handleColumnSearch,
  hallFilterOptions,
  sort,
  setSort,
  currentPage,
  setCurrentPage,
  totalPages,
  totalBookingsCount,
  viewBookings,
  openEditBooking,
  stableOnEdit,
  stableOnDelete,
  handleDeleteBooking,
  handleDownloadBookingPdf,
  setMenuPdfBooking,
  setShowCreateForm,
  canViewEnquiry,
  enquiryStage,
  enquiryRows,
  enquiryLoading,
  enquiryCount,
  onOpenEnquiry,
  onNewEnquiry,
}: BookingsListSectionProps) {
  const chipClass = (active: boolean) =>
    `flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
      active
        ? 'border-teal-600 bg-teal-600 text-white'
        : 'border-[var(--border-2)] bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text-1)]'
    }`;

  return (
    <>
      {canViewBooking && (
        <div className="ops-view-bar">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-4)] flex-shrink-0">
            Pipeline
          </span>
          {BOOKING_SAVED_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSavedView(v.id)}
              className={chipClass(savedView === v.id)}
            >
              {v.label}
            </button>
          ))}
          {canViewEnquiry && (
            <button
              type="button"
              onClick={() => setSavedView('enquiries')}
              className={chipClass(savedView === 'enquiries')}
            >
              Enquiries
              {enquiryCount != null && enquiryCount > 0 && (
                <span className="ml-1.5 tabular-nums opacity-80">{enquiryCount}</span>
              )}
            </button>
          )}
        </div>
      )}

      {enquiryStage ? (
        <EnquiryStagePanel
          rows={enquiryRows ?? []}
          loading={Boolean(enquiryLoading)}
          search={globalSearch}
          onOpen={onOpenEnquiry}
          onNewEnquiry={onNewEnquiry}
        />
      ) : (
        <>
      <div className="ops-table-card">
        {!canViewBooking ? (
          <EmptyState
            icon={CalendarCheck}
            variant="page"
            title="No data available"
            description="You do not have access to view bookings."
          />
        ) : loading ? (
          <div className="py-6">
            <BookingsTableSkeleton
              rows={8}
              showActions={canExportMenuPdf || canEditBooking || canDeleteBooking}
            />
          </div>
        ) : totalBookingsCount === 0 ? (
          <EmptyState
            icon={globalSearch ? Search : CalendarCheck}
            variant={
              globalSearch
                ? 'search'
                : Object.values(columnSearch).some(Boolean)
                  ? 'filter'
                  : 'page'
            }
            title={
              globalSearch
                ? 'No bookings match your search'
                : Object.values(columnSearch).some(Boolean)
                  ? 'No matches'
                  : 'No bookings found'
            }
            description={
              globalSearch || Object.values(columnSearch).some(Boolean)
                ? `"${globalSearch || Object.values(columnSearch).find(Boolean)}" returned no results.`
                : 'Create a booking to start tracking events.'
            }
            action={
              globalSearch
                ? { label: 'Clear search', onClick: () => setGlobalSearch('') }
                : Object.values(columnSearch).some(Boolean)
                  ? { label: 'Clear filters', onClick: () => setColumnSearch(initialColumnSearch) }
                  : canAddBooking
                    ? { label: 'New Booking', onClick: () => setShowCreateForm(true) }
                    : undefined
            }
          />
        ) : viewBookings.length === 0 ? (
          <div className="empty-state" style={{ padding: '32px 16px' }}>
            <p className="empty-state-title">No bookings match this view</p>
            <p className="empty-state-desc">Try a different saved view or clear it to see all bookings.</p>
            {savedView !== 'all' && (
              <button type="button" className="btn btn-secondary mt-2" onClick={() => setSavedView('all')}>
                Clear view
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card view — always shown on small screens */}
            <div className="md:hidden">
              <div className="mobile-card-list">
                    {viewBookings.map((booking) => (
                      <MobileBookingCard
                        key={booking.id}
                        booking={booking}
                        canExportMenuPdf={canExportMenuPdf && (booking._count?.packs ?? 1) > 0}
                        canEditBooking={canEditBooking}
                        canDeleteBooking={canDeleteBooking}
                        onExportPdf={setMenuPdfBooking}
                        onExportBookingPdf={handleDownloadBookingPdf}
                        bookingPdfLoading={bookingPdfLoading}
                        onEdit={stableOnEdit}
                        onDelete={stableOnDelete}
                      />
                    ))}
                  </div>
                  <TablePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalBookingsCount}
                    pageSize={BOOKINGS_PAGE_SIZE}
                    itemLabel="bookings"
                    onPageChange={setCurrentPage}
                  />
            </div>

            {/* Desktop card grid view */}
            {viewMode === 'cards' && (
              <div className="hidden md:block">
                <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 16,
                        padding: '4px 0',
                      }}
                    >
                      {viewBookings.map((booking) => (
                        <BookingCard
                          key={booking.id}
                          booking={booking}
                          canExportMenuPdf={canExportMenuPdf && (booking._count?.packs ?? 1) > 0}
                          canEditBooking={canEditBooking}
                          canDeleteBooking={canDeleteBooking}
                          onExportPdf={setMenuPdfBooking}
                          onExportBookingPdf={handleDownloadBookingPdf}
                          bookingPdfLoading={bookingPdfLoading}
                          onEdit={stableOnEdit}
                          onDelete={stableOnDelete}
                        />
                      ))}
                    </div>
                    <TablePagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalBookingsCount}
                      pageSize={BOOKINGS_PAGE_SIZE}
                      itemLabel="bookings"
                      onPageChange={setCurrentPage}
                    />
              </div>
            )}

            {/* Desktop table view */}
            <div className={viewMode === 'table' ? 'hidden md:block table-shell' : 'hidden'}>
              <table className="data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Booking</th>
                    <SortableHeader
                      label="Function / Customer"
                      sortKey="functionName"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                    />
                    <SortableHeader
                      label="Date"
                      sortKey="functionDate"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      filterSlot={
                        <ColumnFilter
                          label="date"
                          active={Boolean(columnSearch.dateFrom || columnSearch.dateTo)}
                        >
                          <div className="space-y-2">
                            <div>
                              <label className="label">From</label>
                              <input
                                type="date"
                                className="input"
                                value={columnSearch.dateFrom}
                                onChange={(e) => handleColumnSearch('dateFrom', e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="label">To</label>
                              <input
                                type="date"
                                className="input"
                                value={columnSearch.dateTo}
                                onChange={(e) => handleColumnSearch('dateTo', e.target.value)}
                              />
                            </div>
                            {(columnSearch.dateFrom || columnSearch.dateTo) && (
                              <button
                                type="button"
                                className="text-xs text-teal-600"
                                onClick={() =>
                                  setColumnSearch((prev) => ({ ...prev, dateFrom: '', dateTo: '' }))
                                }
                              >
                                Clear dates
                              </button>
                            )}
                          </div>
                        </ColumnFilter>
                      }
                    />
                    <th className="py-3 px-4 text-sm font-semibold text-[var(--text-2)]">
                      <span className="inline-flex items-center gap-1">
                        Hall
                        <ColumnFilter
                          label="hall"
                          active={Boolean(columnSearch.banquetId || columnSearch.hallIds)}
                        >
                          <VenueHallFilter
                            options={hallFilterOptions}
                            columnSearch={columnSearch}
                            setColumnSearch={setColumnSearch}
                          />
                        </ColumnFilter>
                      </span>
                    </th>
                    <SortableHeader
                      label="Guests"
                      sortKey="expectedGuests"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-4 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Grand total"
                      sortKey="grandTotal"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-4 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <th aria-label="Due" className="text-right py-3 px-4 text-sm font-semibold text-[var(--text-2)]">Due</th>
                    <SortableHeader
                      label="Status"
                      sortKey="status"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                    />
                    {(canExportMenuPdf || canEditBooking || canDeleteBooking) && (
                      <th className="ops-secondary-actions text-right py-3 px-4 text-sm font-semibold text-[var(--text-2)]">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {viewBookings.map((booking) => {
                    const rowStatus = booking.isQuotation ? 'quotation' : booking.status;
                    const expDays = booking.status === 'pencil' ? pencilExpiryDays(booking.pencilExpiresAt) : null;
                    const balanceDue = resolveDueAmount(booking);
                    return (
                      <tr
                        key={booking.id}
                        className={`ops-click-row cv-auto-row border-b border-[var(--border)] hover:bg-[var(--surface-2)] ${getRowStatusClass(rowStatus)}`}
                        onClick={() => openEditBooking(booking.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openEditBooking(booking.id);
                          }
                        }}
                        tabIndex={0}
                      >
                      <td className="py-2.5 px-4 id whitespace-nowrap">
                        {booking.bookingNumber || booking.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-2.5 px-4 main">
                        <p className="font-medium text-[var(--text-1)]">{booking.functionName}</p>
                        <p className="text-xs text-[var(--text-4)] mt-1">{booking.customer?.name}</p>
                      </td>
                      <td className="py-2.5 px-4 text-sm text-[var(--text-2)] whitespace-nowrap">
                        {formatDateCompact(booking.functionDate)}
                        {expDays != null && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                            exp {expDays}d
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-sm text-[var(--text-2)]">
                        {(booking.halls || []).length > 0
                          ? formatBookingHallNames(booking.halls)
                          : <span className="text-[var(--text-4)]">—</span>}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm text-[var(--text-2)] num">
                        {formatDisplayInteger(booking.expectedGuests)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-sm font-medium text-[var(--text-1)] num" title={formatINR(booking.grandTotal || 0)}>
                        {formatInrCompact(booking.grandTotal || 0)}
                      </td>
                      <td
                        className={`py-4 px-4 text-right text-sm font-medium num ${balanceDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
                        title={formatINR(balanceDue)}
                      >
                        {balanceDue > 0 ? formatInrCompact(balanceDue) : 'Paid'}
                      </td>
                      <td className="py-2.5 px-4">
                        <StatusBadge status={rowStatus} />
                      </td>
                      {(canExportMenuPdf || canEditBooking || canDeleteBooking) && (
                        <td className="ops-secondary-actions py-4 px-4 text-right" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center justify-end">
                            <RowActionsMenu
                              label="Booking actions"
                              actions={[
                                canExportMenuPdf && {
                                  label: bookingPdfLoading === booking.id ? 'Preparing PDF…' : 'Booking PDF',
                                  icon: Download,
                                  onSelect: () => handleDownloadBookingPdf(booking),
                                  disabled: bookingPdfLoading === booking.id,
                                },
                                canExportMenuPdf && (booking._count?.packs ?? 1) > 0 && {
                                  label: 'Menu PDF',
                                  icon: FileText,
                                  onSelect: () => setMenuPdfBooking(booking),
                                },
                                canEditBooking && {
                                  label: 'Edit booking',
                                  icon: Edit,
                                  onSelect: () => openEditBooking(booking.id),
                                },
                                canDeleteBooking && {
                                  label: 'Delete booking',
                                  icon: Trash2,
                                  onSelect: () => handleDeleteBooking(booking.id),
                                  danger: true,
                                },
                              ]}
                            />
                          </div>
                        </td>
                      )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalBookingsCount}
                pageSize={BOOKINGS_PAGE_SIZE}
                itemLabel="bookings"
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
        </>
      )}
    </>
  );
}
