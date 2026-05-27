import type { Booking } from "@/lib/mock/types";

// Two bookings conflict if they share at least one hall and their time ranges overlap.
export function bookingsConflict(a: Booking, b: Booking): boolean {
  if (a.id === b.id) return false;
  if (a.status === "cancelled" || b.status === "cancelled") return false;
  const sharedHall = a.hallIds.some((h) => b.hallIds.includes(h));
  if (!sharedHall) return false;
  return a.start < b.end && b.start < a.end;
}

export function detectConflicts(bookings: Booking[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (let i = 0; i < bookings.length; i++) {
    for (let j = i + 1; j < bookings.length; j++) {
      if (bookingsConflict(bookings[i], bookings[j])) {
        const a = bookings[i].id, b = bookings[j].id;
        if (!map.has(a)) map.set(a, []);
        if (!map.has(b)) map.set(b, []);
        map.get(a)!.push(b);
        map.get(b)!.push(a);
      }
    }
  }
  return map;
}

export function statusToken(s: Booking["status"]) {
  switch (s) {
    case "confirmed": return { color: "var(--confirmed)", label: "CONFIRMED" };
    case "pencil": return { color: "var(--pencil)", label: "PENCIL" };
    case "quotation": return { color: "var(--quotation)", label: "QUOTATION" };
    case "enquiry": return { color: "var(--enquiry)", label: "ENQUIRY" };
    case "cancelled": return { color: "var(--faint)", label: "CANCELLED" };
  }
}
