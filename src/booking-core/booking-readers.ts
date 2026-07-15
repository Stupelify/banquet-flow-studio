/** Legacy booking row fields for canonical money reads (prefer *Value floats). */
export interface BookingMoneyFields {
  grandTotal?: number | null;
  finalAmountValue?: number | null;
  finalAmount?: string | number | null;
  paymentReceivedAmountValue?: number | null;
  paymentReceivedAmount?: string | number | null;
  dueAmountValue?: number | null;
  dueAmount?: string | number | null;
}

function parseMoney(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Payable grand total (meals net + extras). Prefers finalAmountValue, then grandTotal, then legacy string. */
export function resolvePayableTotal(booking: BookingMoneyFields): number {
  if (booking.finalAmountValue != null && Number.isFinite(booking.finalAmountValue)) {
    return booking.finalAmountValue;
  }
  if (booking.grandTotal != null && Number.isFinite(booking.grandTotal)) {
    return booking.grandTotal;
  }
  return parseMoney(booking.finalAmount) ?? 0;
}

/** Gross payment received (all modes, including uncleared cheques). */
export function resolvePaymentReceivedGross(booking: BookingMoneyFields): number {
  if (
    booking.paymentReceivedAmountValue != null &&
    Number.isFinite(booking.paymentReceivedAmountValue)
  ) {
    return booking.paymentReceivedAmountValue;
  }
  return parseMoney(booking.paymentReceivedAmount) ?? 0;
}

/** Remaining balance due. Prefers dueAmountValue, then legacy string. */
export function resolveDueAmount(booking: BookingMoneyFields): number {
  if (booking.dueAmountValue != null && Number.isFinite(booking.dueAmountValue)) {
    return booking.dueAmountValue;
  }
  return parseMoney(booking.dueAmount) ?? 0;
}

/** Read payable grand total from a save payload (new name + legacy fallbacks). */
export function readPayableGrandTotalInput(source: Record<string, unknown>): number | undefined {
  return (
    parseMoney(source.payableGrandTotalValue) ??
    parseMoney(source.payableGrandTotal) ??
    parseMoney(source.finalAmountValue) ??
    parseMoney(source.finalAmount)
  );
}
