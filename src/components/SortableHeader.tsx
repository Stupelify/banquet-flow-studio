
import { ArrowDownAZ, ArrowUpAZ, ArrowUpDown } from 'lucide-react';
import { SortState } from '@/lib/tableUtils';

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  className?: string;
  /** Optional control (e.g. a column filter popover) rendered after the sort button. */
  filterSlot?: React.ReactNode;
}

export default function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = 'text-left py-3 px-4 text-sm font-semibold text-[var(--text-2)]',
  filterSlot,
}: SortableHeaderProps) {
  const isActive = sort.key === sortKey;

  return (
    <th className={className}>
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          onClick={() => onSort(sortKey)}
          className="inline-flex items-center gap-1 text-inherit hover:text-primary-700"
        >
          <span>{label}</span>
          {!isActive ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-[var(--text-4)]" />
          ) : sort.direction === 'asc' ? (
            <ArrowUpAZ className="w-3.5 h-3.5 text-primary-700" />
          ) : (
            <ArrowDownAZ className="w-3.5 h-3.5 text-primary-700" />
          )}
        </button>
        {filterSlot}
      </span>
    </th>
  );
}
