
import type { initialColumnSearch } from '../_lib/types';

type ColumnSearch = typeof initialColumnSearch;

export type VenueHallOption = {
  banquetId: string;
  banquetName: string;
  halls: Array<{ id: string; name: string }>;
};

/**
 * Venue picker + hall checkboxes, driving columnSearch.banquetId / hallIds.
 * Shared by the Hall column-header popover (desktop table) and the Filters
 * panel (mobile), so both surfaces stay in sync.
 */
export default function VenueHallFilter({
  options,
  columnSearch,
  setColumnSearch,
}: {
  options: VenueHallOption[];
  columnSearch: ColumnSearch;
  setColumnSearch: React.Dispatch<React.SetStateAction<ColumnSearch>>;
}) {
  const selectedVenue = options.find((v) => v.banquetId === columnSearch.banquetId);
  const selectedHallIds = new Set(
    columnSearch.hallIds ? columnSearch.hallIds.split(',').filter(Boolean) : []
  );

  return (
    <div className="space-y-2">
      <div>
        <label className="label">Venue</label>
        <select
          className="input"
          value={columnSearch.banquetId}
          onChange={(e) =>
            setColumnSearch((prev) => ({ ...prev, banquetId: e.target.value, hallIds: '' }))
          }
        >
          <option value="">All venues</option>
          {options.map((v) => (
            <option key={v.banquetId} value={v.banquetId}>
              {v.banquetName}
            </option>
          ))}
        </select>
      </div>
      {selectedVenue && selectedVenue.halls.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-y-auto pt-1">
          {selectedVenue.halls.map((h) => (
            <label key={h.id} className="flex items-center gap-2 text-sm text-[var(--text-2)]">
              <input
                type="checkbox"
                checked={selectedHallIds.has(h.id)}
                onChange={(e) => {
                  const next = new Set(selectedHallIds);
                  if (e.target.checked) next.add(h.id);
                  else next.delete(h.id);
                  setColumnSearch((prev) => ({ ...prev, hallIds: Array.from(next).join(',') }));
                }}
              />
              {h.name}
            </label>
          ))}
        </div>
      )}
      {(columnSearch.banquetId || columnSearch.hallIds) && (
        <button
          type="button"
          className="text-xs text-teal-600"
          onClick={() => setColumnSearch((prev) => ({ ...prev, banquetId: '', hallIds: '' }))}
        >
          Clear venue
        </button>
      )}
    </div>
  );
}
