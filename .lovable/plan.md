## Scope

You uploaded a full export of the real database (23 tables, ~11.4K rows) and asked me to (a) replace the mock data with this real data and (b) implement the create/edit forms and other interactive functionality that the original Express app has. This is multi-day work; here's how I'll execute it in tight, shippable phases so you can review as we go.

## Phase 1 — Real data foundation (this turn)

1. **Parse the CSV** (`/tmp/all_tables_unified.csv`) into a typed JSON seed at `src/lib/api/seed.json`. Normalize Postgres flavor: `"t"/"f"` → `boolean`, `"{15}"` arrays → `string[]`, empty strings → `null`, money strings → numbers (keeping the dual `xxx`/`xxxValue` shape your client already uses).
2. **Expand `src/lib/api/types.ts`** to cover every real entity actually present: `Banquet`, `Hall`, `MealSlot`, `ItemType`, `Item`, `TemplateMenu(+items)`, `BookingMenu(+items)`, `BookingPack`, `BookingHall`, `BookingPayment`, `Booking`, `Customer`, `User`, `Role`, `Permission`, `RolePermission`, `UserRole`, `Session`, `AuditLog`, `FinalizedBooking`.
3. **Rewrite `src/lib/api/mock.ts`** as a hydration layer: load the seed, build indexes (e.g. `bookingById`, `customerById`, `packsByBooking`, `paymentsByBooking`, `menuItemsByMenu`), and re-derive the money stack (`bookingMoney`) from real values where present, falling back to computation when historic rows are partial.
4. **Drop the legacy `src/lib/mock/*`** — every screen will import from `src/lib/api/*`. Old screens will keep compiling because the surface stays the same name where overlap exists.

## Phase 2 — Reactive store + CRUD plumbing

5. Add `src/lib/api/store.ts` — a Zustand store seeded from the real data, persisted to `localStorage` (`bika.store.v1`). Exposes `create*`, `update*`, `delete*`, `addPayment`, `addAuditLog`, `versionBooking` (clones with `isLatest=false`, increments `versionNumber`) etc., mirroring the Express endpoints.
6. Hook every list/detail screen to the store via selectors instead of importing arrays directly.

## Phase 3 — Forms (react-hook-form + zod, shadcn `Form` primitives)

One canonical form per entity, opened in a `Sheet` (drawer) on desktop and full-screen on mobile. Validation matches the server schemas inferred from the seed.

- **Booking form** (`/bookings` + `/calendar` "+ New"): customer picker (with inline "create new"), function name/type, date+time range, hall multiselect (with conflict warning), expected guests, meal packs editor (slot, menu, plates, rate, setup, hall, time), extras, discount1 (amt) + discount2 (%) + settlement discount, tax %, advance required, notes/internal notes. Save → derives totals, writes audit log.
- **Customer form**: identity, two phones (with country code + E164), WhatsApp toggle ("same as phone"), full address (street1/2, city, state, pincode, country), community/caste, priority, rating, DOB, anniversary, occupation, company, GST/PAN/Aadhaar, socials, referred-by picker, notes.
- **Enquiry form**: customer picker, function type/date/guests, hall(s), stage select, est value, notes.
- **Payment form** (inside booking drawer + `/payments`): amount, method, reference, narration, payment date, clearing date, received-by user.
- **Hall form** (`/venues`): banquet picker, name, capacity, floating capacity, floor, base price, amenities, isActive.
- **Banquet form**: name, location, address, city/state/pincode, phone, email, facilities.
- **Menu Template form** (`/menu`): name, description, meal slot, rate/plate, setup cost, items repeater (item picker + qty).
- **Item form**: type picker, name, points, isVeg, isActive, cost.
- **Settings**: user create/edit, role assignment (uses `users`/`roles`/`user_roles`/`role_permissions`).

Every save writes to the store **and** appends an `audit_logs` row so `/activity` reflects it live.

## Phase 4 — Page interactivity

- **Calendar**: drag-create slot → opens Booking form prefilled; click event → opens drawer.
- **Bookings list**: filter (status, venue, hall, date range, source), bulk-cancel, "New version" action that clones the booking.
- **Customers**: search, sort, merge-duplicate hint, drill-in shows booking history + LTV.
- **Enquiries**: kanban by stage with drag-between-columns (status updates store).
- **Payments**: filter by date/method, "Add payment" opens booking-scoped form.
- **Reports**: real charts off the seed (monthly revenue, hall utilization, status mix).
- **Activity**: live `audit_logs` feed (filter by user/action/resource).
- **Settings**: theme, currency, working users + role management.
- **Login**: cosmetic only — sets a "current user" in the store from the real `users` table, no real auth.

## Technical notes

- No backend wiring (per your earlier instruction); everything is local + persisted to `localStorage`. A single `RESET_SEED` button in Settings re-hydrates from the bundled seed.
- Real IDs (UUIDs and the legacy integer IDs from `bookings.customerId`) are preserved exactly so the data matches what your Express API would return.
- Money fields keep the dual representation (`advanceRequired` string + `advanceRequiredValue` number).
- Dates parsed as UTC to avoid TZ drift between seed and UI.
- I'll wire `react-hook-form` + `zod` + the existing shadcn `Form`, `Sheet`, `Select`, `Combobox`, `Calendar`, `Popover` components. No new heavy deps.

## Delivery order

I'll do Phase 1 in **this turn** (you'll see real bookings/customers/halls in every list immediately). Phase 2 next turn. Phases 3–4 then ship screen-by-screen — Booking + Customer forms first since those unblock the most demos. Tell me if you want a different order or want me to skip any screen.