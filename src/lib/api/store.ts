/**
 * Local persisted overlay store.
 *
 * Instead of mutating the bundled seed, we keep three layers per entity:
 *   • additions  — new records created in the app
 *   • edits      — partial patches applied on top of seed/added records
 *   • deletions  — IDs to hide
 * Plus collections for newly-added payments and audit log entries.
 *
 * Selectors merge these layers with the seed (`@/lib/api/data`) so the UI
 * shows live data and stays consistent across reloads (persisted in
 * localStorage). When the real Express API is wired in later, the same
 * action surface (`upsertBooking`, `addPayment`, …) can be swapped to fire
 * HTTP calls without changing component code.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuditLog, BookingPayment, PaymentMethod } from "./types";
import type { Booking, Customer } from "@/lib/mock/types";


type Overlay<T> = {
  added: T[];
  edits: Record<string, Partial<T>>;
  deletedIds: string[];
};

const emptyOverlay = <T,>(): Overlay<T> => ({ added: [], edits: {}, deletedIds: [] });

type State = {
  bookings: Overlay<Booking>;
  customers: Overlay<Customer>;
  payments: { added: BookingPayment[]; deletedIds: string[] };
  auditLogs: AuditLog[];
  currentUser: { id: string; name: string };
};

type Actions = {
  upsertBooking: (b: Booking, opts?: { isNew?: boolean }) => void;
  deleteBooking: (id: string) => void;
  finalizeBooking: (b: Booking, opts: { reason?: string; userName: string }) => void;
  partyOverBooking: (b: Booking, opts: { settlementDiscount?: number; notes?: string; userName: string }) => void;
  upsertCustomer: (c: Customer, opts?: { isNew?: boolean }) => void;
  deleteCustomer: (id: string) => void;
  addPayment: (p: BookingPayment) => void;
  deletePayment: (id: string) => void;
  log: (action: string, resource: string, resourceId: string | null, resourceLabel: string | null, details?: unknown) => void;
  resetAll: () => void;
};

const initial: State = {
  bookings: emptyOverlay<Booking>(),
  customers: emptyOverlay<Customer>(),
  payments: { added: [], deletedIds: [] },
  auditLogs: [],
  currentUser: { id: "local-user", name: "You" },
};

export const useOpsStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial,

      log: (action, resource, resourceId, resourceLabel, details) => {
        const u = get().currentUser;
        const entry: AuditLog = {
          id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: u.id,
          userName: u.name,
          action,
          resource,
          resourceId,
          resourceLabel,
          details: details ?? null,
          ipAddress: null,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ auditLogs: [entry, ...s.auditLogs].slice(0, 500) }));
      },

      upsertBooking: (b, opts) => {
        set((s) => {
          const ov = { ...s.bookings };
          if (opts?.isNew) {
            ov.added = [b, ...ov.added.filter((x) => x.id !== b.id)];
          } else {
            ov.edits = { ...ov.edits, [b.id]: { ...(ov.edits[b.id] ?? {}), ...b } };
          }
          return { bookings: ov };
        });
        get().log(opts?.isNew ? "create" : "update", "booking", b.id, b.functionName);
      },

      deleteBooking: (id) => {
        set((s) => ({
          bookings: {
            ...s.bookings,
            added: s.bookings.added.filter((b) => b.id !== id),
            deletedIds: Array.from(new Set([...s.bookings.deletedIds, id])),
          },
        }));
        get().log("delete", "booking", id, null);
      },

      finalizeBooking: (b, { reason, userName }) => {
        const snapshot = {
          version: (b.versions ?? 0) + 1,
          createdAt: new Date().toISOString(),
          createdBy: userName,
          reason,
          data: JSON.parse(JSON.stringify(b, (_k, v) => (v instanceof Date ? v.toISOString() : v))),
        };
        const next: Booking = {
          ...b,
          versions: (b.versions ?? 0) + 1,
          versionHistory: [snapshot, ...(b.versionHistory ?? [])],
        };
        get().upsertBooking(next);
        get().log("finalize", "booking", b.id, b.functionName, { version: snapshot.version, reason });
      },

      partyOverBooking: (b, { settlementDiscount, notes, userName }) => {
        const next: Booking = {
          ...b,
          partyOver: true,
          partyOverAt: new Date(),
          partyOverNotes: notes,
          settlementDiscount: settlementDiscount ?? b.settlementDiscount ?? 0,
          status: "confirmed",
        };
        get().upsertBooking(next);
        get().log("party_over", "booking", b.id, b.functionName, { settlementDiscount, by: userName });



      upsertCustomer: (c, opts) => {
        set((s) => {
          const ov = { ...s.customers };
          if (opts?.isNew) {
            ov.added = [c, ...ov.added.filter((x) => x.id !== c.id)];
          } else {
            ov.edits = { ...ov.edits, [c.id]: { ...(ov.edits[c.id] ?? {}), ...c } };
          }
          return { customers: ov };
        });
        get().log(opts?.isNew ? "create" : "update", "customer", c.id, c.name);
      },

      deleteCustomer: (id) => {
        set((s) => ({
          customers: {
            ...s.customers,
            added: s.customers.added.filter((c) => c.id !== id),
            deletedIds: Array.from(new Set([...s.customers.deletedIds, id])),
          },
        }));
        get().log("delete", "customer", id, null);
      },

      addPayment: (p) => {
        set((s) => ({ payments: { ...s.payments, added: [p, ...s.payments.added] } }));
        get().log("create", "payment", p.id, `₹${p.amount} via ${p.method}`, { bookingId: p.bookingId });
      },

      deletePayment: (id) => {
        set((s) => ({
          payments: {
            added: s.payments.added.filter((p) => p.id !== id),
            deletedIds: Array.from(new Set([...s.payments.deletedIds, id])),
          },
        }));
        get().log("delete", "payment", id, null);
      },

      resetAll: () => set({ ...initial, currentUser: get().currentUser }),
    }),
    {
      name: "bika-ops-store-v1",
      storage: createJSONStorage(() => localStorage),
      // Bumped 1 → 2 for the multi-pack/billing schema. `migrate` returns the
      // initial state on any older version, silently wiping the old overlay.
      // For manual recovery: localStorage.removeItem("bika-ops-store-v1").
      version: 2,
      migrate: (persisted, fromVersion) => {
        if (fromVersion < 2) {
          return { ...initial, currentUser: (persisted as Partial<State>)?.currentUser ?? initial.currentUser } as State & Actions;
        }
        return persisted as State & Actions;
      },
      partialize: (s) => ({
        bookings: s.bookings,
        customers: s.customers,
        payments: s.payments,
        auditLogs: s.auditLogs,
        currentUser: s.currentUser,
      }),
    },
  ),
);

/* ─────────────────────────── ID helpers ─────────────────────────── */

export const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ─────────────────────── Payment method options ─────────────────── */

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
];
