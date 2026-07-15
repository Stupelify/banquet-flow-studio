
import { useRef, useState } from 'react';
import {
  paymentCountsTowardDue,
  sumAllPaymentAmounts,
  sumPaymentsTowardDue,
} from '@/lib/booking-form/payment-credit';
import {
  paymentRowChanged,
  paymentWasEditedOnServer,
} from '@/lib/booking-form/payments';
import type { PaymentRow } from '@/lib/booking-form/types';
import { Plus } from 'lucide-react';
import { IndianAmountInput } from '@/components/IndianAmountInput';
import Button from '@/components/ui/Button';

interface Props {
  payments: PaymentRow[];
  isReadOnly: boolean;
  onAdd: (payment: PaymentRow) => void;
  onUpdate: (index: number, patch: Partial<PaymentRow>) => void;
  onRemove: (index: number) => void;
}

const PAYMENT_MODES: { value: string; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'Online (UPI)' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const emptyDraft = (): PaymentRow => ({
  clientMutationId: crypto.randomUUID(),
  mode: 'cash', amount: '', date: todayStr(), receivedBy: '',
  narration: '', reference: '', clearingDate: '',
});

export default function BookingPaymentsLedger({
  payments, isReadOnly, onAdd, onUpdate, onRemove,
}: Props) {
  const [showDraft, setShowDraft] = useState(false);
  const [draft, setDraft] = useState<PaymentRow>(emptyDraft());
  const [isAdding, setIsAdding] = useState(false);
  const addInFlightRef = useRef(false);

  const handleAddConfirm = () => {
    if (addInFlightRef.current || !draft.amount || !draft.date) return;
    addInFlightRef.current = true;
    const duplicate = payments.some(
      (row) =>
        !row.id &&
        row.mode === draft.mode &&
        row.amount === draft.amount &&
        row.date === draft.date
    );
    if (duplicate) {
      addInFlightRef.current = false;
      return;
    }
    setIsAdding(true);
    onAdd({ ...draft });
    setDraft(emptyDraft());
    setShowDraft(false);
    window.setTimeout(() => {
      addInFlightRef.current = false;
      setIsAdding(false);
    }, 300);
  };

  const todayDate = new Date().toISOString().slice(0, 10);
  const credited = sumPaymentsTowardDue(payments, todayDate);
  const totalReceived = sumAllPaymentAmounts(payments);
  const pendingCheques = totalReceived - credited;

  const modeLabelFor = (mode: string) =>
    PAYMENT_MODES.find((m) => m.value === mode.toLowerCase())?.label ?? mode;

  // Corrections must read as corrections: tag entries that were edited after
  // they were first recorded so they can't pass as original entries.
  const editedTag = (payment: PaymentRow) =>
    paymentWasEditedOnServer(payment) ? (
      <span
        className="ml-1.5 inline-flex items-center rounded-full border border-amber-300 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 align-middle"
        title={`This entry was edited after it was first recorded${
          payment.updatedAt
            ? ` — last change ${new Date(payment.updatedAt).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : ''
        }`}
      >
        edited
      </span>
    ) : null;

  return (
    <div className="space-y-3 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--text-1)]">Payments Ledger</h3>
        {!isReadOnly && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-primary-600 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20"
            onClick={() => { setDraft(emptyDraft()); setShowDraft(true); }}
          >
            <Plus className="w-3 h-3" /> Add Payment
          </button>
        )}
      </div>

      <div className="rounded-xl border border-[var(--border-2)] overflow-hidden max-w-full">
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-[var(--border)]">
          {payments.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-[var(--text-4)]">
              No payments recorded yet.
            </p>
          )}
          {payments.map((payment, index) => {
            const isExisting = Boolean(payment.id);
            const patch = (p: Partial<PaymentRow>) => onUpdate(index, p);
            const modeLabel = modeLabelFor(payment.mode);
            const isCheque = payment.mode.toLowerCase() === 'cheque';
            const pendingClearance = isCheque && !paymentCountsTowardDue(payment, todayDate);
            const fieldsLocked = isReadOnly || isExisting;

            return (
              <div
                key={payment.id || `mob-pay-${index}`}
                className={`p-3 space-y-2 bg-[var(--surface)] ${pendingClearance ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text-1)]">
                      {modeLabel}
                      {editedTag(payment)}
                    </p>
                    <p className="text-xs text-[var(--text-4)]">{payment.date || '—'}</p>
                  </div>
                  <p
                    className={`text-sm font-semibold shrink-0 ${
                      pendingClearance ? 'text-amber-600' : 'text-[var(--text-1)]'
                    }`}
                  >
                    ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
                    {pendingClearance && (
                      <span className="block text-xs font-normal text-right">pending</span>
                    )}
                  </p>
                </div>
                {!fieldsLocked ? (
                  <div className="grid grid-cols-1 gap-2">
                    <input
                      type="date"
                      className="input py-1 text-sm w-full"
                      value={payment.date}
                      onChange={(e) => patch({ date: e.target.value })}
                    />
                    <select
                      className="input py-1 text-sm w-full"
                      value={payment.mode}
                      onChange={(e) =>
                        patch({
                          mode: e.target.value,
                          clearingDate: e.target.value !== 'cheque' ? '' : payment.clearingDate,
                        })
                      }
                    >
                      {PAYMENT_MODES.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="input py-1 text-sm w-full"
                      placeholder="Bank / ledger name"
                      value={payment.reference}
                      onChange={(e) => patch({ reference: e.target.value })}
                    />
                    <input
                      type="text"
                      className="input py-1 text-sm w-full"
                      placeholder="Staff name"
                      value={payment.receivedBy}
                      onChange={(e) => patch({ receivedBy: e.target.value })}
                    />
                    {isCheque && (
                      <input
                        type="date"
                        className="input py-1 text-sm w-full"
                        value={payment.clearingDate}
                        onChange={(e) => patch({ clearingDate: e.target.value })}
                      />
                    )}
                    <IndianAmountInput
                      className="input py-1 text-sm w-full text-right"
                      value={payment.amount}
                      onChange={(raw) => patch({ amount: raw })}
                    />
                    <button
                      type="button"
                      className="text-xs text-red-500 hover:text-red-700 self-start"
                      onClick={() => onRemove(index)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-[var(--text-2)]">
                    <span>Ledger</span>
                    <span className="text-right truncate">{payment.reference || '—'}</span>
                    <span>Cashier</span>
                    <span className="text-right truncate">{payment.receivedBy || '—'}</span>
                    {isCheque && (
                      <>
                        <span>Clearing</span>
                        <span
                          className={`text-right ${pendingClearance ? 'text-amber-600' : ''}`}
                        >
                          {payment.clearingDate || '—'}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 dark:bg-[var(--surface-3)] border-b border-[var(--border)]">
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Method</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Ledger</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Cashier</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Clearing Date</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Amount (₹)</th>
                {!isReadOnly && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 && (
                <tr>
                  <td colSpan={isReadOnly ? 6 : 7} className="px-3 py-8 text-center text-sm text-[var(--text-4)]">
                    No payments recorded yet.
                  </td>
                </tr>
              )}
              {payments.map((payment, index) => {
                const isExisting = Boolean(payment.id);
                const patch = (p: Partial<PaymentRow>) => onUpdate(index, p);
                const modeLabel = modeLabelFor(payment.mode);
                const isCheque = payment.mode.toLowerCase() === 'cheque';
                const pendingClearance = isCheque && !paymentCountsTowardDue(payment, todayDate);
                const fieldsLocked = isReadOnly || isExisting;

                return (
                  <tr
                    key={payment.id || `new-${index}`}
                    className={`border-t border-[var(--border)] hover:bg-[var(--surface-2)] ${pendingClearance ? 'opacity-70' : ''}`}
                  >
                    <td className="px-2 py-1.5">
                      {fieldsLocked ? (
                        <span className="text-[var(--text-2)]">{payment.date}</span>
                      ) : (
                        <input
                          type="date"
                          className="input py-1 text-sm w-36"
                          value={payment.date}
                          onChange={(e) => patch({ date: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {fieldsLocked ? (
                        <span className="text-[var(--text-2)]">
                          {modeLabel}
                          {editedTag(payment)}
                        </span>
                      ) : (
                        <select
                          className="input py-1 text-sm"
                          value={payment.mode}
                          onChange={(e) => patch({
                            mode: e.target.value,
                            clearingDate: e.target.value !== 'cheque' ? '' : payment.clearingDate,
                          })}
                        >
                          {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {fieldsLocked ? (
                        <span className="text-[var(--text-2)]">{payment.reference || '—'}</span>
                      ) : (
                        <input
                          type="text"
                          className="input py-1 text-sm w-40"
                          placeholder="Bank / ledger name"
                          value={payment.reference}
                          onChange={(e) => patch({ reference: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {fieldsLocked ? (
                        <span className="text-[var(--text-2)]">{payment.receivedBy || '—'}</span>
                      ) : (
                        <input
                          type="text"
                          className="input py-1 text-sm w-28"
                          placeholder="Staff name"
                          value={payment.receivedBy}
                          onChange={(e) => patch({ receivedBy: e.target.value })}
                        />
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {isCheque ? (
                        !isReadOnly ? (
                          <input
                            type="date"
                            className="input py-1 text-sm w-36"
                            value={payment.clearingDate}
                            onChange={(e) => patch({ clearingDate: e.target.value })}
                          />
                        ) : (
                          <span className={`text-sm ${pendingClearance ? 'text-amber-600' : 'text-[var(--text-2)]'}`}>
                            {payment.clearingDate || '—'}
                          </span>
                        )
                      ) : (
                        <span className="text-[var(--text-4)] text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {fieldsLocked ? (
                        <span className={`font-medium ${pendingClearance ? 'text-amber-600' : 'text-[var(--text-1)]'}`}>
                          ₹{Number(payment.amount || 0).toLocaleString('en-IN')}
                          {pendingClearance && <span className="ml-1 text-xs">(pending)</span>}
                        </span>
                      ) : (
                        <IndianAmountInput
                          className="input py-1 text-sm w-28 text-right"
                          value={payment.amount}
                          onChange={(raw) => patch({ amount: raw })}
                        />
                      )}
                    </td>
                    {!isReadOnly && (
                      <td className="px-2 py-1.5 text-right">
                        {isExisting ? (
                          paymentRowChanged(payment) ? (
                            <span
                              className="text-xs text-amber-600 dark:text-amber-400 select-none"
                              title="This change updates the existing entry when you submit the booking"
                            >
                              will update
                            </span>
                          ) : (
                            <span className="text-xs text-[var(--text-4)] select-none">saved</span>
                          )
                        ) : (
                          <button
                            type="button"
                            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400"
                            onClick={() => onRemove(index)}
                          >Remove</button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Draft row for adding a new payment */}
        {showDraft && !isReadOnly && (
          <div className="border-t border-[var(--border)] bg-primary-50 dark:bg-primary-900/10 p-4 space-y-3">
            <p className="text-xs font-semibold text-primary-700 dark:text-primary-300">New Payment Entry</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-4)] block mb-1">Date *</label>
                <input
                  type="date"
                  className="input py-1 text-sm"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-4)] block mb-1">Method</label>
                <select
                  className="input py-1 text-sm"
                  value={draft.mode}
                  onChange={(e) => setDraft((d) => ({
                    ...d,
                    mode: e.target.value,
                    clearingDate: e.target.value !== 'cheque' ? '' : d.clearingDate,
                  }))}
                >
                  {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[var(--text-4)] block mb-1">Ledger</label>
                <input
                  type="text"
                  className="input py-1 text-sm"
                  placeholder="Bank / cash ledger"
                  value={draft.reference}
                  onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-4)] block mb-1">Cashier</label>
                <input
                  type="text"
                  className="input py-1 text-sm"
                  placeholder="Staff name"
                  value={draft.receivedBy}
                  onChange={(e) => setDraft((d) => ({ ...d, receivedBy: e.target.value }))}
                />
              </div>
              {draft.mode === 'cheque' && (
                <div>
                  <label className="text-xs text-[var(--text-4)] block mb-1">Clearing Date</label>
                  <input
                    type="date"
                    className="input py-1 text-sm"
                    value={draft.clearingDate}
                    onChange={(e) => setDraft((d) => ({ ...d, clearingDate: e.target.value }))}
                  />
                </div>
              )}
              <div>
                <label className="text-xs text-[var(--text-4)] block mb-1">Amount (₹) *</label>
                <IndianAmountInput
                  className="input py-1 text-sm text-right"
                  placeholder="0"
                  value={draft.amount}
                  onChange={(raw) => setDraft((d) => ({ ...d, amount: raw }))}
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" size="sm" onClick={() => setShowDraft(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={isAdding || !draft.amount || !draft.date}
                loading={isAdding}
                onClick={handleAddConfirm}
              >
                {isAdding ? 'Adding…' : 'Add to Ledger'}
              </Button>
            </div>
          </div>
        )}

        {/* Footer totals */}
        {payments.length > 0 && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-2)] dark:bg-[var(--surface-3)] px-4 py-3 space-y-1 text-sm">
            <div className="flex justify-between text-[var(--text-2)]">
              <span>Credited toward due (this version)</span>
              <span className="font-semibold">₹{credited.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {pendingCheques > 0 && (
              <div className="flex justify-between text-amber-600 dark:text-amber-400 text-xs">
                <span>Deposited — awaiting clearing date</span>
                <span>₹{pendingCheques.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <p className="text-xs text-[var(--text-4)] pt-1">
              Cheques are recorded when deposited but reduce due only after a clearing date is entered and reached.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
