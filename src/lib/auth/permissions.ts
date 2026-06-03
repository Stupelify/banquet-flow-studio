/**
 * Permission catalog + role presets for the cosmetic RBAC layer.
 *
 * Permissions are namespaced `<resource>.<action>`. A role is a labelled set
 * of permissions. `can(user, perm)` is the only gate components should call;
 * nav, dialogs, and action buttons all branch on it.
 *
 * Auth is intentionally local-only for now (see `src/lib/auth/store.ts`),
 * structured so a real `/api/me` + `/api/roles` can drop in later without
 * touching component code.
 */

export type Permission =
  | "bookings.read" | "bookings.write" | "bookings.delete" | "bookings.finalize" | "bookings.partyover"
  | "payments.read" | "payments.write"
  | "customers.read" | "customers.write" | "customers.delete"
  | "enquiries.read" | "enquiries.write" | "enquiries.convert"
  | "venues.read" | "venues.write"
  | "menu.read" | "menu.write"
  | "reports.read"
  | "activity.read"
  | "settings.read" | "settings.write"
  | "users.manage" | "roles.manage";

export const ALL_PERMISSIONS: { key: Permission; group: string; label: string }[] = [
  { key: "bookings.read",       group: "Bookings",  label: "View bookings" },
  { key: "bookings.write",      group: "Bookings",  label: "Create / edit bookings" },
  { key: "bookings.delete",     group: "Bookings",  label: "Delete bookings" },
  { key: "bookings.finalize",   group: "Bookings",  label: "Finalize (snapshot version)" },
  { key: "bookings.partyover",  group: "Bookings",  label: "Mark party over / settle" },
  { key: "payments.read",       group: "Payments",  label: "View payment ledger" },
  { key: "payments.write",      group: "Payments",  label: "Record / void payments" },
  { key: "customers.read",      group: "Customers", label: "View customers" },
  { key: "customers.write",     group: "Customers", label: "Create / edit customers" },
  { key: "customers.delete",    group: "Customers", label: "Delete customers" },
  { key: "enquiries.read",      group: "Enquiries", label: "View enquiry pipeline" },
  { key: "enquiries.write",     group: "Enquiries", label: "Create / edit enquiries" },
  { key: "enquiries.convert",   group: "Enquiries", label: "Convert enquiry to booking" },
  { key: "venues.read",         group: "Venues",    label: "View venues / halls" },
  { key: "venues.write",        group: "Venues",    label: "Manage venues / halls" },
  { key: "menu.read",           group: "Menu",      label: "View menus & items" },
  { key: "menu.write",          group: "Menu",      label: "Manage menus & items" },
  { key: "reports.read",        group: "Reports",   label: "View reports" },
  { key: "activity.read",       group: "Activity",  label: "View audit log" },
  { key: "settings.read",       group: "Settings",  label: "View settings" },
  { key: "settings.write",      group: "Settings",  label: "Change settings" },
  { key: "users.manage",        group: "Admin",     label: "Manage users" },
  { key: "roles.manage",        group: "Admin",     label: "Manage roles & permissions" },
];

export const PERMISSION_GROUPS = Array.from(new Set(ALL_PERMISSIONS.map((p) => p.group)));

export const PRESET_ROLES: { id: string; name: string; description: string; permissions: Permission[] }[] = [
  {
    id: "role-admin",
    name: "Administrator",
    description: "Full access to everything, including users & roles.",
    permissions: ALL_PERMISSIONS.map((p) => p.key),
  },
  {
    id: "role-manager",
    name: "Manager",
    description: "Full operational access; cannot manage users or roles.",
    permissions: ALL_PERMISSIONS.map((p) => p.key).filter((p) => p !== "users.manage" && p !== "roles.manage"),
  },
  {
    id: "role-booking",
    name: "Booking Manager",
    description: "Bookings, payments, customers, enquiries.",
    permissions: [
      "bookings.read", "bookings.write", "bookings.finalize", "bookings.partyover",
      "payments.read", "payments.write",
      "customers.read", "customers.write",
      "enquiries.read", "enquiries.write", "enquiries.convert",
      "venues.read", "menu.read", "reports.read",
    ],
  },
  {
    id: "role-reception",
    name: "Reception",
    description: "Front-desk: read bookings, record payments, capture enquiries.",
    permissions: [
      "bookings.read", "payments.read", "payments.write",
      "customers.read", "customers.write",
      "enquiries.read", "enquiries.write",
      "venues.read", "menu.read",
    ],
  },
  {
    id: "role-accounts",
    name: "Accountant",
    description: "Read bookings, manage payments, view reports & activity.",
    permissions: [
      "bookings.read", "payments.read", "payments.write",
      "customers.read", "reports.read", "activity.read",
    ],
  },
  {
    id: "role-viewer",
    name: "Viewer",
    description: "Read-only across the platform.",
    permissions: ["bookings.read", "payments.read", "customers.read", "enquiries.read", "venues.read", "menu.read", "reports.read"],
  },
];
