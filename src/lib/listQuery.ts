/**
 * listQuery.ts
 *
 * Pure helpers for the client side of server-side pagination. Kept free of
 * React/DOM so they are unit-testable in the vitest node env.
 *
 *  - buildListParams: shape the GET query params (page/limit/search/sort/order
 *    + optional status/fromDate/toDate), omitting empties and clamping limit.
 *  - normalizeSearchForServer: trim; for phone-like queries also expose the
 *    digit-only form so "98765 43210" still matches server `phone contains`.
 *  - mergePinnedById / dedupeById: hybrid-picker — pin the already-selected
 *    record even if it is beyond the first batch, and append scroll batches
 *    without duplicates.
 *  - aggregateAllPages: export/print — fetch ALL pages matching the current
 *    search/filter (not just the visible page).
 *  - selectListData: error keep-previous — if a fetch errored, keep the last
 *    successfully loaded page on screen instead of blanking.
 */

export type SortDir = 'asc' | 'desc';

export type ListParamsInput = {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: SortDir;
  status?: string;
  fromDate?: string;
  toDate?: string;
  /** Bookings hall filter: venue id + comma-joined hall ids within it. */
  banquetId?: string;
  hallIds?: string;
  /** Server-side saved view (bookings: balance/pencils/unconfirmed/confirmed/high). */
  view?: string;
}

export type ListParams = {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  order?: SortDir;
  status?: string;
  fromDate?: string;
  toDate?: string;
  banquetId?: string;
  hallIds?: string;
  view?: string;
}

/** Server caps bookings/enquiries at 200; never request more than that. */
export const SERVER_HARD_LIMIT = 200;

export function clampLimit(limit: number, hardLimit = SERVER_HARD_LIMIT): number {
  if (!Number.isFinite(limit) || limit <= 0) return 1;
  return Math.min(Math.floor(limit), hardLimit);
}

export function clampPage(page: number): number {
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

/**
 * Build the params object sent to api.getX(). Empty/whitespace search and
 * empty filters are omitted so the cache key stays stable and the server
 * treats them as "no filter".
 */
export function buildListParams(
  input: ListParamsInput,
  hardLimit = SERVER_HARD_LIMIT
): ListParams {
  const params: ListParams = {
    page: clampPage(input.page),
    limit: clampLimit(input.limit, hardLimit),
  };

  const search = (input.search ?? '').trim();
  if (search) params.search = search;

  if (input.sort) {
    params.sort = input.sort;
    params.order = input.order === 'desc' ? 'desc' : 'asc';
  }

  const status = (input.status ?? '').trim();
  if (status) params.status = status;

  if (input.fromDate) params.fromDate = input.fromDate;
  if (input.toDate) params.toDate = input.toDate;

  const banquetId = (input.banquetId ?? '').trim();
  if (banquetId) params.banquetId = banquetId;
  const hallIds = (input.hallIds ?? '').trim();
  if (hallIds) params.hallIds = hallIds;

  const view = (input.view ?? '').trim();
  if (view) params.view = view;

  return params;
}

/**
 * For phone-style queries, the server's `phone contains` does not strip
 * separators. Return the digit-only form when the raw query is "mostly digits"
 * (e.g. "98765 43210", "+91 98765-43210") so the search still hits.
 * Returns the trimmed raw query for normal text.
 */
export function normalizeSearchForServer(raw: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/\D/g, '');
  const nonDigits = trimmed.replace(/[\d\s+\-()]/g, '');
  // If it is phone-like (>=4 digits and no meaningful letters), search digits.
  if (digits.length >= 4 && nonDigits.length === 0) {
    return digits;
  }
  return trimmed;
}

export interface IdLike {
  id: string;
}

export function dedupeById<T extends IdLike>(rows: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const row of rows) {
    if (row && row.id != null && !seen.has(row.id)) {
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

/**
 * Hybrid picker: ensure the currently-selected record is shown/pinned at the
 * top even if it is not present in the loaded batch (e.g. editing a booking
 * whose customer is record #6000). De-dupes so it never appears twice.
 */
export function mergePinnedById<T extends IdLike>(
  batch: T[],
  pinned: T | null | undefined
): T[] {
  if (!pinned) return dedupeById(batch);
  return dedupeById([pinned, ...batch]);
}

/** Append a newly scrolled batch to the existing list without duplicates. */
export function appendBatch<T extends IdLike>(existing: T[], next: T[]): T[] {
  return dedupeById([...existing, ...next]);
}

export interface PageResponse<T> {
  rows: T[];
  total: number;
  totalPages: number;
  page: number;
}

/**
 * Export/Print across ALL matching records. `fetchPage(page)` must return the
 * page slice + pagination meta for the SAME search/filter as the visible list.
 * Stops at totalPages (or a hard safety cap) and de-dupes.
 */
export async function aggregateAllPages<T extends IdLike>(
  fetchPage: (page: number) => Promise<PageResponse<T>>,
  maxPages = 1000
): Promise<T[]> {
  const all: T[] = [];
  const first = await fetchPage(1);
  all.push(...first.rows);
  const totalPages = Math.min(Math.max(1, first.totalPages || 1), maxPages);
  for (let page = 2; page <= totalPages; page += 1) {
    const next = await fetchPage(page);
    all.push(...next.rows);
    if (next.rows.length === 0) break;
  }
  return dedupeById(all);
}

/**
 * Error keep-previous: when a page/search fetch errors, keep the last
 * successfully-loaded data on screen rather than blanking. Returns the data
 * to render and whether we are showing stale data (so a retry toast can fire).
 */
export function selectListData<T>(
  current: T[] | undefined,
  previous: T[] | undefined,
  isError: boolean
): { rows: T[]; showingStale: boolean } {
  if (isError) {
    if (previous && previous.length > 0) {
      return { rows: previous, showingStale: true };
    }
    return { rows: current ?? [], showingStale: false };
  }
  return { rows: current ?? previous ?? [], showingStale: false };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Hybrid-picker infinite scroll: whether another page remains after `page`
 * (1-based) given the server's reported `totalPages`. Defensive against a
 * missing/zero totalPages (treated as a single page).
 */
export function hasMorePages(page: number, totalPages: number): boolean {
  return clampPage(page) < Math.max(1, Math.floor(totalPages || 1));
}

/**
 * Infinite-scroll trigger for a dropdown list: true when the scroll position is
 * within `threshold` px of the bottom of the scroll container. Pure (operates
 * on plain numbers) so it is unit-testable without a DOM. Returns false when
 * the content does not overflow (nothing to scroll to).
 */
export function shouldLoadMore(
  scrollTop: number,
  clientHeight: number,
  scrollHeight: number,
  threshold = 48
): boolean {
  if (scrollHeight <= clientHeight) return false;
  return scrollTop + clientHeight >= scrollHeight - Math.max(0, threshold);
}

/** Showing X–Y of N, clamped to valid bounds. */
export function showingRange(
  page: number,
  limit: number,
  total: number
): { start: number; end: number; total: number } {
  if (total <= 0) return { start: 0, end: 0, total: 0 };
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);
  return { start: Math.min(start, total), end, total };
}
