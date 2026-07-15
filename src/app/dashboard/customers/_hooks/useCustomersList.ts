
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from '@/lib/router-compat';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useListUrlSync } from '@/lib/useListUrlSync';
import { useCustomersListQuery, useCustomersServerListQuery } from '@/lib/query/hooks';
import { usesServerPagination } from '@/lib/featureFlags';
import { normalizeSearchForServer, selectListData } from '@/lib/listQuery';
import { useSSE } from '@/hooks/useSSE';
import { useDebounce } from '@/lib/useDebounce';
import {
  SortState,
  TableColumnConfig,
  filterAndSortRows,
} from '@/lib/tableUtils';
import {
  CUSTOMERS_PAGE_SIZE,
  initialColumnSearch,
  type ColumnSearch,
  type CustomerDetailData,
  type CustomerRow,
} from '../_lib/types';

/**
 * List side of the customers page: dual-path fetch (server pagination behind a
 * runtime flag, legacy in-memory filter/sort otherwise), search, pagination,
 * SSE refresh, and master-detail selection.
 */
export function useCustomersList({ canViewCustomer }: { canViewCustomer: boolean }) {
  // Per-list runtime feature flag. When OFF, the legacy client-side path
  // (fetch-all + filterAndSortRows) runs verbatim. Resolved once on mount so
  // the two query hooks keep stable `enabled` values across renders.
  const [useServer] = useState(() => usesServerPagination('customers'));

  const {
    data: legacyCustomers = [],
    isLoading: legacyLoading,
    refetch: refetchLegacyCustomers,
    isError: legacyLoadError,
  } = useCustomersListQuery<CustomerRow[]>(canViewCustomer && !useServer);

  // List state initialises from the URL (shareable/refresh-safe) and is
  // mirrored back by useListUrlSync below.
  const searchParams = useSearchParams();
  const [globalSearch, setGlobalSearch] = useState(() => searchParams.get('q') || '');
  // 300ms when server-paginating (fewer requests on slow phone networks);
  // 150ms preserved for the legacy in-memory path.
  const debouncedGlobalSearch = useDebounce(globalSearch, useServer ? 300 : 150);
  const [columnSearch, setColumnSearch] = useState<ColumnSearch>(initialColumnSearch);
  const [sort, setSort] = useState<SortState>(() => {
    const [key, direction] = (searchParams.get('sort') || '').split('.');
    if (key && (direction === 'asc' || direction === 'desc')) return { key, direction };
    return { key: 'name', direction: 'asc' };
  });
  const [currentPage, setCurrentPage] = useState(() => {
    const page = Number(searchParams.get('page'));
    return Number.isFinite(page) && page > 1 ? Math.floor(page) : 1;
  });

  useListUrlSync({
    q: globalSearch,
    page: currentPage > 1 ? String(currentPage) : '',
    sort: sort.key === 'name' && sort.direction === 'asc' ? '' : `${sort.key}.${sort.direction}`,
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] =
    useState<CustomerDetailData | null>(null);
  const [selectedCustomerLoading, setSelectedCustomerLoading] = useState(false);

  // Fold any active column search into the global server search so server
  // results stay a strict superset of today's client search.
  const serverSearch = useMemo(() => {
    const parts = [debouncedGlobalSearch, ...Object.values(columnSearch)]
      .map((v) => (v ?? '').trim())
      .filter(Boolean);
    return normalizeSearchForServer(parts.join(' '));
  }, [debouncedGlobalSearch, columnSearch]);

  const {
    data: serverData,
    isLoading: serverLoading,
    isError: serverLoadError,
    refetch: refetchServerCustomers,
  } = useCustomersServerListQuery<CustomerRow>(canViewCustomer && useServer, {
    page: currentPage,
    limit: CUSTOMERS_PAGE_SIZE,
    search: serverSearch,
    sort: sort.key,
    order: sort.direction,
  });

  const serverPrevRef = useRef<CustomerRow[] | undefined>(undefined);
  if (serverData?.rows) serverPrevRef.current = serverData.rows;
  const serverSelected = selectListData<CustomerRow>(
    serverData?.rows,
    serverPrevRef.current,
    serverLoadError
  );

  // Unified accessors so the rest of the page is path-agnostic.
  const customers: CustomerRow[] = useServer
    ? serverSelected.rows
    : legacyCustomers;
  const loading = useServer ? serverLoading : legacyLoading;
  const customersLoadError = useServer ? false : legacyLoadError;
  const refetchCustomers = useServer
    ? refetchServerCustomers
    : refetchLegacyCustomers;

  // Surface a retry toast (once) when a server fetch fails but we keep the
  // previous page on screen.
  useEffect(() => {
    if (useServer && serverLoadError) {
      toast.error('Failed to load customers. Showing last results.', {
        action: { label: 'Retry', onClick: () => void refetchServerCustomers() },
      });
    }
  }, [useServer, serverLoadError, refetchServerCustomers]);

  useEffect(() => {
    if (customersLoadError) {
      toast.error('Failed to load customers');
    }
  }, [customersLoadError]);

  const tableColumns = useMemo<TableColumnConfig<CustomerRow>[]>(
    () => [
      {
        key: 'name',
        accessor: (customer) =>
          `${customer.name} ${customer.phoneCountryCode ?? ''} ${customer.phone}`,
      },
      {
        key: 'contact',
        accessor: (customer) =>
          `${customer.phoneCountryCode ?? ''} ${customer.phone} ${customer.email ?? ''}`,
      },
      {
        key: 'location',
        accessor: (customer) => `${customer.city ?? ''} ${customer.state ?? ''}`,
      },
      {
        key: 'stats',
        accessor: (customer) =>
          `${customer._count?.enquiries ?? 0} ${customer._count?.bookings ?? 0}`,
      },
      {
        key: 'createdAt',
        accessor: (customer) => customer.createdAt,
      },
    ],
    []
  );

  // Legacy (flag OFF) path: filter + sort + slice in memory.
  const clientFiltered = useMemo(
    () => filterAndSortRows(customers, tableColumns, debouncedGlobalSearch, columnSearch, sort),
    [customers, tableColumns, debouncedGlobalSearch, columnSearch, sort]
  );

  // Server path: `customers` is already the current page, server-filtered and
  // server-sorted. Totals come from the server pagination meta.
  const serverTotal = serverData?.pagination?.total ?? 0;
  const totalCount = useServer ? serverTotal : clientFiltered.length;

  const totalPages = useServer
    ? Math.max(1, serverData?.pagination?.totalPages ?? 1)
    : Math.max(1, Math.ceil(clientFiltered.length / CUSTOMERS_PAGE_SIZE));

  const paginatedCustomers = useMemo(() => {
    if (useServer) return customers; // already the current page
    const safePage = Math.min(Math.max(currentPage, 1), totalPages);
    const startIndex = (safePage - 1) * CUSTOMERS_PAGE_SIZE;
    return clientFiltered.slice(startIndex, startIndex + CUSTOMERS_PAGE_SIZE);
  }, [useServer, customers, currentPage, clientFiltered, totalPages]);

  const referrerOptions = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)),
    [customers]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedGlobalSearch, columnSearch, sort]);

  useEffect(() => {
    if (currentPage <= totalPages) return;
    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const loadCustomers = useCallback(async () => {
    await refetchCustomers();
  }, [refetchCustomers]);

  const selectCustomer = useCallback(async (id: string) => {
    setSelectedCustomerId(id);
    setSelectedCustomerLoading(true);
    try {
      const response = await api.getCustomer(id);
      setSelectedCustomerDetail(
        (response?.data?.data?.customer as unknown as CustomerDetailData) ?? null
      );
    } catch (error) {
      toast.error('Failed to load customer details');
      setSelectedCustomerDetail(null);
    } finally {
      setSelectedCustomerLoading(false);
    }
  }, []);

  // Auto-select the first row once results load, mirroring the design's
  // master-detail pattern (a customer is always shown on desktop).
  useEffect(() => {
    if (selectedCustomerId) return;
    const first = paginatedCustomers[0];
    if (first) void selectCustomer(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedCustomers]);

  const customersDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedLoadCustomers = useCallback(() => {
    if (customersDebounceTimerRef.current) clearTimeout(customersDebounceTimerRef.current);
    customersDebounceTimerRef.current = setTimeout(() => {
      void loadCustomers();
    }, 300);
  }, [loadCustomers]);
  useEffect(() => {
    return () => {
      if (customersDebounceTimerRef.current) clearTimeout(customersDebounceTimerRef.current);
    };
  }, []);
  useSSE(['customer:'], debouncedLoadCustomers, canViewCustomer);

  const handleColumnSearch = (key: keyof ColumnSearch, value: string) => {
    setColumnSearch((prev) => ({ ...prev, [key]: value }));
  };

  const clearSearch = () => {
    setGlobalSearch('');
    setColumnSearch(initialColumnSearch);
    setCurrentPage(1);
  };

  return {
    useServer,
    customers,
    loading,
    loadCustomers,
    // search & filters
    globalSearch,
    setGlobalSearch,
    columnSearch,
    setColumnSearch,
    handleColumnSearch,
    clearSearch,
    sort,
    setSort,
    // pagination
    currentPage,
    setCurrentPage,
    totalCount,
    totalPages,
    paginatedCustomers,
    // master-detail selection
    selectedCustomerId,
    selectCustomer,
    selectedCustomerDetail,
    selectedCustomerLoading,
    // legacy referred-by options
    referrerOptions,
  };
}

export type CustomersListApi = ReturnType<typeof useCustomersList>;
