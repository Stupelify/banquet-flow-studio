import { describe, it, expect } from 'vitest';
import {
  filterAndSortRows,
  getNextSort,
  type TableColumnConfig,
  type SortState,
} from '../tableUtils';

interface Row {
  name: string;
  city: string;
  amount: number;
}

const rows: Row[] = [
  { name: 'Alice', city: 'Pune', amount: 1200 },
  { name: 'bob', city: 'Mumbai', amount: 300 },
  { name: 'Charlie', city: 'Pune', amount: 1000 },
  { name: 'dave', city: 'Delhi', amount: 1000 },
];

const columns: TableColumnConfig<Row>[] = [
  { key: 'name', accessor: (r) => r.name },
  { key: 'city', accessor: (r) => r.city },
  { key: 'amount', accessor: (r) => r.amount },
  { key: 'secret', accessor: (r) => r.name, searchable: false },
];

const noSort: SortState = { key: '__none__', direction: 'asc' };

describe('getNextSort', () => {
  it('switches to a new key ascending', () => {
    expect(getNextSort({ key: 'a', direction: 'desc' }, 'b')).toEqual({ key: 'b', direction: 'asc' });
  });
  it('toggles direction on the same key', () => {
    expect(getNextSort({ key: 'a', direction: 'asc' }, 'a')).toEqual({ key: 'a', direction: 'desc' });
    expect(getNextSort({ key: 'a', direction: 'desc' }, 'a')).toEqual({ key: 'a', direction: 'asc' });
  });
});

describe('filterAndSortRows — global search', () => {
  it('matches case-insensitively across searchable columns', () => {
    const out = filterAndSortRows(rows, columns, 'pune', {}, noSort);
    expect(out.map((r) => r.name).sort()).toEqual(['Alice', 'Charlie']);
  });
  it('empty global search returns all rows', () => {
    expect(filterAndSortRows(rows, columns, '', {}, noSort)).toHaveLength(4);
  });
  it('zero results when nothing matches', () => {
    expect(filterAndSortRows(rows, columns, 'zzz', {}, noSort)).toEqual([]);
  });
});

describe('filterAndSortRows — column search', () => {
  it('filters by a specific column', () => {
    const out = filterAndSortRows(rows, columns, '', { city: 'pune' }, noSort);
    expect(out.map((r) => r.name).sort()).toEqual(['Alice', 'Charlie']);
  });
  it('ignores empty column queries', () => {
    expect(filterAndSortRows(rows, columns, '', { city: '' }, noSort)).toHaveLength(4);
  });
  it('combines multiple column queries (AND)', () => {
    const out = filterAndSortRows(rows, columns, '', { city: 'pune', name: 'char' }, noSort);
    expect(out.map((r) => r.name)).toEqual(['Charlie']);
  });
  it('ignores searches against unknown columns', () => {
    expect(filterAndSortRows(rows, columns, '', { nope: 'x' }, noSort)).toHaveLength(4);
  });
});

describe('filterAndSortRows — sorting', () => {
  it('sorts numbers ascending and descending', () => {
    const asc = filterAndSortRows(rows, columns, '', {}, { key: 'amount', direction: 'asc' });
    expect(asc.map((r) => r.amount)).toEqual([300, 1000, 1000, 1200]);
    const desc = filterAndSortRows(rows, columns, '', {}, { key: 'amount', direction: 'desc' });
    expect(desc.map((r) => r.amount)).toEqual([1200, 1000, 1000, 300]);
  });
  it('sorts strings case-insensitively (Alice, bob, Charlie, dave)', () => {
    const asc = filterAndSortRows(rows, columns, '', {}, { key: 'name', direction: 'asc' });
    expect(asc.map((r) => r.name)).toEqual(['Alice', 'bob', 'Charlie', 'dave']);
  });
  it('does not reorder when sort key is unknown', () => {
    const out = filterAndSortRows(rows, columns, '', {}, noSort);
    expect(out.map((r) => r.name)).toEqual(['Alice', 'bob', 'Charlie', 'dave']);
  });
  it('respects sortable:false (no reorder)', () => {
    const unsortable: TableColumnConfig<Row>[] = [
      { key: 'amount', accessor: (r) => r.amount, sortable: false },
    ];
    const out = filterAndSortRows(rows, unsortable, '', {}, { key: 'amount', direction: 'desc' });
    expect(out.map((r) => r.amount)).toEqual([1200, 300, 1000, 1000]);
  });
});

describe('filterAndSortRows — edge cases', () => {
  it('empty rows -> empty', () => {
    expect(filterAndSortRows([], columns, 'x', { city: 'y' }, { key: 'name', direction: 'asc' })).toEqual([]);
  });
  it('single row passing filter', () => {
    expect(filterAndSortRows([rows[0]], columns, 'alice', {}, noSort)).toHaveLength(1);
  });
  it('searchable:false column is excluded from global search', () => {
    // 'secret' accessor returns name; but searchable:false means global search
    // still finds via the name column, so removing the name column proves exclusion.
    const onlySecret: TableColumnConfig<Row>[] = [
      { key: 'secret', accessor: (r) => r.name, searchable: false },
    ];
    expect(filterAndSortRows(rows, onlySecret, 'alice', {}, noSort)).toEqual([]);
  });
});
