# Bika Banquet — Operations Console Rebuild

Direction: **Terminal Ops Console**. Dense, monochrome-with-signal-color, IBM Plex Sans + Plex Mono, hairline borders, status as color/pattern language, conflict pulse. Light + dark themes both ship.

## Design tokens (locked across the app)

- **Type**: IBM Plex Sans (UI), IBM Plex Mono (all numbers, IDs, times, currency, status chips). Tabular numerals everywhere.
- **Scale**: 10/11/12/14/18/24px. Default body 12px. Numbers 11px mono.
- **Color (dark)**: bg `#09090b`, surface `#121214`, border `#27272a`, muted `#71717a`, accent `#3b82f6`, confirmed `#10b981`, pencil `#eab308` (with 45° hatch fill), conflict `#ef4444` (with pulse outline), quotation `#a855f7`, enquiry `#71717a`, google `#06b6d4` (dashed border).
- **Color (light)**: bg `#fafafa`, surface `#ffffff`, border `#e4e4e7`, same accent/status hues with adjusted lightness for AA.
- **Surfaces**: dividers, not cards. Border radius 2px max. No shadows except bottom-sheet/drawer.
- **Density**: 28–32px row height for tables, 8px gutter, 12px section padding.
- **Motion**: 120ms ease for drawers, 2s pulse for conflict outlines, nothing else.
- **Iconography**: Lucide at 14px, stroke 1.5, mono color only.

## Information architecture

```
[12px top nav: BIKA_OPS / Timeline · Bookings · Customers · Enquiries · Venues · Menu · Payments · Reports · Activity · Settings   |  ⌘K  ·  alerts·  user]
[main pane — view-specific, full-bleed, no inner card]
[optional right drawer for detail / bottom sheet on mobile]
```

No left sidebar. Top nav is one row, mono labels, current view underlined. ⌘K palette is the primary navigator and jump-to-anything.

## Routes (TanStack Start, file-based)

- `/` → redirect to `/calendar`
- `/calendar` — hall-board (default), `?view=month|week|day|board`
- `/bookings` — master-detail list, `/bookings/$id` opens the right pane
- `/bookings/new`, `/bookings/$id/edit`
- `/customers`, `/customers/$id`
- `/enquiries`, `/enquiries/$id`
- `/venues` (banquets + halls)
- `/menu` (items, templates, ingredients, vendors as tabs)
- `/payments`
- `/reports`
- `/activity`
- `/settings` (layout with `profile`, `users`, `roles`, `integrations`, `theme` children)
- `/login`

Each route has its own `head()` with title + meta.

## The Calendar (the hero — built first, built hardest)

**Hall-Board view (default, desktop):**
- Left rail (240px, collapsible): per-venue group → per-hall row with utilization micro-bar + count, status filter, source filter (in-app / Google), date jumper.
- Header: 32px row of hour ticks (08:00 → 02:00 next-day), meal-slot sub-bands shaded.
- Body: each hall = one row, 56px tall. Event blocks render absolutely positioned with:
  - Confirmed: solid bg with 2px accent left border + customer + time + guest count + ₹ short.
  - Pencil: hatched fill, pencil-color border, "PENCIL · EXP 4h 12m" countdown chip.
  - Quotation: dotted border, quotation color.
  - Enquiry: muted, ghost fill.
  - Google: dashed cyan border, no fill.
  - **Conflict**: every event on a row with an overlap gets the conflict outline-pulse + the hall name in the rail turns red with "! CONFLICT" + a sticky banner at top of grid summarizing all conflicts of the day.
- Hover event → inline tooltip with money stack mini (total / advance / due) and meal pack list.
- Click event → right drawer (380px) with full booking detail + quick actions (mark paid, edit, print day-sheet, resolve conflict).
- Click empty cell → new booking drafted at that hall/time.
- Keyboard: `t` today, `d/w/m/b` switch view, `j/k` next/prev day, `/` search, `n` new, `esc` close drawer.

**Month view**: 7-col grid, each day a compact stack of up to 4 event chips (mono, status-colored) + "+N more"; day cell shows venue-occupancy mini-bar in the corner and ₹ revenue total mono.

**Week view**: 7 columns × hour rows, same chip language as month but stretched.

**Day view**: combination — single-day hall-board on top half, agenda list on bottom half.

**Mobile calendar**: agenda-list day view by default. Each row: time strip (start/end mono) | hall + customer + guest count + ₹ + status pill. Sticky day header at top, swipe horizontally between days. Tap row → bottom sheet (matches the prototype). Conflicts get a red left border + persistent banner at top. A floating "Board" button switches to a horizontally-scrollable mini hall-board.

