import { describe, it, expect } from 'vitest';
import {
  buildListParams,
  clampLimit,
  clampPage,
  normalizeSearchForServer,
  dedupeById,
  mergePinnedById,
  appendBatch,
  aggregateAllPages,
  selectListData,
  showingRange,
  hasMorePages,
  shouldLoadMore,
  SERVER_HARD_LIMIT,
} from '../listQuery';

describe('clampLimit / clampPage', () => {
  it('caps at the server hard limit (200)', () => {
    expect(clampLimit(5000)).toBe(SERVER_HARD_LIMIT);
    expect(clampLimit(75)).toBe(75);
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-5)).toBe(1);
  });
  it('respects a custom hard limit (customers allow 5000)', () => {
    expect(clampLimit(100, 5000)).toBe(100);
    expect(clampLimit(99999, 5000)).toBe(5000);
  });
  it('clamps page to >= 1', () => {
    expect(clampPage(0)).toBe(1);
    expect(clampPage(-3)).toBe(1);
    expect(clampPage(4)).toBe(4);
    expect(clampPage(2.9)).toBe(2);
  });
});

describe('buildListParams', () => {
  it('omits empty search/sort/status', () => {
    expect(buildListParams({ page: 1, limit: 75 })).toEqual({ page: 1, limit: 75 });
  });
  it('trims and includes search', () => {
    expect(buildListParams({ page: 2, limit: 75, search: '  sharma ' })).toEqual({
      page: 2,
      limit: 75,
      search: 'sharma',
    });
  });
  it('omits whitespace-only search', () => {
    expect(buildListParams({ page: 1, limit: 75, search: '   ' })).toEqual({
      page: 1,
      limit: 75,
    });
  });
  it('includes sort with normalized order, defaulting to asc', () => {
    expect(buildListParams({ page: 1, limit: 75, sort: 'name' })).toMatchObject({
      sort: 'name',
      order: 'asc',
    });
    expect(
      buildListParams({ page: 1, limit: 75, sort: 'functionDate', order: 'desc' })
    ).toMatchObject({ sort: 'functionDate', order: 'desc' });
  });
  it('clamps the limit to the hard cap for bookings/enquiries', () => {
    expect(buildListParams({ page: 1, limit: 5000 }).limit).toBe(200);
  });
  it('allows a larger cap for customers', () => {
    expect(buildListParams({ page: 1, limit: 100 }, 5000).limit).toBe(100);
  });
  it('passes status + date range when present', () => {
    expect(
      buildListParams({
        page: 3,
        limit: 75,
        status: 'confirmed',
        fromDate: '2026-01-01',
        toDate: '2026-02-01',
      })
    ).toEqual({
      page: 3,
      limit: 75,
      status: 'confirmed',
      fromDate: '2026-01-01',
      toDate: '2026-02-01',
    });
  });

  it('passes venue + hall filter when present, omits when empty', () => {
    expect(
      buildListParams({ page: 1, limit: 75, banquetId: 'b1', hallIds: 'h1,h2' })
    ).toEqual({ page: 1, limit: 75, banquetId: 'b1', hallIds: 'h1,h2' });
    expect(
      buildListParams({ page: 1, limit: 75, banquetId: '  ', hallIds: '' })
    ).toEqual({ page: 1, limit: 75 });
  });
});

describe('normalizeSearchForServer', () => {
  it('returns trimmed text for normal name queries', () => {
    expect(normalizeSearchForServer('  Sharma ')).toBe('Sharma');
    expect(normalizeSearchForServer("D'Souza")).toBe("D'Souza");
  });
  it('strips separators for phone-with-spaces', () => {
    expect(normalizeSearchForServer('98765 43210')).toBe('9876543210');
    expect(normalizeSearchForServer('+91 98765-43210')).toBe('919876543210');
    expect(normalizeSearchForServer('(022) 1234 5678')).toBe('02212345678');
  });
  it('keeps short numeric queries as-is', () => {
    expect(normalizeSearchForServer('12')).toBe('12');
  });
  it('does not treat alphanumeric as phone', () => {
    expect(normalizeSearchForServer('Hall 2')).toBe('Hall 2');
  });
  it('handles empty', () => {
    expect(normalizeSearchForServer('')).toBe('');
    expect(normalizeSearchForServer('   ')).toBe('');
  });
});

describe('dedupeById / mergePinnedById / appendBatch', () => {
  const a = { id: 'a', name: 'A' };
  const b = { id: 'b', name: 'B' };
  const aDup = { id: 'a', name: 'A2' };

  it('dedupes keeping first occurrence', () => {
    expect(dedupeById([a, b, aDup])).toEqual([a, b]);
  });
  it('pins a selected record not in the batch', () => {
    const pinned = { id: 'z', name: 'Far Down' };
    expect(mergePinnedById([a, b], pinned)).toEqual([pinned, a, b]);
  });
  it('does not duplicate the pinned record if already in the batch', () => {
    expect(mergePinnedById([a, b], { id: 'a', name: 'pinned' })).toEqual([
      { id: 'a', name: 'pinned' },
      b,
    ]);
  });
  it('returns deduped batch with no pin', () => {
    expect(mergePinnedById([a, aDup], null)).toEqual([a]);
  });
  it('appends scroll batches without duplicates', () => {
    expect(appendBatch([a, b], [b, { id: 'c', name: 'C' }])).toEqual([
      a,
      b,
      { id: 'c', name: 'C' },
    ]);
  });
});

