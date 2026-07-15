
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from '@/lib/router-compat';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addDays } from 'date-fns';
import { useSSE } from '@/hooks/useSSE';
import { useListUrlSync } from '@/lib/useListUrlSync';
import { toast } from 'sonner';
import { CreditCard, Plus, Save, Search, Filter, MessageCircle } from 'lucide-react';
import { dateKeyKolkata, todayKeyKolkata } from '@/lib/date';
import { formatINR } from '@/lib/format';
import FormPromptModal from '@/components/FormPromptModal';
import FilterPanel from '@/components/FilterPanel';
import EmptyState from '@/components/EmptyState';
import SortableHeader from '@/components/SortableHeader';
import { useAuthStore } from '@/store/authStore';
import { hasAnyPermission } from '@/lib/permissions';
import TablePagination from '@/components/TablePagination';
import Combobox from '@/components/Combobox';
import Toolbar from '@/components/Toolbar';
import { PaymentsTableSkeleton } from '@/components/Skeletons';
import {
  useAddPaymentMutation,
  useBookingsListQuery,
  useBookingsServerListQuery,
} from '@/lib/query/hooks';
import { usesServerPagination } from '@/lib/featureFlags';
import { normalizeSearchForServer, selectListData } from '@/lib/listQuery';
import { useDebounce } from '@/lib/useDebounce';
import { api } from '@/lib/api';
import { buildBookingEditorHref } from '@/lib/dashboardNavigation';
import {
  SortState,
  TableColumnConfig,
  filterAndSortRows,
  getNextSort,
} from '@/lib/tableUtils';
import { formatDateDDMMYYYY, formatDateCompact } from '@/lib/date';
import {
  resolveDueAmount,
  resolvePaymentReceivedGross,
} from '@bika/booking-core';

interface BookingRow {
  id: string;
  functionName: string;
  functionDate: string;
  status: string;
  customer?: {
    name: string;
    phone: string;
  };
  grandTotal?: number;
  paymentReceivedAmountValue?: number;
  paymentReceivedAmount?: string | number | null;
  dueAmountValue?: number;
  dueAmount?: string | number | null;
  _count?: {
    payments: number;
  };
}

const getInitialPaymentForm = () => ({
  bookingId: '',
  clientMutationId: crypto.randomUUID(),
  amount: '',
  method: 'cash',
  reference: '',
  narration: '',
  paymentDate: new Date().toISOString().split('T')[0],
});

const initialColumnSearch = {
  booking: '',
  eventDate: '',
  total: '',
  received: '',
  balance: '',
  entries: '',
};

const PAYMENTS_PAGE_SIZE = 100;

// A payment is overdue once the event date has passed and a balance remains.
function isOverdue(functionDate: string, due: number): boolean {
  return due > 0 && dateKeyKolkata(functionDate) < dateKeyKolkata(new Date());
}

// Collections buckets — "who do I chase today" at a glance. Overdue/week/
// upcoming all reuse the existing view=balance (dueAmountValue>0, status
// confirmed/pending) sliced by functionDate; settled is its own tiny view.
// Server params AND client-side predicate must agree so the legacy
// (non-server-paginated) path buckets identically.
type PaymentBucket = 'all' | 'overdue' | 'week' | 'upcoming' | 'settled';

const BUCKET_LABELS: Record<PaymentBucket, string> = {
  all: 'All',
  overdue: 'Overdue',
  week: 'Due this week',
  upcoming: 'Upcoming',
  settled: 'Settled',
};

function bucketServerParams(bucket: PaymentBucket): { view?: string; fromDate?: string; toDate?: string } {
  switch (bucket) {
    case 'overdue':
      return { view: 'balance', toDate: dateKeyKolkata(addDays(new Date(), -1)) };
    case 'week':
      return { view: 'balance', fromDate: todayKeyKolkata(), toDate: dateKeyKolkata(addDays(new Date(), 7)) };
    case 'upcoming':
      return { view: 'balance', fromDate: dateKeyKolkata(addDays(new Date(), 8)) };
    case 'settled':
      return { view: 'settled' };
    default:
      return {};
  }
}

