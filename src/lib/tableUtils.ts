export type SortDirection = 'asc' | 'desc';

export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableColumnConfig<T> {
  key: string;
  accessor: (row: T) => unknown;
  searchable?: boolean;
  sortable?: boolean;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function normalizeValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry)).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>)
      .map((entry) => normalizeValue(entry))
      .join(' ');
  }
  return String(value).trim();
}

function toComparable(value: unknown): string | number {
  const normalized = normalizeValue(value);
  if (!normalized) return '';

  const numericCandidate = normalized.replace(/,/g, '');
  if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
    return Number(numericCandidate);
  }

  const timestamp = Date.parse(normalized);
  if (!Number.isNaN(timestamp) && /\d/.test(normalized)) {
    return timestamp;
  }

  return normalized.toLowerCase();
}

/** Substring match against a column value with the query already lowercased
 * (hoisted out of the per-row loop to avoid re-lowercasing on every row). */
function includesLoweredQuery(value: unknown, loweredQuery: string): boolean {
  if (!loweredQuery) return true;
  return normalizeValue(value).toLowerCase().includes(loweredQuery);
}

export function getNextSort(
  currentSort: SortState,
  key: string
): SortState {
  if (currentSort.key !== key) {
    return { key, direction: 'asc' };
  }

  return {
    key,
    direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
  };
}

export function filterAndSortRows<T>(
  rows: T[],
  columns: TableColumnConfig<T>[],
  globalSearch: string,
  columnSearch: Record<string, string>,
  sort: SortState
): T[] {
  const searchableColumns = columns.filter((column) => column.searchable !== false);
  const sortableColumn = columns.find(
    (column) => column.key === sort.key && column.sortable !== false
  );

  // Hoist per-keystroke work out of the per-row loop: resolve active column
  // searches to their column + lowercased query once, and lowercase the global
  // query once. Behaviour is identical to the previous per-row computation.
  const loweredGlobal = globalSearch ? globalSearch.toLowerCase() : '';
  const columnsByKey = new Map(columns.map((column) => [column.key, column]));
  const activeColumnSearches = Object.entries(columnSearch)
    .filter(([, query]) => Boolean(query))
    .map(([key, query]) => ({ column: columnsByKey.get(key), lowered: query.toLowerCase() }))
    .filter((entry): entry is { column: TableColumnConfig<T>; lowered: string } =>
      Boolean(entry.column)
    );

  const filtered = rows.filter((row) => {
    if (loweredGlobal) {
      const globalMatch = searchableColumns.some((column) =>
        includesLoweredQuery(column.accessor(row), loweredGlobal)
      );
      if (!globalMatch) return false;
    }

    for (const { column, lowered } of activeColumnSearches) {
      if (!includesLoweredQuery(column.accessor(row), lowered)) return false;
    }

    return true;
  });

  if (!sortableColumn) return filtered;

  // Schwartzian transform: compute each row's comparable key once instead of on
  // every comparator call (was O(n log n) accessor + parse calls).
  const accessor = sortableColumn.accessor;
  const dir = sort.direction === 'asc' ? 1 : -1;
  return filtered
    .map((row) => ({ row, key: toComparable(accessor(row)) }))
    .sort((a, b) => {
      let comparison = 0;
      if (typeof a.key === 'number' && typeof b.key === 'number') {
        comparison = a.key - b.key;
      } else {
        comparison = collator.compare(String(a.key), String(b.key));
      }
      return dir * comparison;
    })
    .map((entry) => entry.row);
}