describe('aggregateAllPages (export/print across all pages)', () => {
  it('fetches every page and concatenates', async () => {
    const pages: Record<number, { id: string }[]> = {
      1: [{ id: '1' }, { id: '2' }],
      2: [{ id: '3' }, { id: '4' }],
      3: [{ id: '5' }],
    };
    const all = await aggregateAllPages(async (page) => ({
      rows: pages[page] ?? [],
      total: 5,
      totalPages: 3,
      page,
    }));
    expect(all.map((r) => r.id)).toEqual(['1', '2', '3', '4', '5']);
  });
  it('handles a single page', async () => {
    const all = await aggregateAllPages(async () => ({
      rows: [{ id: 'x' }],
      total: 1,
      totalPages: 1,
      page: 1,
    }));
    expect(all).toEqual([{ id: 'x' }]);
  });
  it('handles empty results', async () => {
    const all = await aggregateAllPages(async () => ({
      rows: [],
      total: 0,
      totalPages: 1,
      page: 1,
    }));
    expect(all).toEqual([]);
  });
  it('dedupes across pages', async () => {
    const all = await aggregateAllPages(async (page) => ({
      rows: page === 1 ? [{ id: 'a' }] : [{ id: 'a' }, { id: 'b' }],
      total: 2,
      totalPages: 2,
      page,
    }));
    expect(all.map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('selectListData (error keep-previous)', () => {
  const prev = [{ x: 1 }];
  const cur = [{ x: 2 }];
  it('shows current on success', () => {
    expect(selectListData(cur, prev, false)).toEqual({ rows: cur, showingStale: false });
  });
  it('keeps previous page on error and flags stale', () => {
    expect(selectListData(undefined, prev, true)).toEqual({
      rows: prev,
      showingStale: true,
    });
  });
  it('does not crash with no data at all on error', () => {
    expect(selectListData(undefined, undefined, true)).toEqual({
      rows: [],
      showingStale: false,
    });
  });
});

describe('showingRange', () => {
  it('computes X-Y of N', () => {
    expect(showingRange(1, 100, 250)).toEqual({ start: 1, end: 100, total: 250 });
    expect(showingRange(3, 100, 250)).toEqual({ start: 201, end: 250, total: 250 });
  });
  it('handles a single record', () => {
    expect(showingRange(1, 100, 1)).toEqual({ start: 1, end: 1, total: 1 });
  });
  it('handles zero results', () => {
    expect(showingRange(1, 100, 0)).toEqual({ start: 0, end: 0, total: 0 });
  });
  it('handles exact page boundary (exactly 50/100)', () => {
    expect(showingRange(1, 50, 50)).toEqual({ start: 1, end: 50, total: 50 });
    expect(showingRange(2, 50, 51)).toEqual({ start: 51, end: 51, total: 51 });
    expect(showingRange(1, 100, 100)).toEqual({ start: 1, end: 100, total: 100 });
  });
});

describe('hasMorePages (picker infinite-scroll paging)', () => {
  it('true while pages remain', () => {
    expect(hasMorePages(1, 3)).toBe(true);
    expect(hasMorePages(2, 3)).toBe(true);
  });
  it('false on the last page', () => {
    expect(hasMorePages(3, 3)).toBe(false);
    expect(hasMorePages(1, 1)).toBe(false);
  });
  it('treats missing/zero totalPages as a single page', () => {
    expect(hasMorePages(1, 0)).toBe(false);
    expect(hasMorePages(1, undefined as unknown as number)).toBe(false);
  });
  it('never reports more when already past the last page', () => {
    expect(hasMorePages(5, 3)).toBe(false);
  });
});

describe('shouldLoadMore (scroll-near-bottom trigger)', () => {
  it('triggers within threshold of the bottom', () => {
    // scrollTop 200 + clientHeight 100 = 300; scrollHeight 320; within 48 of bottom
    expect(shouldLoadMore(200, 100, 320)).toBe(true);
  });
  it('does not trigger when far from the bottom', () => {
    expect(shouldLoadMore(0, 100, 320)).toBe(false);
  });
  it('does not trigger when content does not overflow', () => {
    expect(shouldLoadMore(0, 240, 240)).toBe(false);
    expect(shouldLoadMore(0, 240, 100)).toBe(false);
  });
  it('triggers exactly at the bottom', () => {
    expect(shouldLoadMore(220, 100, 320)).toBe(true);
  });
  it('respects a custom threshold', () => {
    // 60px from bottom: outside default 48 but inside a 100 threshold
    expect(shouldLoadMore(160, 100, 320, 10)).toBe(false);
    expect(shouldLoadMore(160, 100, 320, 100)).toBe(true);
  });
});