**Printable day-sheet**: stripped-down route `/calendar/print?date=…` — pure black on white, table per hall, designed for A4.

## Bookings

**Desktop**: 380px master list (search, status filter chips) | flex-1 detail. List row: `#BK-id · dd/mm/yyyy · customer (truncate) · primary hall · status chip · ₹ total · paid %`. Selected row gets accent left border + tinted bg. Detail pane has tabs: Overview · Money · Meal Packs · Halls · Payments · Versions · Notes.

Money stack (in the detail) is a fixed-width mono ledger with: subtotal → discount 1 → discount 2 → settlement discount → tax → grand total (bold) → advance required vs received with progress bar → balance due (red if >0).

Inline edit on the list: click status chip to change; click ₹ to open the money editor inline.

**Mobile**: list-only, tap → full-page detail (not drawer, too dense). Sticky header carries customer + status; tab strip below for the same tabs; quick-actions in a bottom action bar (thumb-reach: Pay · Edit · Call · More).

## Other screens (sketch — same density rules)

- **Dashboard** = a single-screen ops board: top row of mono KPIs as text-only (no cards), then a 2-column grid of "Today" (hall-board strip), "Alerts" (overdue, expiring pencils, conflicts), "Pipeline" (enquiry → quote → pencil → confirmed funnel), "Cash" (last 7d payments sparkline).
- **Customers**: master-detail; profile is a 3-column attribute grid (no white space between rows), with referral-chain visualizer + booking timeline.
- **Enquiries**: kanban-style 4-column board (Lead / Quotation / Pencil / Won) on desktop, swipeable column on mobile.
- **Venues, Menu, Payments, Reports, Activity, Settings**: same hairline-divider, hairline-table treatment.
- **Login**: centered mono panel, terminal feel.
- **Command palette**: ⌘K opens centered modal with fuzzy search across customers, bookings, halls, settings.

## Implementation plan (build order)

1. **Tokens + shell**: rewrite `src/styles.css` with the Terminal palette (light + dark via `.dark`), install IBM Plex Sans + Mono via `@fontsource`, set tabular-nums utility, hairline border defaults, ⌘K shortcut, theme toggle.
2. **Root layout + top nav** in `src/routes/__root.tsx` (keep `<Outlet/>` rule intact). Add command palette as a global portal.
3. **Mock data layer**: `src/lib/mock/` — halls (3 venues × ~6 halls), bookings (~80 across next 60 days with 3 conflicts + 6 pencils + Google overlays), customers (~40), enquiries, payments. Realistic Indian names, ₹ in lakhs, dd/mm/yyyy, multi-hall multi-pack.
4. **₹ + date formatters**: `formatINR` (lakh/crore grouping, short `12.5 L` variant), `formatDate` dd/mm/yyyy, time `HH:mm`.
5. **Calendar — Hall Board** (the hero): left rail, time header, hall rows, event-block renderer with status variants + hatch + pulse, conflict detector, drawer.
6. **Calendar — Month / Week / Day** views sharing the same event-chip component.
7. **Mobile calendar** (agenda + bottom sheet + mini-board).
8. **Bookings** list + detail + money stack + payment ledger + version timeline.
9. **Customers, Enquiries (kanban), Venues, Menu, Payments, Reports, Activity, Settings, Login**.
10. **Command palette** wired to all entities.
11. **Print day-sheet** route.
12. **Polish pass**: keyboard shortcuts, focus rings, AA contrast check in both themes, conflict-banner stickiness, empty states.

## Technical notes

- TanStack Start + React + Tailwind v4 (already in template).
- File-based routes under `src/routes/`. No `src/pages/`.
- No backend — all mock data in `src/lib/mock/`. Easy to wire to Cloud later.
- Components in `src/components/` grouped by domain (`calendar/`, `bookings/`, `shared/`).
- Tabular numerals via `font-variant-numeric: tabular-nums` utility class.
- `react-day-picker` skipped — calendar is custom.
- Drawer = simple absolutely-positioned panel with focus trap, no shadcn Sheet (too padded).

## What ships in the first build

Calendar (hall-board + month + week + day + mobile + drawer + conflicts + pencils + Google overlay), Bookings (full master-detail with money stack + payment ledger), Dashboard, Customers list+detail, Enquiries kanban, Login, Command palette, Settings/theme toggle. Venues, Menu deep-catalog, Reports, Activity, Payments global view get scaffolded routes with the same shell and dense placeholders to fill in pass 2.
