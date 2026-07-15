
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from '@/lib/router-compat';
import { useQuery } from '@tanstack/react-query';
import {
  Filter,
  LayoutGrid,
  Plus,
  Rows3,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import FilterPanel from '@/components/FilterPanel';
import Button from '@/components/ui/Button';
import { useBookingsListQuery, useBookingsServerListQuery, useEnquiriesListQuery } from '@/lib/query/hooks';
import { usesServerPagination } from '@/lib/featureFlags';
import { normalizeSearchForServer, selectListData } from '@/lib/listQuery';
import { useListUrlSync } from '@/lib/useListUrlSync';
import {
  SortState,
  TableColumnConfig,
  filterAndSortRows,
} from '@/lib/tableUtils';
import { useDebounce } from '@/lib/useDebounce';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import { useSSE } from '@/hooks/useSSE';
import { customerSearchText } from '@/lib/customerSearch';
import { resolveDueAmount } from '@bika/booking-core';
import Combobox from '@/components/Combobox';
import { confirmDialog } from '@/components/ConfirmDialog';
import { dateKeyKolkata } from '@/lib/date';
import FloatingActionButton from '@/components/FloatingActionButton';
import { CTA_NEW_BOOKING, CTA_NEW_ENQUIRY } from '@/lib/copy';
import Toolbar from '@/components/Toolbar';
import {
  BOOKING_SAVED_VIEWS,
  BOOKINGS_PAGE_SIZE,
  formatInrCompact,
  initialColumnSearch,
  type Booking,
} from './_lib/types';
import BookingsListSection from './_components/BookingsListSection';
import VenueHallFilter from './_components/VenueHallFilter';
import type { EnquiryStageRow } from './_components/EnquiryStagePanel';
import BookingFormModal from './_components/BookingFormModal';
import { useBookingForm } from './_hooks/useBookingForm';

function BookingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions || [], [user?.permissions]);
  const canViewBooking = hasAnyPermission(permissionSet, ['view_booking', 'manage_bookings']);
  const canAddBooking = hasAnyPermission(permissionSet, ['add_booking', 'manage_bookings']);
  const canEditBooking = hasAnyPermission(permissionSet, ['edit_booking', 'manage_bookings']);
  const canDeleteBooking = hasAnyPermission(permissionSet, ['delete_booking', 'manage_bookings']);
  const canExportMenuPdf = canViewBooking;
  const canViewEnquiry = hasAnyPermission(permissionSet, ['view_enquiry', 'manage_enquiries']);
  const canAddEnquiry = hasAnyPermission(permissionSet, ['add_enquiry', 'manage_enquiries']);

  const [useServer] = useState(() => usesServerPagination('bookings'));
  // List state initialises from the URL so filtered views are shareable and
  // survive refresh; useListUrlSync (below) mirrors changes back.
  const [savedView, setSavedView] = useState<string>(() => searchParams.get('view') || 'all');
  // The Enquiries stage renders its own client-fetched panel, so skip the
  // booking list fetch entirely while it's active (its server has no such view).
  const isEnquiryStage = savedView === 'enquiries';
  const {
    data: legacyBookings = [],
    isLoading: legacyLoading,
    refetch: refetchLegacyBookings,
    isError: legacyBookingsLoadError,
  } = useBookingsListQuery<Booking[]>(canViewBooking && !useServer && !isEnquiryStage);
  const [bookingPdfLoading, setBookingPdfLoading] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState(() => searchParams.get('q') || '');
  const debouncedGlobalSearch = useDebounce(globalSearch, useServer ? 300 : 150);
  const [columnSearch, setColumnSearch] = useState(() => ({
    ...initialColumnSearch,
    status: searchParams.get('status') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    banquetId: searchParams.get('venue') || '',
    hallIds: searchParams.get('halls') || '',
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<SortState>(() => {
    const [key, direction] = (searchParams.get('sort') || '').split('.');
    if (key && (direction === 'asc' || direction === 'desc')) return { key, direction };
    return { key: 'functionDate', direction: 'desc' };
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get('page'));
    return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
  });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // viewMode is a device preference, not shareable state → localStorage.
  useEffect(() => {
    const stored = window.localStorage.getItem('bika_bookings_view_mode');
    if (stored === 'cards' || stored === 'table') setViewMode(stored);
  }, []);
  useEffect(() => {
    window.localStorage.setItem('bika_bookings_view_mode', viewMode);
  }, [viewMode]);

  useListUrlSync({
    q: globalSearch,
    view: savedView === 'all' ? '' : savedView,
    status: columnSearch.status,
    from: columnSearch.dateFrom,
    to: columnSearch.dateTo,
    venue: columnSearch.banquetId,
    halls: columnSearch.hallIds,
    page: currentPage > 1 ? String(currentPage) : '',
    sort:
      sort.key === 'functionDate' && sort.direction === 'desc'
        ? ''
        : `${sort.key}.${sort.direction}`,
  });

  // Status and date range travel as REAL server params (below); only free-text
  // filters get flattened into the search string.
  const serverSearch = useMemo(() => {
    const parts = [debouncedGlobalSearch, columnSearch.functionName, columnSearch.customer]
      .map((v) => (v ?? '').trim())
      .filter(Boolean);
    return normalizeSearchForServer(parts.join(' '));
  }, [debouncedGlobalSearch, columnSearch.functionName, columnSearch.customer]);

  const {
    data: serverBookingsData,
    isLoading: serverBookingsLoading,
    isError: serverBookingsLoadError,
    refetch: refetchServerBookings,
  } = useBookingsServerListQuery<Booking>(canViewBooking && useServer && !isEnquiryStage, {
    page: currentPage,
    limit: BOOKINGS_PAGE_SIZE,
    search: serverSearch,
    sort: sort.key,
    order: sort.direction,
    status: columnSearch.status || undefined,
    fromDate: columnSearch.dateFrom || undefined,
    toDate: columnSearch.dateTo || undefined,
    banquetId: columnSearch.banquetId || undefined,
    hallIds: columnSearch.hallIds || undefined,
    // Saved view filters server-side so pagination, counts, and totals agree.
    // (A view overrides the status filter server-side.)
    view: savedView !== 'all' ? savedView : undefined,
  });

  const serverBookingsPrevRef = useRef<Booking[] | undefined>(undefined);
  if (serverBookingsData?.rows) serverBookingsPrevRef.current = serverBookingsData.rows;
  const serverBookingsSelected = selectListData<Booking>(
    serverBookingsData?.rows,
    serverBookingsPrevRef.current,
    serverBookingsLoadError
  );

  const bookings: Booking[] = useServer ? serverBookingsSelected.rows : legacyBookings;
  const loading = useServer ? serverBookingsLoading : legacyLoading;
  const bookingsLoadError = useServer ? false : legacyBookingsLoadError;
  const refetchBookings = useServer ? refetchServerBookings : refetchLegacyBookings;

  useEffect(() => {
    if (useServer && serverBookingsLoadError) {
      toast.error('Failed to load bookings. Showing last results.', {
        action: { label: 'Retry', onClick: () => void refetchServerBookings() },
      });
    }
  }, [useServer, serverBookingsLoadError, refetchServerBookings]);

  const loadBookings = useCallback(async () => {
    await refetchBookings();
  }, [refetchBookings]);

  const bookingForm = useBookingForm({
    onDataChanged: loadBookings,
    bookingsForMenuPdf: bookings,
  });

  const {
    openCreateBooking,
    openEditBooking,
    refreshOpenBookingFinancialsRef,
    setMenuPdfBooking,
    setShowCreateForm,
    setActiveBookingTab,
  } = bookingForm;

  // Pipeline: enquiries are the first stage, folded into this screen. Fetched
  // client-side (few, ≤200) so the chip shows a count and switching is instant;
  // the booking list itself stays on its tuned server-paginated path.
  const { data: enquiryRows = [], isLoading: enquiryLoading } = useEnquiriesListQuery<EnquiryStageRow[]>(
    canViewEnquiry,
    ''
  );
  const goToNewEnquiry = useCallback(() => router.push('/dashboard/enquiries?section=new'), [router]);
  const openEnquiry = useCallback(
    (id: string) => router.push(`/dashboard/enquiries?section=edit&id=${encodeURIComponent(id)}`),
    [router]
  );
  const goToCreate = useCallback(() => {
    if (isEnquiryStage) goToNewEnquiry();
    else void openCreateBooking();
  }, [isEnquiryStage, goToNewEnquiry, openCreateBooking]);

  const filteredEnquiryRows = useMemo(() => {
    const q = debouncedGlobalSearch.trim().toLowerCase();
    if (!q) return enquiryRows;
    return enquiryRows.filter((e) =>
      `${e.functionName} ${e.functionType} ${e.customer?.name ?? ''}`.toLowerCase().includes(q)
    );
  }, [enquiryRows, debouncedGlobalSearch]);

  // Venue → halls, grouped, for the Hall column filter popover. Small dataset,
  // cached; fetched only when the user can view bookings.
  const { data: hallsResp } = useQuery({
    queryKey: ['bookings', 'hall-filter-options'],
    queryFn: () => api.getHalls({ page: 1, limit: 5000 }),
    enabled: canViewBooking,
    staleTime: 5 * 60 * 1000,
  });
  const hallFilterOptions = useMemo(() => {
    const halls = hallsResp?.data?.data?.halls ?? [];
    const byVenue = new Map<
      string,
      { banquetId: string; banquetName: string; halls: { id: string; name: string }[] }
    >();
    for (const h of halls) {
      const banquetId = h.banquetId || h.banquet?.id || '';
      if (!banquetId) continue;
      const banquetName = h.banquet?.name || 'Unassigned';
      if (!byVenue.has(banquetId)) {
        byVenue.set(banquetId, { banquetId, banquetName, halls: [] });
      }
      byVenue.get(banquetId)!.halls.push({ id: h.id, name: h.name });
    }
    return Array.from(byVenue.values()).sort((a, b) =>
      a.banquetName.localeCompare(b.banquetName)
    );
  }, [hallsResp]);

  useEffect(() => {
    if (bookingsLoadError) {
      toast.error('Failed to load bookings');
    }
  }, [bookingsLoadError]);

  // Deep-link handling (palette, calendar, shared links). Watches the params —
  // not mount-only — so navigating to ?section=… while already on this page
  // still opens the modal. Params are stripped after handling so refresh/back
  // don't re-open it, and the handled-key resets so the same link works again.
  const handledDeepLinkRef = useRef<string | null>(null);
  useEffect(() => {
    const section = searchParams.get('section') || (searchParams.get('new') === '1' ? 'new' : null);
    if (section !== 'edit' && section !== 'new') {
      handledDeepLinkRef.current = null;
      return;
    }
    const id = searchParams.get('id');
    const key = `${section}|${id ?? ''}|${searchParams.get('date') ?? ''}|${searchParams.get('hall') ?? ''}|${searchParams.get('slot') ?? ''}|${searchParams.get('tab') ?? ''}`;
    if (handledDeepLinkRef.current === key) return;
    handledDeepLinkRef.current = key;

    const tab = searchParams.get('tab');
    const date = searchParams.get('date') || undefined;
    const hallId = searchParams.get('hall') || searchParams.get('hallId') || undefined;
    const slot = searchParams.get('slot') || undefined;

    const stripDeepLinkParams = () => {
      const next = new URLSearchParams(searchParams.toString());
      next.delete('section');
      next.delete('id');
      next.delete('new');
      next.delete('date');
      next.delete('hall');
      next.delete('hallId');
      next.delete('slot');
      next.delete('tab');
      const qs = next.toString();
      router.replace(qs ? `/dashboard/bookings?${qs}` : '/dashboard/bookings');
    };

    if (section === 'edit' && id) {
      void openEditBooking(id).then(() => {
        if (tab === 'payments') setActiveBookingTab('payments');
        stripDeepLinkParams();
      });
    } else if (section === 'new') {
      void openCreateBooking({ date, hallId, slot }).then(() => stripDeepLinkParams());
    }
  }, [searchParams, router, openCreateBooking, openEditBooking, setActiveBookingTab]);

  const bookingsSseDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLoadBookings = useCallback(() => {
    if (bookingsSseDebounceRef.current) clearTimeout(bookingsSseDebounceRef.current);
    bookingsSseDebounceRef.current = setTimeout(() => {
      void loadBookings();
    }, 300);
  }, [loadBookings]);

  useEffect(() => {
    return () => {
      if (bookingsSseDebounceRef.current) clearTimeout(bookingsSseDebounceRef.current);
    };
  }, []);

  // Realtime updates via the shared SSE hook (reconnect/backoff/status chip);
  // the previous hand-rolled EventSource here silently died on the first
  // connection drop.
  useSSE(
    ['booking:'],
    (event) => {
      debouncedLoadBookings();
      if (event?.id) {
        refreshOpenBookingFinancialsRef.current(event.id);
      }
    },
    canViewBooking
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedGlobalSearch, columnSearch, sort, savedView]);

  const tableColumns = useMemo<TableColumnConfig<Booking>[]>(
    () => [
      {
        key: 'functionName',
        accessor: (booking) => `${booking.functionName} ${booking.functionType}`,
      },
      {
        key: 'customer',
        accessor: (booking) =>
          customerSearchText({
            name: booking.customer?.name,
            phone: booking.customer?.phone,
            email: booking.customer?.email,
          }),
      },
      {
        key: 'functionDate',
        accessor: (booking) => booking.functionDate,
      },
      {
        key: 'expectedGuests',
        accessor: (booking) => booking.expectedGuests,
        searchable: false,
      },
      {
        key: 'status',
        accessor: (booking) =>
          booking.isQuotation ? 'Quotation' : booking.status,
      },
      {
        key: 'grandTotal',
        accessor: (booking) => booking.grandTotal ?? 0,
        searchable: false,
      },
    ],
    []
  );

  const activeSavedView = useMemo(
    () => BOOKING_SAVED_VIEWS.find((v) => v.id === savedView) ?? BOOKING_SAVED_VIEWS[0],
    [savedView]
  );

  // Legacy client-side path: the saved view and date range filter BEFORE
  // pagination so page counts and stats stay correct. (Server path filters
  // via view/fromDate/toDate params.)
  const clientFilteredBookings = useMemo(() => {
    let rows = filterAndSortRows(bookings, tableColumns, debouncedGlobalSearch, columnSearch, sort);
    if (activeSavedView.fn) rows = rows.filter(activeSavedView.fn);
    if (columnSearch.dateFrom || columnSearch.dateTo) {
      rows = rows.filter((b) => {
        const key = dateKeyKolkata(b.functionDate);
        if (columnSearch.dateFrom && key < columnSearch.dateFrom) return false;
        if (columnSearch.dateTo && key > columnSearch.dateTo) return false;
        return true;
      });
    }
    if (columnSearch.hallIds) {
      const ids = new Set(columnSearch.hallIds.split(',').filter(Boolean));
      rows = rows.filter((b) => (b.halls || []).some((h) => h.hall && ids.has(h.hall.id)));
    } else if (columnSearch.banquetId) {
      rows = rows.filter((b) =>
        (b.halls || []).some((h) => h.hall?.banquet?.id === columnSearch.banquetId)
      );
    }
    return rows;
  }, [bookings, tableColumns, debouncedGlobalSearch, columnSearch, sort, activeSavedView]);

  const serverBookingsTotal = serverBookingsData?.pagination?.total ?? 0;
  const totalBookingsCount = useServer
    ? serverBookingsTotal
    : clientFilteredBookings.length;

  const totalPages = useMemo(
    () =>
      useServer
        ? Math.max(1, serverBookingsData?.pagination?.totalPages ?? 1)
        : Math.max(1, Math.ceil(clientFilteredBookings.length / BOOKINGS_PAGE_SIZE)),
    [useServer, serverBookingsData?.pagination?.totalPages, clientFilteredBookings.length]
  );

  const paginatedBookings = useMemo(() => {
    if (useServer) return bookings;
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * BOOKINGS_PAGE_SIZE;
    return clientFilteredBookings.slice(startIndex, startIndex + BOOKINGS_PAGE_SIZE);
  }, [useServer, bookings, currentPage, clientFilteredBookings, totalPages]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  // Both paths already filtered by the saved view — render the page as-is.
  const viewBookings = paginatedBookings;

  const handleColumnSearch = (key: keyof typeof initialColumnSearch, value: string) => {
    setColumnSearch((prev) => ({ ...prev, [key]: value }));
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const target = bookings.find((b) => b.id === bookingId);
    const confirmed = await confirmDialog({
      title: 'Delete this booking?',
      description: target
        ? `${target.functionName} — ${target.customer?.name || 'Unknown customer'}. This cannot be undone.`
        : 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await api.deleteBooking(bookingId);
      toast.success('Booking deleted successfully');
      await loadBookings();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to delete booking');
    }
  };

  const openEditBookingRef = useRef(openEditBooking);
  openEditBookingRef.current = openEditBooking;
  const handleDeleteBookingRef = useRef(handleDeleteBooking);
  handleDeleteBookingRef.current = handleDeleteBooking;
  const stableOnEdit = useCallback((id: string) => {
    void openEditBookingRef.current(id);
  }, []);
  const stableOnDelete = useCallback((id: string) => {
    void handleDeleteBookingRef.current(id);
  }, []);

  const handleDownloadBookingPdf = useCallback(async (booking: Booking) => {
    if (bookingPdfLoading) return;
    try {
      setBookingPdfLoading(booking.id);
      const response = await api.getBookingPdf(booking.id);
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const baseName = [booking.bookingNumber, booking.functionName || booking.functionType || booking.customer?.name]
        .filter(Boolean)
        .join(' ');
      const safeName = (baseName || 'booking')
        .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'booking';
      link.href = url;
      link.download = `${safeName}-booking-details.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to generate booking PDF');
    } finally {
      setBookingPdfLoading(null);
    }
  }, [bookingPdfLoading]);

  // Money stats cover the WHOLE filtered set (server aggregates on the
  // paginated path, full filtered list on the legacy path) — never just the
  // visible page slice.
  const bookingsValueInView = useMemo(
    () =>
      useServer
        ? serverBookingsData?.totals?.grandTotal ?? 0
        : clientFilteredBookings.reduce((sum, b) => sum + (b.grandTotal || 0), 0),
    [useServer, serverBookingsData?.totals?.grandTotal, clientFilteredBookings]
  );

  const bookingsOutstandingInView = useMemo(
    () =>
      useServer
        ? serverBookingsData?.totals?.due ?? 0
        : clientFilteredBookings.reduce((sum, b) => sum + resolveDueAmount(b), 0),
    [useServer, serverBookingsData?.totals?.due, clientFilteredBookings]
  );

  return (
    <div className="ops-route ops-list-route">
      <Toolbar
        title="Bookings"
        stats={
          isEnquiryStage
            ? [{ label: 'Enquiries', value: enquiryRows.length }]
            : [
                { label: 'In view', value: totalBookingsCount },
                { label: 'Value in view', value: formatInrCompact(bookingsValueInView) },
                {
                  label: 'Outstanding',
                  value: (
                    <span
                      className={
                        bookingsOutstandingInView > 0
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }
                    >
                      {formatInrCompact(bookingsOutstandingInView)}
                    </span>
                  ),
                },
              ]
        }
        actions={
          <>
            <div className="ops-toolbar-search">
              <Search className="w-4 h-4" aria-hidden="true" />
              <input
                type="search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search..."
                aria-label="Search"
              />
            </div>
            {!isEnquiryStage && (
              <button
                type="button"
                className="btn btn-secondary ops-filter-button"
                onClick={() => setShowFilters(true)}
              >
                <Filter className="w-4 h-4" />
                Filters
                {Object.values(columnSearch).filter(Boolean).length > 0 && (
                  <span className="ops-filter-count">
                    {Object.values(columnSearch).filter(Boolean).length}
                  </span>
                )}
              </button>
            )}
            {!isEnquiryStage && (
              <div
                role="group"
                aria-label="Toggle view"
                className="hidden md:inline-flex overflow-hidden rounded-lg border border-[var(--border)]"
              >
                {([
                  { mode: 'cards', Icon: LayoutGrid, label: 'Card view' },
                  { mode: 'table', Icon: Rows3, label: 'Table view' },
                ] as const).map(({ mode, Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode(mode)}
                    aria-pressed={viewMode === mode}
                    title={label}
                    className={`px-2.5 py-1.5 ${
                      viewMode === mode
                        ? 'bg-teal-600 text-white'
                        : 'bg-transparent text-[var(--text-3)] hover:text-[var(--text-1)]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            )}
            {(isEnquiryStage ? canAddEnquiry : canAddBooking) ? (
              <Button
                type="button"
                variant="primary"
                onClick={goToCreate}
                className="inline-flex items-center gap-2 justify-center"
                icon={<Plus className="w-4 h-4" />}
              >
                {isEnquiryStage ? CTA_NEW_ENQUIRY : CTA_NEW_BOOKING}
              </Button>
            ) : null}
          </>
        }
      />

      {!canViewBooking && (
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 text-sm">
          You do not have permission to view bookings.
        </div>
      )}

      <BookingFormModal {...bookingForm} />

      <BookingsListSection
        canViewBooking={canViewBooking}
        canAddBooking={canAddBooking}
        canEditBooking={canEditBooking}
        canDeleteBooking={canDeleteBooking}
        canExportMenuPdf={canExportMenuPdf}
        loading={loading}
        bookingPdfLoading={bookingPdfLoading}
        savedView={savedView}
        setSavedView={setSavedView}
        viewMode={viewMode}
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        columnSearch={columnSearch}
        setColumnSearch={setColumnSearch}
        handleColumnSearch={handleColumnSearch}
        hallFilterOptions={hallFilterOptions}
        sort={sort}
        setSort={setSort}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalPages={totalPages}
        totalBookingsCount={totalBookingsCount}
        viewBookings={viewBookings}
        openEditBooking={(id) => void openEditBooking(id)}
        stableOnEdit={stableOnEdit}
        stableOnDelete={stableOnDelete}
        handleDeleteBooking={(id) => void handleDeleteBooking(id)}
        handleDownloadBookingPdf={(b) => void handleDownloadBookingPdf(b)}
        setMenuPdfBooking={setMenuPdfBooking}
        setShowCreateForm={setShowCreateForm}
        canViewEnquiry={canViewEnquiry}
        enquiryStage={isEnquiryStage}
        enquiryRows={filteredEnquiryRows}
        enquiryLoading={enquiryLoading}
        enquiryCount={canViewEnquiry ? enquiryRows.length : null}
        onOpenEnquiry={openEnquiry}
        onNewEnquiry={canAddEnquiry ? goToNewEnquiry : undefined}
      />

      {(isEnquiryStage ? canAddEnquiry : canAddBooking) && (
        <FloatingActionButton
          onClick={goToCreate}
          label={isEnquiryStage ? CTA_NEW_ENQUIRY : CTA_NEW_BOOKING}
        />
      )}

      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={Object.values(columnSearch).filter(Boolean).length}
        onClearAll={() => setColumnSearch(initialColumnSearch)}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Function</label>
            <input className="input" placeholder="Search function" value={columnSearch.functionName} onChange={(e) => handleColumnSearch('functionName', e.target.value)} />
          </div>
          <div>
            <label className="label">Customer</label>
            <input className="input" placeholder="Search name or phone" value={columnSearch.customer} onChange={(e) => handleColumnSearch('customer', e.target.value)} />
          </div>
          <div>
            <label className="label">Date from</label>
            <input type="date" className="input" value={columnSearch.dateFrom} onChange={(e) => handleColumnSearch('dateFrom', e.target.value)} />
          </div>
          <div>
            <label className="label">Date to</label>
            <input type="date" className="input" value={columnSearch.dateTo} onChange={(e) => handleColumnSearch('dateTo', e.target.value)} />
          </div>
          <VenueHallFilter
            options={hallFilterOptions}
            columnSearch={columnSearch}
            setColumnSearch={setColumnSearch}
          />
          <div>
            <label className="label">Guests</label>
            <input className="input" placeholder="Search guests" value={columnSearch.expectedGuests} onChange={(e) => handleColumnSearch('expectedGuests', e.target.value)} />
          </div>
          <div>
            <label className="label">Status</label>
            <Combobox
              value={columnSearch.status}
              onChange={(value) => handleColumnSearch('status', value)}
              options={[
                { value: '', label: 'Any status' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'pencil', label: 'Pencil' },
                { value: 'quotation', label: 'Quotation' },
                { value: 'enquiry', label: 'Enquiry' },
                { value: 'pending', label: 'Pending' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'completed', label: 'Completed' },
              ]}
            />
          </div>
          <div>
            <label className="label">Amount</label>
            <input className="input" placeholder="Search amount" value={columnSearch.grandTotal} onChange={(e) => handleColumnSearch('grandTotal', e.target.value)} />
          </div>
        </div>
      </FilterPanel>
    </div>
  );
}

// Next required Suspense around useSearchParams; TanStack does not suspend.
export default function BookingsPage() {
  return <BookingsPageContent />;
}
