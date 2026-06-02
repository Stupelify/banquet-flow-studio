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
  };
};

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

    // Apply edits (the edits store holds canonical Booking; we map only the user-editable fields)
    const merged: Booking[] = base.map((b) => {
      const e = edits[b.id] as Partial<Booking & {
        functionName: string; functionType: string; expectedGuests: number; confirmedGuests: number;
        notes: string; hallIds: string[]; status: Booking["status"];
      }> | undefined;
      const extraPayments = paymentsByBooking.get(b.id) ?? [];
      const payments = [...b.payments.filter((p) => !delPayments.has(p.id)), ...extraPayments].sort((a, c) => +c.date - +a.date);
      if (!e) return { ...b, payments };
      return {
        ...b,
        ...("functionName" in e ? { functionName: String(e.functionName ?? b.functionName) } : {}),
        ...("functionType" in e ? { functionType: String(e.functionType ?? b.functionType) } : {}),
        ...("expectedGuests" in e ? { expectedGuests: Number(e.expectedGuests ?? b.expectedGuests) } : {}),
        ...("confirmedGuests" in e ? { confirmedGuests: Number(e.confirmedGuests ?? b.confirmedGuests) } : {}),
        ...("notes" in e ? { notes: e.notes as string | undefined } : {}),
        ...("hallIds" in e && Array.isArray(e.hallIds) ? { hallIds: e.hallIds } : {}),
        ...("status" in e && e.status ? { status: e.status } : {}),
        payments,
      };
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
    const additions = added.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      altPhone: c.alternatePhone ?? undefined,
      email: c.email ?? "—",
      community: c.caste ?? undefined,
      city: c.city ?? "—",
      dob: c.dateOfBirth ? new Date(c.dateOfBirth) : undefined,
      anniversary: c.anniversary ? new Date(c.anniversary) : undefined,
      occupation: c.occupation ?? undefined,
      company: c.companyName ?? undefined,
      gst: c.gstNumber ?? undefined,
      pan: c.panNumber ?? undefined,
      priority: (c.priority === 1 ? "VIP" : c.priority === 2 ? "High" : "Normal") as Customer["priority"],
      rating: Math.min(5, Math.max(0, Number(c.rating ?? 0))),
      visitCount: c.visitCount,
      referredBy: c.referredById ?? undefined,
      referrals: (c.referrals ?? []).map((r) => r.id),
      notes: c.notes ?? undefined,
    } satisfies Customer));
    return [...additions, ...merged];
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
