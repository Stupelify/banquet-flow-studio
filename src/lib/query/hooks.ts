
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, fetchAllCustomers } from '@/lib/api';
import { resolveDueAmount, resolvePaymentReceivedGross } from '@bika/booking-core';
import { toast } from 'sonner';
import { queryKeys } from './keys';
import { buildListParams, type ListParamsInput, type PaginationMeta } from '@/lib/listQuery';
import { notifyBookingExternalUpdate } from '@/lib/booking-form/booking-form-sync';

const BOOKINGS_LIST_PARAMS = { page: 1, limit: 5000 } as const;

async function fetchBookingsList(): Promise<unknown[]> {
  const response = await api.getBookings(BOOKINGS_LIST_PARAMS);
  return response.data?.data?.bookings || [];
}

export function useBookingsListQuery<T = unknown[]>(enabled: boolean) {
  return useQuery<T>({
    queryKey: queryKeys.bookings.list(BOOKINGS_LIST_PARAMS),
    queryFn: async () => (await fetchBookingsList()) as T,
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useInvalidateBookingsList() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
}

/**
 * Server-paginated bookings list (also used by the payments page with its own
 * params). Keyed on page/search/sort; keepPreviousData avoids a blank table.
 * Bookings/payments are capped at the server hard limit (200).
 */
export function useBookingsServerListQuery<T = unknown>(
  enabled: boolean,
  input: ListParamsInput
) {
  const params = buildListParams(input);
  return useQuery<ServerListResult<T>>({
    queryKey: queryKeys.bookings.serverList(
      params as unknown as Record<string, unknown>
    ),
    queryFn: async () => {
      const response = await api.getBookings(params);
      const data = response.data?.data;
      return {
        rows: (data?.bookings || []) as T[],
        pagination: (data?.pagination as PaginationMeta) || {
          ...EMPTY_PAGINATION,
          limit: params.limit,
        },
        totals: (data as { totals?: ListTotals } | undefined)?.totals,
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useCustomersListQuery<T = Record<string, unknown>[]>(enabled: boolean) {
  return useQuery<T>({
    queryKey: queryKeys.customers.list(),
    queryFn: async () => (await fetchAllCustomers()) as T,
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useInvalidateCustomersList() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
}

export interface ServerListResult<T> {
  rows: T[];
  pagination: PaginationMeta;
  /** Whole-filtered-set money totals (bookings endpoint only). */
  totals?: ListTotals;
}

export interface ListTotals {
  grandTotal: number;
  due: number;
}

const EMPTY_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 100,
  total: 0,
  totalPages: 1,
};

/**
 * Server-paginated customers list. Keyed on page/search/sort so each
 * page/query is cached independently; keepPreviousData avoids a blank table
 * while the next page/search loads. Customers allow a larger page limit.
 */
export function useCustomersServerListQuery<T = Record<string, unknown>>(
  enabled: boolean,
  input: ListParamsInput
) {
  const params = buildListParams(input, 5000);
  return useQuery<ServerListResult<T>>({
    queryKey: queryKeys.customers.serverList(
      params as unknown as Record<string, unknown>
    ),
    queryFn: async () => {
      const response = await api.getCustomers(params);
      const data = response.data?.data;
      return {
        rows: (data?.customers || []) as T[],
        pagination: (data?.pagination as PaginationMeta) || {
          ...EMPTY_PAGINATION,
          limit: params.limit,
        },
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useEnquiriesListQuery<T = unknown[]>(enabled: boolean, statusFilter: string) {
  return useQuery<T>({
    queryKey: queryKeys.enquiries.list(statusFilter),
    queryFn: async () => {
      const response = await api.getEnquiries({
        page: 1,
        limit: 200,
        status: statusFilter || undefined,
      });
      return (response.data?.data?.enquiries || []) as T;
    },
    enabled,
    placeholderData: (previous) => previous,
  });
}

export function useInvalidateEnquiriesList() {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.enquiries.all });
}

/**
 * Server-paginated enquiries list. Keyed on page/search/sort/status; the
 * server already supports the status filter. keepPreviousData avoids blanking.
 */
export function useEnquiriesServerListQuery<T = unknown>(
  enabled: boolean,
  input: ListParamsInput
) {
  const params = buildListParams(input);
  return useQuery<ServerListResult<T>>({
    queryKey: queryKeys.enquiries.serverList(
      params as unknown as Record<string, unknown>
    ),
    queryFn: async () => {
      const response = await api.getEnquiries(params);
      const data = response.data?.data;
      return {
        rows: (data?.enquiries || []) as T[],
        pagination: (data?.pagination as PaginationMeta) || {
          ...EMPTY_PAGINATION,
          limit: params.limit,
        },
      };
    },
    enabled,
    placeholderData: keepPreviousData,
  });
}

type PaymentBookingRow = {
  id: string;
  grandTotal?: number;
  paymentReceivedAmountValue?: number;
  paymentReceivedAmount?: string | number | null;
  dueAmountValue?: number;
  dueAmount?: string | number | null;
  _count?: { payments: number };
};

export type AddPaymentInput = {
  bookingId: string;
  clientMutationId: string;
  amount: number;
  method: string;
  reference?: string;
  narration?: string;
  paymentDate?: string;
};

function applyOptimisticPayment(
  rows: PaymentBookingRow[],
  input: AddPaymentInput
): PaymentBookingRow[] {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return rows;

  return rows.map((row) => {
    if (row.id !== input.bookingId) return row;
    const grossReceived = resolvePaymentReceivedGross(row) + amount;
    const total = row.grandTotal ?? 0;
    const priorDue =
      row.dueAmountValue ??
      (total > 0
        ? Math.max(0, total - resolvePaymentReceivedGross(row))
        : resolveDueAmount(row));
    const isCheque = input.method.toLowerCase() === 'cheque';
    const due = isCheque ? priorDue : Math.max(0, priorDue - amount);
    return {
      ...row,
      paymentReceivedAmountValue: grossReceived,
      dueAmountValue: due,
      _count: { payments: (row._count?.payments ?? 0) + 1 },
    };
  });
}

/**
 * Apply the optimistic payment to a cached value regardless of whether it is
 * the legacy array shape (`PaymentBookingRow[]`) or the server-paginated shape
 * (`{ rows, pagination }`). Re-keying the list MUST NOT silently break the
 * optimistic add — this patches every matching list cache entry.
 */
export function applyOptimisticToCacheValue(
  value: unknown,
  input: AddPaymentInput
): unknown {
  if (Array.isArray(value)) {
    return applyOptimisticPayment(value as PaymentBookingRow[], input);
  }
  if (value && typeof value === 'object' && Array.isArray((value as any).rows)) {
    const v = value as { rows: PaymentBookingRow[] };
    return { ...v, rows: applyOptimisticPayment(v.rows, input) };
  }
  return value;
}

export function useAddPaymentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: AddPaymentInput) => {
      await api.addPayment(input.bookingId, {
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        narration: input.narration,
        clientMutationId: input.clientMutationId,
        paymentDate: input.paymentDate,
      });
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookings.all });
      // Snapshot + patch ALL bookings list caches (legacy array key AND every
      // server-paginated key) so the optimistic add applies on either path.
      const entries = queryClient.getQueriesData({
        queryKey: queryKeys.bookings.all,
      });
      const snapshots: [readonly unknown[], unknown][] = [];
      for (const [key, value] of entries) {
        if (value == null) continue;
        snapshots.push([key, value]);
        queryClient.setQueryData(key, applyOptimisticToCacheValue(value, input));
      }
      return { snapshots };
    },
    onError: (error: unknown, _input, context) => {
      if (context?.snapshots) {
        for (const [key, value] of context.snapshots) {
          queryClient.setQueryData(key, value);
        }
      }
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to add payment';
      toast.error(message);
    },
    onSuccess: (_data, input) => {
      toast.success('Payment added');
      notifyBookingExternalUpdate(input.bookingId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.bookings.all });
    },
  });
}

export type EnquiryUpdatePayload = Record<string, unknown>;

/**
 * Apply an enquiry patch to either cache shape: legacy array OR the
 * server-paginated `{ rows, pagination }`.
 */
export function applyEnquiryPatchToCacheValue(
  value: unknown,
  id: string,
  payload: EnquiryUpdatePayload
): unknown {
  const patchRow = (row: Record<string, unknown>) =>
    row.id === id ? { ...row, ...payload } : row;
  if (Array.isArray(value)) {
    return (value as Record<string, unknown>[]).map(patchRow);
  }
  if (value && typeof value === 'object' && Array.isArray((value as any).rows)) {
    const v = value as { rows: Record<string, unknown>[] };
    return { ...v, rows: v.rows.map(patchRow) };
  }
  return value;
}

export function useUpdateEnquiryMutation(_statusFilter: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: EnquiryUpdatePayload;
    }) => {
      await api.updateEnquiry(id, payload);
      return { id, payload };
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.enquiries.all });
      // Patch ALL enquiry list caches (legacy per-status array key AND every
      // server-paginated key) so optimistic edits apply on either path.
      const entries = queryClient.getQueriesData({
        queryKey: queryKeys.enquiries.all,
      });
      const snapshots: [readonly unknown[], unknown][] = [];
      for (const [key, value] of entries) {
        if (value == null) continue;
        snapshots.push([key, value]);
        queryClient.setQueryData(
          key,
          applyEnquiryPatchToCacheValue(value, id, payload)
        );
      }
      return { snapshots };
    },
    onError: (error: unknown, _vars, context) => {
      if (context?.snapshots) {
        for (const [key, value] of context.snapshots) {
          queryClient.setQueryData(key, value);
        }
      }
      const message =
        (error as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to update enquiry';
      toast.error(message);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.enquiries.all });
    },
  });
}
