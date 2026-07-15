import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = resolve(__dirname, '../../../../../../');
const read = (path: string) => readFileSync(resolve(clientRoot, path), 'utf8');

const luminance = (channel: number) => {
  const normalized = channel / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const contrastRatio = (hexA: string, hexB: string) => {
  const rgb = (hex: string) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((index) => parseInt(value.slice(index, index + 2), 16));
  };
  const relative = (hex: string) => {
    const [r, g, b] = rgb(hex);
    return 0.2126 * luminance(r) + 0.7152 * luminance(g) + 0.0722 * luminance(b);
  };
  const [lighter, darker] = [relative(hexA), relative(hexB)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

const cssVariable = (css: string, name: string, selector = ':root') => {
  const block = css.match(new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([\\s\\S]*?)\\}`))?.[1];
  const value = block?.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!value) throw new Error(`Missing ${name} in ${selector}`);
  return value;
};

describe('calendar accessibility contracts', () => {
  it('keeps Notion calendar text tokens at AA contrast', () => {
    const css = read('src/app/styles/calendar-notion.css');
    const aa = 4.5;

    expect(contrastRatio(cssVariable(css, '--ncal-accent'), '#ffffff')).toBeGreaterThanOrEqual(aa);
    expect(contrastRatio(cssVariable(css, '--ncal-accent-hover'), '#ffffff')).toBeGreaterThanOrEqual(aa);
    expect(contrastRatio(cssVariable(css, '--ncal-muted'), '#ffffff')).toBeGreaterThanOrEqual(aa);
    expect(contrastRatio(cssVariable(css, '--ncal-faint'), '#ffffff')).toBeGreaterThanOrEqual(aa);
    expect(contrastRatio(cssVariable(css, '--ncal-muted', '[data-theme="dark"]'), '#202020')).toBeGreaterThanOrEqual(aa);
    expect(contrastRatio(cssVariable(css, '--ncal-faint', '[data-theme="dark"]'), '#202020')).toBeGreaterThanOrEqual(aa);
  });

  it('renders event details through the shared centered modal', () => {
    const panel = read('src/app/dashboard/calendar/_components/EventDetailPanel.tsx');
    const css = read('src/app/styles/calendar-notion.css');

    expect(panel).toContain("import FormPromptModal from '@/components/FormPromptModal'");
    expect(panel).toContain('<FormPromptModal');
    expect(panel).toContain('open={open}');
    expect(panel).not.toContain('className="ncal-panel open"');
    expect(panel).not.toContain('<label>');
    expect(css).not.toContain('.ncal-panel {');
  });

  it('guards calendar shortcuts while dialogs or calendar modals are open', () => {
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(page).toContain("document.querySelector('[role=\"dialog\"]')");
    expect(page).toContain('isBookingFormOpen');
    expect(page).toContain('isEventModalOpen');
    expect(page).toContain('if (isAnyDialogOpen || isBookingFormOpen || isEventModalOpen)');
  });

  it('wires mobile hall and status filters through the shared modal shell', () => {
    const page = read('src/app/dashboard/calendar/page.tsx');
    const header = read('src/app/dashboard/calendar/_components/CalendarHeader.tsx');
    const sheet = read('src/app/dashboard/calendar/_components/MobileFilterSheet.tsx');

    expect(sheet).toContain("import FormPromptModal from '@/components/FormPromptModal'");
    expect(sheet).toContain('<FormPromptModal');
    expect(sheet).toContain('groups.map');
    expect(sheet).toContain('statusCounts.map');
    expect(page).toContain("import MobileFilterSheet from './_components/MobileFilterSheet'");
    expect(page).toContain('filterSheetOpen');
    expect(page).toContain('onToggleFilters={isMobile ? () => setFilterSheetOpen(true) : undefined}');
    expect(page).toContain('mobile={isMobile}');
    expect(page).toContain('setFilterSheetOpen(true)');
    expect(page).toContain('aria-label="Filters"');
    expect(header).toContain('onToggleFilters');
    expect(header).toContain('Filters');
    expect(header).toContain('mobile = false');
    expect(header).toContain("mobile ? (['month'] as CalendarViewMode[]) : VIEWS");
  });

  it('keeps calendar controls touch-friendly and labelled', () => {
    const css = read('src/app/styles/calendar-notion.css');
    const header = read('src/app/dashboard/calendar/_components/CalendarHeader.tsx');
    const sidebar = read('src/app/dashboard/calendar/_components/CalendarSidebar.tsx');
    const sheet = read('src/app/dashboard/calendar/_components/MobileFilterSheet.tsx');
    const month = read('src/app/dashboard/calendar/_components/MonthBoard.tsx');
    const mini = read('src/app/dashboard/calendar/_components/MiniCalendar.tsx');

    expect(css).toMatch(/@media \(max-width: 859px\)[\s\S]*\.ncal-t-search\s*\{[\s\S]*height:\s*44px;[\s\S]*font-size:\s*16px;/);
    expect(css).toMatch(/@media \(max-width: 859px\)[\s\S]*\.ncal-t-btn[\s\S]*min-width:\s*44px;[\s\S]*min-height:\s*44px;/);
    expect(css).toMatch(/@media \(max-width: 859px\)[\s\S]*\.ncal-cal-picker \.ncal-sc-grid \.ncal-sc-day\s*\{[\s\S]*min-width:\s*44px;[\s\S]*min-height:\s*44px;/);
    expect(css).toMatch(/@media \(max-width: 859px\)[\s\S]*\.ncal-cal-picker \.ncal-sc-nav button\s*\{[\s\S]*width:\s*44px;[\s\S]*height:\s*44px;/);
    expect(header).toContain('<h1 className="sr-only">Calendar</h1>');
    expect(header).toContain('aria-hidden="true"');
    expect(sidebar).toContain('role="checkbox"');
    expect(sidebar).toContain('aria-checked={isOn(hall.id)}');
    expect(sidebar).toContain('aria-checked={selectedStatuses.has(status.key)}');
    expect(sheet).toContain('role="checkbox"');
    expect(sheet).toContain('aria-checked={isHallOn(hall.id)}');
    expect(sheet).toContain('aria-checked={selectedStatuses.has(status.key)}');
    expect(month).toContain('formatMonthAriaDate');
    expect(month).toContain('aria-label={`Open ${formatMonthAriaDate(day)}`}');
    expect(month).toContain('aria-label={`${formatMonthAriaDate(day)}: ${line.title}, ${line.status}`}');
    expect(month).toContain('aria-label={`${hidden} more events on ${formatMonthAriaDate(day)}`}');
    expect(read('src/app/dashboard/calendar/_components/MobileMonthAgenda.tsx')).toContain('aria-label={`Open ${formatMonthAriaDate(day)}`}');
    expect(mini).toContain('aria-hidden="true"');
  });

  it('uses shared calendar copy for CTAs and status labels', () => {
    const copy = read('src/app/dashboard/calendar/copy.ts');
    const header = read('src/app/dashboard/calendar/_components/CalendarHeader.tsx');
    const agenda = read('src/app/dashboard/calendar/_components/MobileMonthAgenda.tsx');

    expect(copy).toContain('CTA_NEW_BOOKING');
    expect(copy).toContain('STATUS_LABEL');
    expect(header).toContain('aria-label={CTA_NEW_BOOKING}');
    expect(agenda).toContain('STATUS_LABEL[statusClass(line.status)]');
    expect(agenda).toContain("event{agenda.length !== 1 ? 's' : ''}");
    expect(agenda).toContain('No events on this day');
  });

  it('marks disabled toolbar buttons and exposes mobile picker expanded state', () => {
    const css = read('src/app/styles/calendar-notion.css');
    const header = read('src/app/dashboard/calendar/_components/CalendarHeader.tsx');
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(css).toContain('.ncal-t-btn:disabled { opacity: 0.5; cursor: not-allowed; }');
    expect(header).toContain('pickerOpen');
    expect(header).toContain('aria-expanded={pickerOpen}');
    expect(page).toContain('pickerOpen={pickerOpen}');
  });

  it('forces narrow-screen calendar navigation to the month agenda', () => {
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(page).toContain("if (isMobile && viewMode !== 'month')");
    expect(page).toContain('const setCalendarViewMode = useCallback');
    expect(page).toContain("setViewMode(isMobile ? 'month' : mode)");
    expect(page).toContain('onViewMode={setCalendarViewMode}');
    expect(page).toContain("setViewMode(isMobile ? 'month' : 'day')");
  });

  it('does not retain dormant source filter state in the calendar page', () => {
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(page).not.toContain('sourceFilter');
    expect(page).not.toContain('setSourceFilter');
    expect(page).not.toContain('EventSourceFilter');
  });

  it('uses a Notion-shaped toolbar and month grid for the calendar page skeleton', () => {
    const skeletons = read('src/components/Skeletons.tsx');

    expect(skeletons).toContain('className="ncal-toolbar"');
    expect(skeletons).toContain('className="ncal-board"');
    expect(skeletons).toContain('className="ncal-month-col-headers"');
    expect(skeletons).toContain('className="ncal-month-grid"');
    expect(skeletons).toContain('className="ncal-month-day"');
    expect(skeletons).not.toContain('<CalendarSkeleton />');
  });

  it('documents the calendar Notion token override intent', () => {
    const css = read('src/app/styles/calendar-notion.css');

    expect(css).toContain('intentionally override the app tokens');
    expect(css).toContain('Notion-style palette');
  });

  it('disables the board while placeholder range data is showing', () => {
    const page = read('src/app/dashboard/calendar/page.tsx');
    const css = read('src/app/styles/calendar-notion.css');

    expect(page).toContain('const showStaleOverlay = calendarQuery.isFetching && calendarQuery.isPlaceholderData;');
    expect(page).toContain("className={`ncal-board${showStaleOverlay ? ' stale' : ''}`}");
    expect(page).toContain('aria-busy={showStaleOverlay || loading}');
    expect(css).toContain('.ncal-board.stale {');
    expect(css).toContain('pointer-events: none;');
  });

  it('lets MiniCalendar jump by month/year via the title control', () => {
    const css = read('src/app/styles/calendar-notion.css');
    const mini = read('src/app/dashboard/calendar/_components/MiniCalendar.tsx');
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(mini).toContain('onJumpToMonth');
    expect(page).toContain('onJumpToMonth');
    expect(mini).toContain('DayPicker');
    expect(mini).toContain('react-day-picker');
    expect(mini).toContain('buildMiniCalendarClassNames');
    expect(mini).toContain('Choose month and year');
    expect(mini).toContain("useState<MiniPickerMode>('days')");
    expect(mini).toContain("setMode('months')");
    expect(mini).toContain("setMode('years')");
    expect(mini).toContain('MONTH_SHORT_LABELS');
    expect(mini).toContain('buildYearWindow');
    expect(mini).toContain('jumpToMonth');
    expect(mini).toContain("'Previous month'");
    expect(mini).toContain("'Next month'");
    expect(mini).toContain("'Previous year'");
    expect(mini).toContain("'Next year'");
    expect(mini).toContain("'Previous years'");
    expect(mini).toContain("'Next years'");
    expect(mini).toContain('role="group" aria-label="Choose month"');
    expect(mini).toContain('role="group" aria-label="Choose year"');
    expect(mini).not.toContain('role="listbox"');
    expect(mini).not.toContain('role="option"');
    expect(mini).not.toContain('aria-selected');
    expect(mini).toContain("if (mode === 'days') return;");
    expect(mini).toContain("if (document.querySelector('[role=\"dialog\"]')) return;");
    expect(mini).toContain("if (event.key === 'Escape')");
    expect(css).toMatch(/@media \(max-width: 859px\)[\s\S]*\.ncal-sc-month,\s*\.ncal-sc-year\s*\{[\s\S]*min-width:\s*44px;[\s\S]*min-height:\s*44px;[\s\S]*height:\s*44px;/);
    expect(css).toContain('.rdp-ncal .ncal-sc-months-wrap');
    expect(css).toMatch(/\.rdp-ncal \.ncal-sc-grid\s*\{[^}]*minmax\(0,\s*1fr\)/);
    expect(css).toMatch(/\.rdp-ncal\.ncal-sc-days\s*\{[^}]*width:\s*100%/);
  });

  it('fits desktop month grid to the board without vertical scroll', () => {
    const css = read('src/app/styles/calendar-notion.css');
    const page = read('src/app/dashboard/calendar/page.tsx');
    const monthBoard = read('src/app/dashboard/calendar/_components/MonthBoard.tsx');

    expect(css).toContain('.ncal-main {');
    expect(css).toMatch(/\.ncal-main\s*\{[^}]*min-height:\s*0/);
    expect(css).toContain('.ops-replica .ops-content-wrapper:has(.ncal-root--month-fit)');
    expect(css).toContain('.ncal-root--month-fit .ncal-board');
    expect(css).toMatch(/\.ncal-root--month-fit\s+\.ncal-board\s*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(
      /\.ncal-root--month-fit\s+\.ncal-month-grid\s*\{[^}]*minmax\(0,\s*1fr\)/
    );
    expect(css).toMatch(/calc\(100dvh - var\(--ncal-board-offset/);
    expect(css).toMatch(/\.ncal-root--month-fit\s+\.ncal-board\s*\{[^}]*flex:\s*none/);
    expect(css).toMatch(/min-height:\s*calc\(100dvh - var\(--ncal-board-offset/);
    expect(css).toContain('.ncal-root--month-fit .ncal-sidebar');
    expect(css).toContain('align-items: stretch');
    expect(page).toContain('ncal-root--month-fit');
    expect(page).toContain("viewMode === 'month' && !isMobile");
    expect(page).toContain('fitViewport={monthFit}');
    expect(monthBoard).toContain('--ncal-board-offset');
  });

  it('supports a collapsible desktop sidebar slim rail', () => {
    const sidebar = read('src/app/dashboard/calendar/_components/CalendarSidebar.tsx');
    const css = read('src/app/styles/calendar-notion.css');
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(sidebar).toContain('collapsed');
    expect(sidebar).toContain('onToggleCollapsed');
    expect(sidebar).toContain('aria-expanded={!collapsed}');
    expect(sidebar).toContain('ncal-sidebar-rail');
    expect(css).toContain('.ncal-sidebar.collapsed');
    expect(css).toMatch(/\.ncal-sidebar\.collapsed\s*\{[^}]*width:\s*44px/);
    expect(css).toMatch(/\.ncal-sidebar\s*\{[^}]*transition:[^;]*width/);
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(page).toContain('sidebarCollapsed');
    expect(page).toContain('setSidebarCollapsed');
  });

  it('supports banquet-level hall group toggles with partial selection state', () => {
    const sidebar = read('src/app/dashboard/calendar/_components/CalendarSidebar.tsx');
    const sheet = read('src/app/dashboard/calendar/_components/MobileFilterSheet.tsx');
    const css = read('src/app/styles/calendar-notion.css');
    const page = read('src/app/dashboard/calendar/page.tsx');

    expect(page).toContain('toggleBanquetGroup');
    expect(page).toContain('toggleBanquetGroup={toggleBanquetGroup}');
    expect(sidebar).toContain('toggleBanquetGroup');
    expect(sidebar).toContain('ncal-banquet-li');
    expect(sidebar).toContain("aria-checked={allOn ? true : someOn ? 'mixed' : false}");
    expect(sidebar).toContain('ncal-hall-li');
    expect(sheet).toContain('toggleBanquetGroup');
    expect(sheet).toContain('ncal-banquet-li');
    expect(css).toContain('.ncal-li .ncal-ck.partial');
    expect(css).toContain('.ncal-hall-li');
  });
});
