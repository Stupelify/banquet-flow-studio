/** Payment row fields used for due / credited calculations. */
export interface PaymentCreditRow {
  mode: string;
  amount: string;
  clearingDate: string;
}

/** DB/API payment shape for server-side due calculations. */
export interface StoredPaymentLike {
  method: string;
  amount: number;
  clearingDate?: Date | string | null;
}

/**
 * Cheques count toward due reduction only after a clearing date is entered and
 * that date is today or in the past. Non-cheque payments always count.
 */
export function paymentCountsTowardDue(
  payment: PaymentCreditRow,
  todayStr: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (payment.mode.toLowerCase() !== 'cheque') return true;
  const clearing = payment.clearingDate?.trim();
  if (!clearing) return false;
  return clearing <= todayStr;
}

export function sumPaymentsTowardDue(
  payments: PaymentCreditRow[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): number {
  return payments.reduce((sum, p) => {
    if (!paymentCountsTowardDue(p, todayStr)) return sum;
    const amount = parseFloat(p.amount) || 0;
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

/** Total deposited (all modes), including cheques awaiting clearing date. */
export function sumAllPaymentAmounts(payments: PaymentCreditRow[]): number {
  return payments.reduce((sum, p) => {
    const amount = parseFloat(p.amount) || 0;
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
}

export function mapStoredPaymentToCreditRow(p: StoredPaymentLike): PaymentCreditRow {
  const clearingDate =
    p.clearingDate == null || p.clearingDate === ''
      ? ''
      : typeof p.clearingDate === 'string'
        ? p.clearingDate.slice(0, 10)
        : p.clearingDate.toISOString().slice(0, 10);
  return {
    mode: p.method,
    amount: String(p.amount),
    clearingDate,
  };
}

/** Gross received, credited toward due, and remaining due for a payable total. */
export function resolvePaymentTotals(
  payableGrandTotal: number,
  payments: StoredPaymentLike[],
  todayStr: string = new Date().toISOString().slice(0, 10)
): { grossReceived: number; credited: number; dueAmount: number } {
  const rows = payments.map(mapStoredPaymentToCreditRow);
  const grossReceived = sumAllPaymentAmounts(rows);
  const credited = sumPaymentsTowardDue(rows, todayStr);
  const dueAmount = Math.max(0, payableGrandTotal - credited);
  return { grossReceived, credited, dueAmount };
}
