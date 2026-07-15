import type { PaymentRow } from './types';

export function mapBookingPaymentsFromApi(payments: unknown[]): PaymentRow[] {
  if (!Array.isArray(payments)) return [];

  return payments.map((payment: any) => {
    const mode = payment.method || payment.paymentMethod || '';
    const narration = payment.narration || '';
    const date = payment.paymentDate ? String(payment.paymentDate).slice(0, 10) : '';
    const receivedBy = payment.receiver?.name || '';
    const amount =
      payment.amount !== null && payment.amount !== undefined ? String(payment.amount) : '';
    const reference = payment.reference || '';
    const clearingDate = payment.clearingDate
      ? String(payment.clearingDate).slice(0, 10)
      : '';

    return {
      id: payment.id || undefined,
      mode,
      narration,
      date,
      receivedBy,
      amount,
      reference,
      clearingDate,
      createdAt: payment.createdAt ? String(payment.createdAt) : undefined,
      updatedAt: payment.updatedAt ? String(payment.updatedAt) : undefined,
      _original: {
        mode,
        narration,
        date,
        receivedBy,
        amount,
        reference,
        clearingDate,
      },
    };
  });
}

/**
 * True when an existing ledger entry was modified after it was first
 * recorded (beyond a small tolerance for insert-time timestamp skew) —
 * surfaces corrections so they can't pass as original entries.
 */
export function paymentWasEditedOnServer(payment: PaymentRow): boolean {
  if (!payment.id || !payment.createdAt || !payment.updatedAt) return false;
  const created = new Date(payment.createdAt).getTime();
  const updated = new Date(payment.updatedAt).getTime();
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return false;
  return updated - created > 1000;
}

export function paymentRowChanged(payment: PaymentRow): boolean {
  if (!payment.id || !payment._original) return false;
  const o = payment._original;
  return (
    payment.amount !== o.amount ||
    payment.mode !== o.mode ||
    payment.date !== o.date ||
    payment.narration !== o.narration ||
    payment.receivedBy !== o.receivedBy ||
    payment.reference !== o.reference ||
    payment.clearingDate !== o.clearingDate
  );
}

export function partitionPaymentsForSave(payments: PaymentRow[]) {
  const changedPayments = payments.filter((p) => paymentRowChanged(p));
  const newPayments = payments.filter(
    (p) => !p.id && p.amount.trim() && p.date.trim()
  );
  return { changedPayments, newPayments };
}
