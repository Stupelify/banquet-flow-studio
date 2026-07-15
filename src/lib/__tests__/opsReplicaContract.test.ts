import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const clientRoot = resolve(__dirname, '../../..');
const read = (path: string) => readFileSync(resolve(clientRoot, path), 'utf8');

// globals.css is an @import manifest; the design-system rules live in
// src/app/styles/*.css. Concatenate them in manifest order for content checks.
const readDesignSystemCss = () => {
  const manifest = read('src/app/globals.css');
  const imports = Array.from(
    manifest.matchAll(/@import '\.\/(styles\/[^']+)';/g),
    (m) => m[1]
  );
  return imports.map((file) => read(`src/app/${file}`)).join('\n');
};

describe('standalone operations UI contract', () => {
  it('uses the fixed top-nav replica shell without changing form modals', () => {
    const layout = read('src/app/dashboard/layout.tsx');
    const modal = read('src/components/FormPromptModal.tsx');
    const dialog = read('src/components/ui/Dialog.tsx');

    expect(layout).toContain('ops-replica dashboard-root');
    expect(layout).toContain('<TopNav');
    // Form modals keep the ops surface marker (master-parity custom portal).
    // Radix Dialog remains available for confirm/sheet/command palette.
    expect(modal).toContain('data-ops-form-surface="true"');
    expect(modal).toContain('createPortal');
    expect(dialog).toContain('data-ops-form-surface="true"');
  });

  it('uses the standalone mobile quick-navigation order', () => {
    // 4 top-level tabs + More. Calendar-first (2026-07-07 decision): Calendar,
    // Bookings, Payments, Insights. Enquiries/Customers live under "More".
    const bottomNav = read('src/components/BottomNav.tsx');
    const calendar = bottomNav.indexOf("name: 'Calendar'");
    const bookings = bottomNav.indexOf("name: 'Bookings'");
    const payments = bottomNav.indexOf("name: 'Payments'");
    const insights = bottomNav.indexOf("name: 'Insights'");

    expect(calendar).toBeGreaterThan(-1);
    expect(calendar).toBeLessThan(bookings);
    expect(bookings).toBeLessThan(payments);
    expect(payments).toBeLessThan(insights);
    expect(bottomNav).not.toContain("name: 'Enquiries'");
    expect(bottomNav).not.toContain("name: 'Customers'");
  });

  it('defines warm-stone compact replica tokens', () => {
    const css = readDesignSystemCss();

    expect(css).toContain('.ops-replica {');
    expect(css).toContain('--bg: #fafaf9;');
    expect(css).toContain('--surface-2: #f5f5f4;');
    expect(css).toContain('--text-1: #1c1917;');
    expect(css).toContain('--replica-radius: 6px;');
  });

  it('uses a top-nav-only full-width desktop shell', () => {
    const layout = read('src/app/dashboard/layout.tsx');

    expect(layout).not.toContain('className="hidden lg:block desktop-sidebar"');
    expect(layout).not.toContain('<header className="dashboard-header">');
    expect(layout).toContain('className="ops-content-wrapper content-wrapper"');
    expect(layout).toContain('className="ops-main has-bottom-nav');
  });

  it('uses the exact compact bookings table interaction contract', () => {
    // The list UI lives in _components/BookingsListSection.tsx; the page owns
    // state (view mode) and the route shell.
    const bookings =
      read('src/app/dashboard/bookings/page.tsx') +
      read('src/app/dashboard/bookings/_components/BookingsListSection.tsx');

    expect(bookings).toContain("useState<'table' | 'cards'>('table')");
    expect(bookings).toContain('className="ops-route ops-list-route"');
    expect(bookings).toContain('className="ops-view-bar"');
    expect(bookings).toContain('className="ops-table-card"');
    expect(bookings).toContain('onClick={() => openEditBooking(booking.id)}');
    expect(bookings).toContain('label="Due"');
    expect(bookings).not.toContain('>Balance</th>');
    expect(bookings).not.toContain('No customers found. Add a customer first, then create booking.');
  });

  it('applies the compact route contract to non-form operational pages', () => {
    const pages = [
      'src/app/dashboard/enquiries/page.tsx',
      'src/app/dashboard/customers/page.tsx',
      'src/app/dashboard/payments/page.tsx',
      'src/app/dashboard/halls/page.tsx',
      'src/app/dashboard/menu/page.tsx',
      'src/app/dashboard/logs/page.tsx',
      'src/app/dashboard/reports/page.tsx',
    ];

    for (const page of pages) {
      expect(read(page)).toContain('ops-route');
    }
  });

  it('defines shared compact route, view-bar, and table primitives', () => {
    const css = readDesignSystemCss();

    expect(css).toContain('.ops-replica .ops-route');
    expect(css).toContain('--ops-gutter: clamp(24px, 2.5vw, 40px);');
    expect(css).toContain('max(20px, var(--safe-left), var(--safe-right))');
    expect(css).toContain('.ops-replica .ops-list-chrome');
    expect(css).toContain('No horizontal padding — tables are full-bleed');
    expect(css).toContain('.ops-replica .ops-view-bar');
    expect(css).toContain('.ops-replica .ops-table-card');
    expect(css).toContain('.ops-replica .ops-click-row');
    expect(css).toContain('.ops-replica .ops-section-tabs');
    expect(css).toContain('.ops-replica .ops-route .data-table tr > :first-child');
    expect(css).toContain('.ops-replica .ops-route .data-table tr > :last-child');
    expect(css).toContain('height: 42px;');
  });

  it('uses compact underline navigation for venue and menu subfields', () => {
    const halls = read('src/app/dashboard/halls/page.tsx');
    const menu = read('src/app/dashboard/menu/page.tsx');
    const menuTabs = read('src/components/MenuSectionTabs.tsx');
    const settings = read('src/app/dashboard/settings/page.tsx');

    expect(halls).toContain('className="ops-section-tabs"');
    expect(menu).toContain('className="ops-section-tabs"');
    expect(menuTabs).toContain('className="ops-section-tabs"');
    expect(settings).toContain('className="ops-section-tabs"');
    expect(menu).toContain(">Menu templates</h2>");
    expect(menuTabs).not.toContain('rounded-xl');
  });

  it('uses compact tables for halls and a compact calendar page shell', () => {
    const halls = read('src/app/dashboard/halls/page.tsx');
    const calendar = read('src/app/dashboard/calendar/page.tsx');

    expect(halls).toContain('className="ops-halls-table data-table"');
    expect(calendar).toContain('ops-calendar-page');
    expect(calendar).toContain('ncal-root');
  });

  it('keeps dashboard controls, pagination, and filters clear of viewport edges', () => {
    const dashboard = read('src/app/dashboard/page.tsx');
    const pagination = read('src/components/TablePagination.tsx');
    const filters = read('src/components/FilterPanel.tsx');
    const css = readDesignSystemCss();

    expect(dashboard).toContain('className="ops-route ops-dashboard-route"');
    expect(dashboard).toContain('className="ops-dashboard-filters');
    expect(pagination).toContain('className="table-pagination');
    expect(filters).toContain('className="filter-panel');
    expect(filters).toContain('className="filter-panel-body');
    expect(css).toContain('.ops-replica .table-pagination');
    expect(css).toContain('.ops-replica .filter-panel-body');
  });
});
