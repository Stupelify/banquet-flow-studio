/**
 * Reactive hooks that produce the screen-facing shapes (`Booking`, `Customer`,
 * `Payment`) by merging the bundled seed (`@/lib/api/data`) with the Zustand
 * overlays. Use these in interactive screens; static `BOOKINGS` etc. exports
 * from `@/lib/mock/data` remain available for read-only legacy screens.
 */
import { useMemo } from "react";
import { useOpsStore } from "@/lib/api/store";
import * as API from "@/lib/api/data";
import { BOOKINGS as SEED_BOOKINGS, CUSTOMERS as SEED_CUSTOMERS, HALLS, VENUES, ENQUIRIES, bookingTotal, customerById as staticCustomerById, hallById as staticHallById, venueById as staticVenueById } from "@/lib/mock/data";
import type { Booking, Customer, Payment } from "@/lib/mock/types";
import type { BookingPayment, PaymentMethod } from "@/lib/api/types";

export { HALLS, VENUES, ENQUIRIES, bookingTotal };
export { staticCustomerById, staticHallById, staticVenueById };

const paymentFromApi = (p: BookingPayment): Payment => {
  const map: Record<PaymentMethod, Payment["method"]> = {
    cash: "Cash", upi: "UPI", card: "Card", cheque: "Cheque", bank_transfer: "Bank Transfer",
  };
  return {
    id: p.id,
    date: new Date(p.paymentDate),
    method: map[p.method] ?? "Cash",
    ref: p.reference ?? undefined,
    amount: p.amount,
    receivedBy: API.userById.get(p.receivedBy)?.name ?? "You",
    clearingDate: p.clearingDate ? new Date(p.clearingDate) : null,
  };
};

/** Fields the booking form / detail screen can edit on the master record. */
type EditablePatch = Partial<Pick<Booking,
  | "functionName" | "functionType" | "expectedGuests" | "confirmedGuests"
  | "notes" | "internalNotes" | "hallIds" | "halls" | "hallCharges"
  | "status" | "packs" | "additionalItems" | "extras"
  | "discountAmount" | "discountPercentage" | "discountAmount2nd" | "discountPercentage2nd"
  | "discount1" | "discount2Pct" | "settlementDiscount" | "taxPct" | "advanceRequired"
  | "isQuotation" | "isPencilBooking" | "pencilExpiresAt" | "secondCustomerId" | "referredById"
  | "start" | "end" | "customerId"
>>;

export function useBookings(): Booking[] {
  const added = useOpsStore((s) => s.bookings.added);
  const edits = useOpsStore((s) => s.bookings.edits);
  const deletedIds = useOpsStore((s) => s.bookings.deletedIds);
  const paymentsAdded = useOpsStore((s) => s.payments.added);
  const paymentsDeleted = useOpsStore((s) => s.payments.deletedIds);

  return useMemo(() => {
    const deleted = new Set(deletedIds);
    const paymentsByBooking = new Map<string, Payment[]>();
    for (const p of paymentsAdded) {
      const arr = paymentsByBooking.get(p.bookingId) ?? [];
      arr.push(paymentFromApi(p));
      paymentsByBooking.set(p.bookingId, arr);
    }
    const delPayments = new Set(paymentsDeleted);

    const base: Booking[] = SEED_BOOKINGS.filter((b) => !deleted.has(b.id));

    // Apply edits — overlay store holds an EditablePatch keyed by booking id.
    const merged: Booking[] = base.map((b) => {
      const e = edits[b.id] as EditablePatch | undefined;
      const extraPayments = paymentsByBooking.get(b.id) ?? [];
      const payments = [...b.payments.filter((p) => !delPayments.has(p.id)), ...extraPayments].sort((a, c) => +c.date - +a.date);
      if (!e) return { ...b, payments };
      const startD = e.start instanceof Date ? e.start : (e.start ? new Date(e.start as unknown as string) : b.start);
      const endD   = e.end   instanceof Date ? e.end   : (e.end   ? new Date(e.end   as unknown as string) : b.end);
      const pencilD = e.pencilExpiresAt instanceof Date ? e.pencilExpiresAt
        : (e.pencilExpiresAt ? new Date(e.pencilExpiresAt as unknown as string) : b.pencilExpiresAt);
      return {
        ...b,
        ...e,
        start: startD,
        end: endD,
        pencilExpiresAt: pencilD,
        payments,
      } as Booking;
    });

    const additions: Booking[] = added.map((b) => ({
      ...b,
      payments: [...(b.payments ?? []), ...(paymentsByBooking.get(b.id) ?? [])],
    }));
    return [...additions, ...merged];
  }, [added, edits, deletedIds, paymentsAdded, paymentsDeleted]);
}

export function useCustomers(): Customer[] {
  const added = useOpsStore((s) => s.customers.added);
  const edits = useOpsStore((s) => s.customers.edits);
  const deletedIds = useOpsStore((s) => s.customers.deletedIds);

  return useMemo(() => {
    const deleted = new Set(deletedIds);
    const base = SEED_CUSTOMERS.filter((c) => !deleted.has(c.id));
    const merged = base.map((c) => {
      const e = edits[c.id] as Partial<Customer> | undefined;
      if (!e) return c;
      return { ...c, ...e } as Customer;
    });
    return [...added, ...merged];

  }, [added, edits, deletedIds]);
}

export function useCustomerLookup() {
  const customers = useCustomers();
  return useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c]));
    return (id: string): Customer => map.get(id) ?? { ...customers[0], id, name: "—" };
  }, [customers]);
}

export function useAuditLogs() {
  return useOpsStore((s) => s.auditLogs);
}
