import type { CSSProperties } from 'react';
import FormPromptModal from '@/components/FormPromptModal';
import { locationFor, locationStyle } from '../_lib/event-styles';
import type { SidebarGroup } from './CalendarSidebar';

export default function MobileFilterSheet({
  open,
  onClose,
  groups,
  banquetIndex,
  selectedHallIds,
  toggleHall,
  toggleBanquetGroup,
  statusCounts,
  selectedStatuses,
  toggleStatus,
}: {
  open: boolean;
  onClose: () => void;
  groups: SidebarGroup[];
  banquetIndex: Map<string, number>;
  selectedHallIds: Set<string> | null;
  toggleHall: (hallId: string) => void;
  toggleBanquetGroup: (hallIds: string[]) => void;
  statusCounts: Array<{ key: string; label: string; count: number }>;
  selectedStatuses: Set<string>;
  toggleStatus: (status: string) => void;
}) {
  const isHallOn = (hallId: string) => selectedHallIds === null || selectedHallIds.has(hallId);

  return (
    <FormPromptModal open={open} title="Calendar filters" onClose={onClose} widthClass="max-w-lg">
      <div className="ncal-filter-sheet">
        {groups.map((group) => {
          const loc = locationFor(group.banquetName, banquetIndex);
          const hallIds = group.halls.map((hall) => hall.id);
          const onCount = group.halls.filter((hall) => isHallOn(hall.id)).length;
          const allOn = onCount === group.halls.length;
          const someOn = onCount > 0 && !allOn;
          return (
            <div className="ncal-sec" key={group.banquetName}>
              <button
                type="button"
                className={`ncal-li ncal-banquet-li${allOn ? '' : ' ncal-off'}`}
                style={locationStyle(loc)}
                role="checkbox"
                aria-checked={allOn ? true : someOn ? 'mixed' : false}
                aria-label={`${group.banquetName}, ${onCount} of ${group.halls.length} halls`}
                onClick={() => toggleBanquetGroup(hallIds)}
              >
                <span
                  className={`ncal-ck${allOn ? ' on' : someOn ? ' partial' : ''}`}
                  aria-hidden="true"
                />
                <i className="ncal-sec-venue-dot" style={{ background: loc.solid }} aria-hidden="true" />
                <span className="ncal-n">{group.banquetName}</span>
                <span className="ncal-c">
                  {onCount}/{group.halls.length}
                </span>
              </button>
              {group.halls.map((hall) => (
                <button
                  key={hall.id}
                  type="button"
                  className={`ncal-li ncal-hall-li${isHallOn(hall.id) ? '' : ' ncal-off'}`}
                  style={locationStyle(loc)}
                  role="checkbox"
                  aria-checked={isHallOn(hall.id)}
                  onClick={() => toggleHall(hall.id)}
                >
                  <span className={`ncal-ck${isHallOn(hall.id) ? ' on' : ''}`} aria-hidden="true" />
                  <span className="ncal-n">{hall.name}</span>
                  <span className="ncal-c">{hall.count}</span>
                </button>
              ))}
            </div>
          );
        })}
        <div className="ncal-sec">
          <div className="ncal-sec-head">Status</div>
          {statusCounts.map((status) => (
            <button
              key={status.key}
              type="button"
              className={`ncal-li${selectedStatuses.has(status.key) ? '' : ' ncal-off'}`}
              style={{ '--lc': 'var(--ncal-accent)' } as CSSProperties}
              role="checkbox"
              aria-checked={selectedStatuses.has(status.key)}
              onClick={() => toggleStatus(status.key)}
            >
              <span className={`ncal-ck${selectedStatuses.has(status.key) ? ' on' : ''}`} aria-hidden="true" />
              <span className="ncal-n">{status.label}</span>
              <span className="ncal-c">{status.count}</span>
            </button>
          ))}
        </div>
      </div>
    </FormPromptModal>
  );
}
