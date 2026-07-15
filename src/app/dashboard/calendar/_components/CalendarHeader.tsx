import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, Printer } from 'lucide-react';
import { CTA_NEW_BOOKING } from '../copy';
import type { CalendarViewMode } from '../_lib/types';

const VIEWS: CalendarViewMode[] = ['month', 'week', 'day'];
const VIEW_LABEL: Record<CalendarViewMode, string> = { month: 'Month', week: 'Week', day: 'Day' };

export default function CalendarHeader({
  title,
  subtitle,
  viewMode,
  onViewMode,
  onToday,
  onShift,
  search,
  onSearch,
  canAddBooking,
  onNewBooking,
  showPrint,
  printing,
  onPrint,
  loading,
  pickerOpen = false,
  onTogglePicker,
  onToggleFilters,
  mobile = false,
}: {
  title: string;
  subtitle: string;
  viewMode: CalendarViewMode;
  onViewMode: (mode: CalendarViewMode) => void;
  onToday: () => void;
  onShift: (delta: -1 | 1) => void;
  search: string;
  onSearch: (value: string) => void;
  canAddBooking: boolean;
  onNewBooking: () => void;
  showPrint: boolean;
  printing: boolean;
  onPrint: () => void;
  loading: boolean;
  pickerOpen?: boolean;
  onTogglePicker?: () => void;
  onToggleFilters?: () => void;
  /** When true, hide Week/Day tabs and desktop-only New (FAB handles create). */
  mobile?: boolean;
}) {
  const views = mobile ? (['month'] as CalendarViewMode[]) : VIEWS;
  return (
    <div className="ncal-toolbar">
      <h1 className="sr-only">Calendar</h1>
      <span className="ncal-t-title">{title}</span>
      <span className="ncal-t-sub">{loading ? 'Loading…' : subtitle}</span>
      <div className="ncal-t-spacer" />
      <div className="ncal-t-search-wrap ncal-mobile-hide">
        <input
          className="ncal-t-search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search bookings…"
          aria-label="Search bookings"
        />
        <kbd className="ncal-kbd">⌘K</kbd>
      </div>
      {!mobile && (
        <div className="ncal-t-seg" role="tablist" aria-label="Calendar view">
          {views.map((view) => (
            <button
              key={view}
              type="button"
              role="tab"
              aria-selected={viewMode === view}
              className={viewMode === view ? 'active' : ''}
              onClick={() => onViewMode(view)}
            >
              {VIEW_LABEL[view]}
              <kbd className="ncal-kbd ncal-mobile-hide">{view[0].toUpperCase()}</kbd>
            </button>
          ))}
        </div>
      )}
      <button type="button" className="ncal-t-btn" onClick={onToday}>
        Today
      </button>
      <button
        type="button"
        className="ncal-t-btn ncal-t-ghost"
        aria-label="Previous"
        onClick={() => onShift(-1)}
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="ncal-t-btn ncal-t-ghost"
        aria-label="Next"
        onClick={() => onShift(1)}
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      {onTogglePicker && (
        <button
          type="button"
          className="ncal-t-btn ncal-t-ghost"
          aria-label="Toggle mini calendar"
          aria-expanded={pickerOpen}
          onClick={onTogglePicker}
        >
          <CalendarDays size={14} aria-hidden="true" />
        </button>
      )}
      {/* Desktop filters live in sidebar; mobile Filters sits in .ncal-mtools to avoid toolbar clip. */}
      {onToggleFilters && !mobile && (
        <button
          type="button"
          className="ncal-t-btn"
          onClick={onToggleFilters}
        >
          <Filter size={13} aria-hidden="true" /> Filters
        </button>
      )}
      {showPrint && (
        <button type="button" className="ncal-t-btn" onClick={onPrint} disabled={printing}>
          <Printer size={13} aria-hidden="true" /> {printing ? 'Preparing…' : 'Day sheet'}
        </button>
      )}
      {canAddBooking && !mobile && (
        <button type="button" className="ncal-t-new" onClick={onNewBooking} aria-label={CTA_NEW_BOOKING}>
          <Plus size={13} aria-hidden="true" /> {CTA_NEW_BOOKING}
        </button>
      )}
    </div>
  );
}