function matchesBucket(booking: BookingRow, bucket: PaymentBucket): boolean {
  if (bucket === 'all') return true;
  const due = resolveDueAmount(booking);
  if (bucket === 'settled') return due <= 0 && booking.status === 'confirmed';
  if (due <= 0 || !['confirmed', 'pending'].includes(booking.status)) return false;
  const dateKey = dateKeyKolkata(booking.functionDate);
  const today = todayKeyKolkata();
  const weekEnd = dateKeyKolkata(addDays(new Date(), 7));
  if (bucket === 'overdue') return dateKey < today;
  if (bucket === 'week') return dateKey >= today && dateKey <= weekEnd;
  return dateKey > weekEnd; // upcoming
}

// Pre-filled WhatsApp reminder. wa.me needs a country-coded number with no
// punctuation; assume India (91) when the stored number is a bare 10 digits.
// ponytail: wa.me deep link; move to server-side reminders if a send log is needed.
function reminderHref(name: string, phone: string, due: number, fn: string, date: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  const wa = digits.length === 10 ? `91${digits}` : digits;
  const msg = `Namaste ${name}, a balance of ${formatINR(due)} is pending for your ${fn} on ${date}. — Bika Banquets`;
  return `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
}

export default function PaymentsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const permissionSet = useMemo(() => user?.permissions ?? [], [user?.permissions]);
  const canViewPayments = useMemo(
    () => hasAnyPermission(permissionSet, ['manage_payments', 'view_booking', 'manage_bookings']),
    [permissionSet]
  );
  const canAddPayment = useMemo(
    () => hasAnyPermission(permissionSet, ['manage_payments', 'edit_booking', 'manage_bookings']),
    [permissionSet]
  );

  const [useServer] = useState(() => usesServerPagination('payments'));
  const {
    data: legacyBookings = [],
    isLoading: legacyLoading,
    refetch: refetchLegacyBookings,
    isError: legacyLoadError,
  } = useBookingsListQuery<BookingRow[]>(canViewPayments && !useServer);
  const addPaymentMutation = useAddPaymentMutation();
  const [submitInFlight, setSubmitInFlight] = useState(false);
  const submitInFlightRef = useRef(false);
  const saving = addPaymentMutation.isPending || submitInFlight;
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  // List state initialises from the URL (shareable/refresh-safe) and is
  // mirrored back by useListUrlSync below.
  const searchParams = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState(() => searchParams.get('q') || '');
  const [columnSearch, setColumnSearch] = useState(initialColumnSearch);
  const [bucket, setBucket] = useState<PaymentBucket>(() => {
    const b = searchParams.get('bucket');
    return b === 'overdue' || b === 'week' || b === 'upcoming' || b === 'settled' ? b : 'all';
  });
  const activeBucketParams = useMemo(() => bucketServerParams(bucket), [bucket]);
  const [sort, setSort] = useState<SortState>(() => {
    const [key, direction] = (searchParams.get('sort') || '').split('.');
    if (key && (direction === 'asc' || direction === 'desc')) return { key, direction };
    // Collections workflow: chase the biggest outstanding balances first, not
    // an alphabetical list of function types.
    return { key: 'balance', direction: 'desc' };
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get('page'));
    return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
  });

  useListUrlSync({
    q: globalSearch,
    bucket: bucket === 'all' ? '' : bucket,
    page: currentPage > 1 ? String(currentPage) : '',
    sort:
      sort.key === 'booking' && sort.direction === 'asc' ? '' : `${sort.key}.${sort.direction}`,
  });
  const [paymentForm, setPaymentForm] = useState(() => getInitialPaymentForm());
  // Pinned booking option for the Add-Payment picker (server mode): keeps the
  // chosen booking visible even when not in the searched batch.
  const [pinnedBooking, setPinnedBooking] = useState<BookingRow | null>(null);

  const debouncedGlobalSearch = useDebounce(globalSearch, useServer ? 300 : 0);

  const serverSearch = useMemo(() => {
    const parts = [debouncedGlobalSearch, columnSearch.booking, columnSearch.eventDate]
      .map((v) => (v ?? '').trim())
      .filter(Boolean);
    return normalizeSearchForServer(parts.join(' '));
  }, [debouncedGlobalSearch, columnSearch.booking, columnSearch.eventDate]);

  const {
    data: serverData,
    isLoading: serverLoading,
    isError: serverLoadError,
    refetch: refetchServerBookings,
  } = useBookingsServerListQuery<BookingRow>(canViewPayments && useServer, {
    page: currentPage,
    limit: PAYMENTS_PAGE_SIZE,
    search: serverSearch,
    sort: sort.key,
    order: sort.direction,
    ...activeBucketParams,
  });

  const serverPrevRef = useRef<BookingRow[] | undefined>(undefined);
  if (serverData?.rows) serverPrevRef.current = serverData.rows;
  const serverSelected = selectListData<BookingRow>(
    serverData?.rows,
    serverPrevRef.current,
    serverLoadError
  );

  const bookings: BookingRow[] = useServer ? serverSelected.rows : legacyBookings;
  const loading = useServer ? serverLoading : legacyLoading;
  const bookingsLoadError = useServer ? false : legacyLoadError;
  const refetchBookings = useServer ? refetchServerBookings : refetchLegacyBookings;

  useEffect(() => {
    if (useServer && serverLoadError) {
      toast.error('Failed to load payments. Showing last results.', {
        action: { label: 'Retry', onClick: () => void refetchServerBookings() },
      });
    }
  }, [useServer, serverLoadError, refetchServerBookings]);

  // Hybrid Add-Payment booking picker (server mode): search across ALL
  // bookings + pin the selected one so any booking is payable, not just the
  // current table page.
  const bookingToOption = useCallback(
    (b: BookingRow) => ({
      value: b.id,
      label: `${b.functionName} - ${b.customer?.name ?? ''}`.trim(),
      secondary: b.customer?.phone || undefined,
    }),
    []
  );
  const loadPaymentBookingsPage = useCallback(
    async (query: string, page: number) => {
      const trimmed = query.trim();
      // Starter batch on open, server search across ALL bookings on typing, and
      // append the next page as the dropdown is scrolled.
      const base =
        trimmed.length >= 2
          ? { search: normalizeSearchForServer(trimmed) }
          : {};
      const res = await api.getBookings({ ...base, limit: 50, page });
      const rows = (res?.data?.data?.bookings || []) as BookingRow[];
      const totalPages = Math.max(1, res?.data?.data?.pagination?.totalPages ?? 1);
      const merged =
        page === 1 && pinnedBooking
          ? [pinnedBooking, ...rows.filter((r) => r.id !== pinnedBooking.id)]
          : rows;
      return { options: merged.map(bookingToOption), hasMore: page < totalPages };
    },
    [pinnedBooking, bookingToOption]
  );
  useEffect(() => {
    if (!useServer) return;
    const id = paymentForm.bookingId;
    if (!id) {
      setPinnedBooking(null);
      return;
    }
    if (pinnedBooking?.id === id) return;
    const inPage = bookings.find((b) => b.id === id);
    if (inPage) {
      setPinnedBooking(inPage);
      return;
    }
    let cancelled = false;
    void api
      .getBooking(id)
      .then((res) => {
        const b = res?.data?.data?.booking;
        if (!cancelled && b) setPinnedBooking(b as BookingRow);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [useServer, paymentForm.bookingId, pinnedBooking?.id, bookings]);

  const tableColumns = useMemo<TableColumnConfig<BookingRow>[]>(
    () => [
      {
        key: 'booking',
        accessor: (booking) =>
          `${booking.functionName} ${booking.customer?.name ?? ''} ${booking.customer?.phone ?? ''
          }`,
      },
      { key: 'eventDate', accessor: (booking) => booking.functionDate },
      { key: 'total', accessor: (booking) => booking.grandTotal ?? 0 },
      { key: 'received', accessor: (booking) => resolvePaymentReceivedGross(booking) },
      { key: 'balance', accessor: (booking) => resolveDueAmount(booking) },
      { key: 'entries', accessor: (booking) => booking._count?.payments ?? 0 },
    ],
    []
  );

  const clientFiltered = useMemo(
    () =>
      filterAndSortRows(bookings, tableColumns, globalSearch, columnSearch, sort).filter((b) =>
        matchesBucket(b, bucket)
      ),
    [bookings, tableColumns, globalSearch, columnSearch, sort, bucket]
  );

  const serverTotal = serverData?.pagination?.total ?? 0;
  const totalCount = useServer ? serverTotal : clientFiltered.length;

  const totalPages = useMemo(
    () =>
      useServer
        ? Math.max(1, serverData?.pagination?.totalPages ?? 1)
        : Math.max(1, Math.ceil(clientFiltered.length / PAYMENTS_PAGE_SIZE)),
    [useServer, serverData?.pagination?.totalPages, clientFiltered.length]
  );

  const filteredBookings = useServer ? bookings : clientFiltered;

  const paginatedBookings = useMemo(() => {
    if (useServer) return bookings; // already the current page
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * PAYMENTS_PAGE_SIZE;
    return clientFiltered.slice(startIndex, startIndex + PAYMENTS_PAGE_SIZE);
  }, [useServer, bookings, currentPage, clientFiltered, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [globalSearch, columnSearch, sort, bucket]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (bookingsLoadError) {
      toast.error('Failed to load bookings');
    }
  }, [bookingsLoadError]);

  const openBooking = useCallback(
    (id: string) => {
      void router.push(buildBookingEditorHref(id));
    },
    [router]
  );

  useEffect(() => {
    if (bookings.length > 0) {
      setPaymentForm((prev) => ({ ...prev, bookingId: prev.bookingId || bookings[0].id }));
    }
  }, [bookings]);

  // Bucket header stats (count + ₹ total) always reflect the WHOLE dataset,
  // not the current page/search — 4 lightweight limit=1 requests reusing the
  // existing list endpoint's whole-filtered-set `totals` aggregate, since
  // there's no dedicated aggregate endpoint.
  const queryClient = useQueryClient();
  const bucketStatsQuery = useQuery({
    queryKey: ['payments-bucket-stats'],
    queryFn: async () => {
      const buckets: PaymentBucket[] = ['overdue', 'week', 'upcoming', 'settled'];
      const results = await Promise.all(
        buckets.map((b) => api.getBookings({ ...bucketServerParams(b), page: 1, limit: 1 }))
      );
      const out = {} as Record<PaymentBucket, { count: number; amount: number }>;
      buckets.forEach((b, i) => {
        const data = results[i]?.data?.data as
          | { pagination?: { total?: number }; totals?: { grandTotal?: number; due?: number } }
          | undefined;
        out[b] = {
          count: data?.pagination?.total ?? 0,
          amount: b === 'settled' ? data?.totals?.grandTotal ?? 0 : data?.totals?.due ?? 0,
        };
      });
      return out;
    },
    enabled: canViewPayments && useServer,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });

  // Legacy path already holds the full dataset client-side, so bucket stats
  // are a plain reduce instead of the 4-request server round trip above.
  const legacyBucketStats = useMemo(() => {
    if (useServer) return null;
    const out = {} as Record<PaymentBucket, { count: number; amount: number }>;
    (['overdue', 'week', 'upcoming', 'settled'] as PaymentBucket[]).forEach((b) => {
      const rows = bookings.filter((row) => matchesBucket(row, b));
      out[b] = {
        count: rows.length,
        amount: rows.reduce(
          (sum, row) => sum + (b === 'settled' ? row.grandTotal || 0 : resolveDueAmount(row)),
          0
        ),
      };
    });
    return out;
  }, [useServer, bookings]);

  const bucketStats = useServer ? bucketStatsQuery.data : legacyBucketStats;

  const loadBookings = useCallback(async () => {
    await Promise.all([
      refetchBookings(),
      queryClient.invalidateQueries({ queryKey: ['payments-bucket-stats'] }),
    ]);
  }, [refetchBookings, queryClient]);

  const paymentsDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLoadBookings = useCallback(() => {
    if (paymentsDebounceTimerRef.current) clearTimeout(paymentsDebounceTimerRef.current);
    paymentsDebounceTimerRef.current = setTimeout(() => {
      void loadBookings();
    }, 300);
  }, [loadBookings]);
  useEffect(() => {
    return () => {
      if (paymentsDebounceTimerRef.current) clearTimeout(paymentsDebounceTimerRef.current);
    };
  }, []);
  useSSE(['booking:'], debouncedLoadBookings, canViewPayments);

  const submitPayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitInFlightRef.current) return;
    if (!paymentForm.bookingId || !paymentForm.amount) {
      toast.error('Booking and amount are required');
      return;
    }
    submitInFlightRef.current = true;
    setSubmitInFlight(true);
    try {
      await addPaymentMutation.mutateAsync({
        bookingId: paymentForm.bookingId,
        clientMutationId: paymentForm.clientMutationId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference.trim() || undefined,
        narration: paymentForm.narration.trim() || undefined,
        paymentDate: paymentForm.paymentDate || undefined,
      });
      setShowPaymentPrompt(false);
      setPaymentForm((prev) => ({
        ...getInitialPaymentForm(),
        bookingId: prev.bookingId,
        method: prev.method,
      }));
    } catch {
      // Error toast handled in mutation onError.
    } finally {
      submitInFlightRef.current = false;
      setSubmitInFlight(false);
    }
  };

  return (
    <div className="ops-route ops-list-route">
      <Toolbar
        title="Payments"
        stats={[
          { label: 'In view', value: totalCount },
        ]}
        actions={
          <>
            <div className="ops-toolbar-search">
              <Search className="w-4 h-4" aria-hidden="true" />
              <input
                type="search"
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search..."
                aria-label="Search payments"
              />
            </div>
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
            {canAddPayment ? (
              <button
                type="button"
                className="btn btn-primary inline-flex items-center gap-2 justify-center"
                onClick={() => {
                  setPaymentForm((prev) => ({
                    ...getInitialPaymentForm(),
                    bookingId: prev.bookingId || bookings[0]?.id || '',
                    method: prev.method,
                  }));
                  setShowPaymentPrompt(true);
                }}
                disabled={useServer ? totalCount === 0 : bookings.length === 0}
              >
                <Plus className="w-4 h-4" />
                Add Payment
              </button>
            ) : null}
          </>
        }
      />

      <div className="ops-view-bar">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-4)] flex-shrink-0">
          Collections
        </span>
        {(['all', 'overdue', 'week', 'upcoming', 'settled'] as PaymentBucket[]).map((b) => {
          const stats = b === 'all' ? null : bucketStats?.[b];
          return (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              className={`flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                bucket === b
                  ? 'border-teal-600 bg-teal-600 text-white'
                  : 'border-[var(--border-2)] bg-[var(--surface)] text-[var(--text-3)] hover:text-[var(--text-1)]'
              }`}
            >
              {BUCKET_LABELS[b]}
              {stats != null && (
                <span className="ml-1.5 tabular-nums opacity-80">
                  {stats.count}
                  {stats.amount > 0 ? ` · ${formatINR(stats.amount, { compact: true })}` : ''}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <FormPromptModal
        open={showPaymentPrompt}
        title="Add Payment"
        onClose={() => setShowPaymentPrompt(false)}
        widthClass="max-w-5xl"
      >
        <form onSubmit={submitPayment} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label className="label">Booking</label>
              {useServer ? (
                <Combobox
                  value={paymentForm.bookingId}
                  onChange={(val) =>
                    setPaymentForm((prev) => ({ ...prev, bookingId: val }))
                  }
                  options={pinnedBooking ? [bookingToOption(pinnedBooking)] : []}
                  loadPage={loadPaymentBookingsPage}
                  placeholder="Search booking or customer"
                  searchPlaceholder="Function, customer or phone"
                />
              ) : (
                <select
                  className="input"
                  value={paymentForm.bookingId}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({ ...prev, bookingId: e.target.value }))
                  }
                  required
                >
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.id}>
                      {booking.functionName} - {booking.customer?.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="label">Amount</label>
              <input
                className="input"
                type="number"
                min={1}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="label">Method</label>
              <select
                className="input"
                value={paymentForm.method}
                onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="upi">UPI</option>
                <option value="cheque">Cheque</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </div>
            <div>
              <label className="label">Reference</label>
              <input
                className="input"
                value={paymentForm.reference}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))
                }
                placeholder="Txn/cheque no."
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                className="input"
                type="date"
                value={paymentForm.paymentDate}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-3 lg:col-span-5">
              <label className="label">Narration</label>
              <input
                className="input"
                value={paymentForm.narration}
                onChange={(e) =>
                  setPaymentForm((prev) => ({ ...prev, narration: e.target.value }))
                }
                placeholder="Notes for this collection"
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPaymentPrompt(false)}
            >
              Cancel
            </button>
            <button className="btn btn-primary" disabled={saving} type="submit">
              <span className="inline-flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Add Payment'}
              </span>
            </button>
          </div>
        </form>
      </FormPromptModal>

      <div className="card">
        {!canViewPayments ? (
          <EmptyState
            icon={CreditCard}
            variant="page"
            title="Access restricted"
            description="You don't have permission to view payments. Contact your administrator."
          />
        ) : loading ? (
          <div className="py-6">
            <PaymentsTableSkeleton rows={8} />
          </div>
        ) : totalCount === 0 ? (
          <EmptyState
            icon={globalSearch ? Search : CreditCard}
            variant={
              globalSearch
                ? 'search'
                : Object.values(columnSearch).some(Boolean)
                  ? 'filter'
                  : 'page'
            }
            title={
              globalSearch
                ? 'No payments match your search'
                : Object.values(columnSearch).some(Boolean)
                  ? 'No matches'
                  : bucket !== 'all'
                    ? `Nothing in ${BUCKET_LABELS[bucket].toLowerCase()}`
                    : 'No bookings found'
            }
            description={
              globalSearch || Object.values(columnSearch).some(Boolean)
                ? `"${globalSearch || Object.values(columnSearch).find(Boolean)}" returned no results.`
                : bucket !== 'all'
                  ? 'Nothing to chase here right now.'
                  : 'Try adjusting the filters or date range.'
            }
            action={
              globalSearch
                ? { label: 'Clear search', onClick: () => setGlobalSearch('') }
                : Object.values(columnSearch).some(Boolean)
                  ? { label: 'Clear filters', onClick: () => setColumnSearch(initialColumnSearch) }
                  : undefined
            }
          />
        ) : (
          <>
            {/* Mobile card view */}
            <div className="md:hidden">
              <div className="mobile-card-list">
                {paginatedBookings.map((booking) => (
                  <div key={booking.id} className="mobile-card">
                    <div className="mobile-card-header">
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="mobile-card-title">{booking.functionName}</div>
                        <div className="mobile-card-subtitle">
                          {booking.customer?.name} • {booking.customer?.phone}
                        </div>
                      </div>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Event Date</span>
                      <span className="mobile-card-value">{formatDateDDMMYYYY(booking.functionDate)}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Total</span>
                      <span className="mobile-card-value">{formatINR(booking.grandTotal || 0)}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Received</span>
                      <span className="mobile-card-value text-emerald-600 dark:text-emerald-400">{formatINR(resolvePaymentReceivedGross(booking))}</span>
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Balance</span>
                      {(() => {
                        const due = resolveDueAmount(booking);
                        const overdue = isOverdue(booking.functionDate, due);
                        const toneClass =
                          due <= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : overdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400';
                        return (
                          <span className={`mobile-card-amount ${toneClass}`}>
                            {due <= 0 ? 'Paid' : formatINR(due)}
                            {overdue && (
                              <span className="ml-1.5 text-[10px] font-bold uppercase">overdue</span>
                            )}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Entries</span>
                      <span className="mobile-card-value">{booking._count?.payments || 0}</span>
                    </div>
                    {resolveDueAmount(booking) > 0 && booking.customer?.phone && (
                      <a
                        href={reminderHref(
                          booking.customer?.name || 'guest',
                          booking.customer.phone,
                          resolveDueAmount(booking),
                          booking.functionName,
                          formatDateDDMMYYYY(booking.functionDate)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mobile-card-action-btn mt-2 inline-flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-4 h-4" aria-hidden="true" />
                        Send reminder
                      </a>
                    )}
                  </div>
                ))}
              </div>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={PAYMENTS_PAGE_SIZE}
                itemLabel="bookings"
                onPageChange={setCurrentPage}
              />
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block table-shell">
              <table className="data-table">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <SortableHeader
                      label="Booking"
                      sortKey="booking"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Event date"
                      sortKey="eventDate"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-left py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Total"
                      sortKey="total"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Received"
                      sortKey="received"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Balance"
                      sortKey="balance"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                    <SortableHeader
                      label="Entries"
                      sortKey="entries"
                      sort={sort}
                      onSort={(key) => setSort((prev) => getNextSort(prev, key))}
                      className="text-right py-3 px-3 text-sm font-semibold text-[var(--text-2)]"
                    />
                  </tr>
                </thead>
                <tbody>
                  {paginatedBookings.map((booking) => (
                    <tr
                      key={booking.id}
                      className="ops-click-row border-b border-[var(--border)]"
                      onClick={() => {
                        openBooking(booking.id);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openBooking(booking.id);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td className="py-3 px-3 main">
                        <p className="text-sm text-[var(--text-1)]">{booking.functionName}</p>
                        <p className="text-xs text-[var(--text-4)] mt-1">
                          {booking.customer?.name} • {booking.customer?.phone}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-sm text-[var(--text-2)] whitespace-nowrap">
                        {formatDateCompact(booking.functionDate)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-[var(--text-2)] num">
                        {formatINR(booking.grandTotal || 0)}
                      </td>
                      <td className="py-3 px-3 text-right text-sm text-emerald-600 dark:text-emerald-400 num">
                        {formatINR(resolvePaymentReceivedGross(booking))}
                      </td>
                      {(() => {
                        const due = resolveDueAmount(booking);
                        const overdue = isOverdue(booking.functionDate, due);
                        const toneClass =
                          due <= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : overdue
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-amber-600 dark:text-amber-400';
                        return (
                          <td className={`py-3 px-3 text-right text-sm font-medium num ${toneClass}`}>
                            {due <= 0 ? (
                              'Paid'
                            ) : (
                              <div className="inline-flex flex-col items-end gap-1">
                                <span>
                                  {formatINR(due)}
                                  {overdue && (
                                    <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide">
                                      overdue
                                    </span>
                                  )}
                                </span>
                                {booking.customer?.phone && (
                                  <a
                                    href={reminderHref(
                                      booking.customer?.name || 'guest',
                                      booking.customer.phone,
                                      due,
                                      booking.functionName,
                                      formatDateCompact(booking.functionDate)
                                    )}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent-text)] hover:underline"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                    Remind
                                  </a>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })()}
                      <td className="py-3 px-3 text-right text-sm text-[var(--text-2)] num">
                        {booking._count?.payments || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={PAYMENTS_PAGE_SIZE}
                itemLabel="bookings"
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>

      <FilterPanel
        open={showFilters}
        onClose={() => setShowFilters(false)}
        activeCount={Object.values(columnSearch).filter(Boolean).length}
        onClearAll={() => setColumnSearch(initialColumnSearch)}
      >
        <div className="space-y-4">
          <div>
            <label className="label">Booking</label>
            <input className="input" placeholder="Search booking" value={columnSearch.booking} onChange={(e) => setColumnSearch((prev) => ({ ...prev, booking: e.target.value }))} />
          </div>
          <div>
            <label className="label">Event Date</label>
            <input className="input" type="date" value={columnSearch.eventDate} onChange={(e) => setColumnSearch((prev) => ({ ...prev, eventDate: e.target.value }))} />
          </div>
          <div>
            <label className="label">Total</label>
            <input className="input" placeholder="Search total" value={columnSearch.total} onChange={(e) => setColumnSearch((prev) => ({ ...prev, total: e.target.value }))} />
          </div>
          <div>
            <label className="label">Received</label>
            <input className="input" placeholder="Search received" value={columnSearch.received} onChange={(e) => setColumnSearch((prev) => ({ ...prev, received: e.target.value }))} />
          </div>
          <div>
            <label className="label">Balance</label>
            <input className="input" placeholder="Search balance" value={columnSearch.balance} onChange={(e) => setColumnSearch((prev) => ({ ...prev, balance: e.target.value }))} />
          </div>
          <div>
            <label className="label">Entries</label>
            <input className="input" placeholder="Search entries" value={columnSearch.entries} onChange={(e) => setColumnSearch((prev) => ({ ...prev, entries: e.target.value }))} />
          </div>
        </div>
      </FilterPanel>
    </div>
  );
}
