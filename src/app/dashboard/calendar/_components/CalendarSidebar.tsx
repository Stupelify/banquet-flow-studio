import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import MiniCalendar from './MiniCalendar';
import { locationFor, locationStyle } from '../_lib/event-styles';

export type SidebarHall = { id: string; name: string; count: number };
export type SidebarGroup = { banquetName: string; halls: SidebarHall[] };

export default function CalendarSidebar({
  groups, banquetIndex, selectedHallIds, toggleHall, toggleBanquetGroup,
  statusCounts, selectedStatuses, toggleStatus, stats, mini,
  collapsed, onToggleCollapsed,
}: {
  groups: SidebarGroup[];
  banquetIndex: Map<string, number>;
  selectedHallIds: Set<string> | null;
  toggleHall: (hallId: string) => void;
  toggleBanquetGroup: (hallIds: string[]) => void;
  statusCounts: Array<{ key: string; label: string; count: number }>;
  selectedStatuses: Set<string>;
  toggleStatus: (status: string) => void;
  stats: { venues: number; halls: number; todayCount: number };
  mini: React.ComponentProps<typeof MiniCalendar>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const isOn = (hallId: string) => selectedHallIds === null || selectedHallIds.has(hallId);
  return (
    <aside className={`ncal-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="ncal-sidebar-chrome">
        <button
          type="button"
          className="ncal-sidebar-toggle"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand calendar sidebar' : 'Collapse calendar sidebar'}
          onClick={onToggleCollapsed}
        >
          {collapsed ? (
            <PanelLeftOpen size={16} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={16} aria-hidden="true" />
          )}
        </button>
      </div>

      {collapsed ? (
        <div className="ncal-sidebar-rail" aria-hidden="true">
          {groups.map((group) => {
            const loc = locationFor(group.banquetName, banquetIndex);
            return (
              <i
                key={group.banquetName}
                className="ncal-sidebar-rail-dot"
                style={{ background: loc.solid }}
              />
            );
          })}
        </div>
      ) : (
        <>
          <div className="ncal-sidebar-scroll">
            <MiniCalendar {...mini} />
            {groups.map((group) => {
              const loc = locationFor(group.banquetName, banquetIndex);
              const hallIds = group.halls.map((h) => h.id);
              const onCount = group.halls.filter((h) => isOn(h.id)).length;
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
                      className={`ncal-li ncal-hall-li${isOn(hall.id) ? '' : ' ncal-off'}`}
                      style={locationStyle(loc)}
                      role="checkbox"
                      aria-checked={isOn(hall.id)}
                      onClick={() => toggleHall(hall.id)}
                    >
                      <span className={`ncal-ck${isOn(hall.id) ? ' on' : ''}`} aria-hidden="true" />
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
                  style={{ '--lc': 'var(--ncal-accent)' } as React.CSSProperties}
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
          <div className="ncal-sidebar-foot">
            <div className="ncal-sf-row"><span>Venues</span><b>{stats.venues}</b></div>
            <div className="ncal-sf-row"><span>Halls</span><b>{stats.halls}</b></div>
            <div className="ncal-sf-row"><span>Today</span><b>{stats.todayCount} bookings</b></div>
          </div>
        </>
      )}
    </aside>
  );
}
