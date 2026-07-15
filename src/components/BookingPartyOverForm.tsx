
import { useState } from 'react';
import { Flag, Lock } from 'lucide-react';
import { IndianAmountInput } from '@/components/IndianAmountInput';
import { formatWeekdayDateIN } from '@/lib/date';

interface Props {
  booking: any | null;
  functionDate: string;
  discountPercent: number;
  isPartyOverSubmitted: boolean;
  saving: boolean;
  onSubmit: (payload: {
    packs: Array<{ bookingPackId: string; extraPlate: number; extraRate: number }>;
    settlementDiscountPercent: number;
    settlementDiscountAmount: number;
    settlementTotalAmount: number;
  }) => Promise<void>;
}

function isDateReached(functionDate: string): boolean {
  if (!functionDate) return false;
  const funcDay = new Date(functionDate);
  funcDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return funcDay.getTime() <= today.getTime();
}

export default function BookingPartyOverForm({
  booking, functionDate, discountPercent, isPartyOverSubmitted, saving, onSubmit,
}: Props) {
  const [actualPax, setActualPax] = useState<Record<string, string>>({});
  // Settlement: any of the three can be edited; others derive from it
  const [settlePctDraft, setSettlePctDraft] = useState('0');
  const [settleDiscDraft, setSettleDiscDraft] = useState('');   // raw ₹ input
  const [settleTotalDraft, setSettleTotalDraft] = useState(''); // raw ₹ input
  const [settleMode, setSettleMode] = useState<'pct' | 'disc' | 'total'>('pct');

  const unlocked = isDateReached(functionDate);
  const packs: any[] = booking?.packs || [];

  const discRate = (rpp: number) => rpp * (1 - discountPercent / 100);

  const rows = packs.map((pack) => {
    const qr = pack.ratePerPlate ?? 0;
    const dr = discRate(qr);
    const mgPax = pack.packCount ?? pack.noOfPack ?? 0;
    const existingExtra = pack.extraPlate ?? 0;
    const defaultActual = mgPax + existingExtra;
    const actualStr = actualPax[pack.id] ?? String(defaultActual);
    const actualP = parseInt(actualStr) || defaultActual;
    const billedP = Math.max(mgPax, actualP);
    const discAmt = dr * mgPax;
    const billedAmt = dr * billedP;
    return { pack, qr, dr, mgPax, actualP, billedP, discAmt, billedAmt };
  });

  const totalDiscAmt = rows.reduce((s, r) => s + r.discAmt, 0);
  const totalBilledAmt = rows.reduce((s, r) => s + r.billedAmt, 0);

  // Derive the three settlement values from whichever field was last edited
  const settlePct = (() => {
    if (settleMode === 'pct') return Math.min(100, Math.max(0, parseFloat(settlePctDraft) || 0));
    if (settleMode === 'disc') return totalBilledAmt > 0 ? (parseFloat(settleDiscDraft) || 0) / totalBilledAmt * 100 : 0;
    if (settleMode === 'total') return totalBilledAmt > 0 ? Math.max(0, totalBilledAmt - (parseFloat(settleTotalDraft) || 0)) / totalBilledAmt * 100 : 0;
    return 0;
  })();
  const settleDiscAmt = (() => {
    if (settleMode === 'disc') return Math.max(0, Math.min(totalBilledAmt, parseFloat(settleDiscDraft) || 0));
    return totalBilledAmt * (settlePct / 100);
  })();
  const settleTotalAmt = (() => {
    if (settleMode === 'total') return Math.max(0, Math.min(totalBilledAmt, parseFloat(settleTotalDraft) || 0));
    return totalBilledAmt - settleDiscAmt;
  })();

  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

  const handleSubmit = async () => {
    if (!window.confirm('Mark party as over? ALL booking versions will be permanently locked. This cannot be undone.')) return;
    await onSubmit({
      packs: rows.map((r) => ({
        bookingPackId: r.pack.id,
        extraPlate: Math.max(0, r.billedP - r.mgPax),
        extraRate: r.dr,
      })),
      settlementDiscountPercent: settlePct,
      settlementDiscountAmount: settleDiscAmt,
      settlementTotalAmount: settleTotalAmt,
    });
  };

  if (isPartyOverSubmitted) {
    return (
      <div className="rounded-xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-500/10 p-4">
        <p className="text-sm font-medium text-green-800 dark:text-green-300 flex items-center gap-2">
          <Flag className="w-4 h-4" /> Party finalized. All versions are permanently locked.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full overflow-x-hidden">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-red-500" />
          <h3 className="text-lg font-semibold text-[var(--text-1)]">Party Over</h3>
        </div>
        {!unlocked && (
          <div className="flex items-center gap-1.5 rounded-full border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 text-xs text-amber-700 dark:text-amber-300">
            <Lock className="w-3 h-3" />
            Editable from {functionDate ? formatWeekdayDateIN(functionDate, { day: '2-digit', month: 'short', withYear: true }) : '—'}
          </div>
        )}
      </div>

      {packs.length === 0 && (
        <div className="rounded-xl border border-[var(--border)] p-8 text-center text-sm text-[var(--text-4)]">
          No packs configured on this booking.
        </div>
      )}

      {packs.length > 0 && (
        <>
          {/* Mobile pack cards */}
          <div className={`md:hidden space-y-3${!unlocked ? ' opacity-60' : ''}`}>
            {rows.map(({ pack, qr, dr, mgPax, actualP, billedP, discAmt, billedAmt }) => (
              <div
                key={`mob-${pack.id}`}
                className="rounded-xl border border-[var(--border-2)] p-3 space-y-2 bg-[var(--surface)]"
              >
                <p className="text-sm font-semibold text-[var(--text-1)]">{pack.packName}</p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  <span className="text-[var(--text-4)]">Menu pts</span>
                  <span className="text-right text-[var(--text-2)]">{pack.menuPoint ?? 0}</span>
                  <span className="text-[var(--text-4)]">Quote Rate</span>
                  <span className="text-right text-[var(--text-2)]">{fmt(qr)}</span>
                  <span className="text-[var(--text-4)]">Disc Rate</span>
                  <span className="text-right text-[var(--text-2)]">{fmt(dr)}</span>
                  <span className="text-[var(--text-4)]">Disc Amt</span>
                  <span className="text-right text-orange-800 dark:text-orange-200">{fmt(discAmt)}</span>
                  <span className="text-[var(--text-4)]">MG Pax</span>
                  <span className="text-right text-[var(--text-2)]">{mgPax}</span>
                  <span className="text-[var(--text-4)]">Billed Pax</span>
                  <span className="text-right font-medium text-[var(--text-1)]">{billedP}</span>
                  <span className="text-[var(--text-4)]">Billed Amt</span>
                  <span className="text-right font-semibold text-[var(--text-1)]">{fmt(billedAmt)}</span>
                </div>
                <div>
                  <label className="label text-xs">Actual Pax</label>
                  <input
                    type="number"
                    min={0}
                    disabled={!unlocked}
                    className="input py-1 text-sm w-full text-center disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                    value={actualPax[pack.id] ?? String(actualP)}
                    onChange={(e) =>
                      setActualPax((prev) => ({ ...prev, [pack.id]: e.target.value }))
                    }
                  />
                </div>
              </div>
            ))}
            <div className="rounded-xl border border-[var(--border-2)] bg-[var(--surface-2)] p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-3)]">Total Disc Amt</span>
                <span className="font-semibold text-orange-800 dark:text-orange-200">{fmt(totalDiscAmt)}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="font-semibold text-[var(--text-1)]">Total Billed</span>
                <span className="font-bold text-[var(--text-1)]">{fmt(totalBilledAmt)}</span>
              </div>
            </div>
          </div>

          <div className={`hidden md:block rounded-xl border border-[var(--border-2)] overflow-hidden${!unlocked ? ' opacity-60' : ''}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-[var(--surface-3)] border-b border-[var(--border)]">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Agreement</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Menu pts</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Quote Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Disc %</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Disc Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-orange-700 dark:text-orange-300 whitespace-nowrap bg-orange-50 dark:bg-orange-900/20">Disc Amt</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">MG Pax</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-primary-700 dark:text-primary-400 whitespace-nowrap">Actual Pax ✏</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Billed Pax</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-1)] whitespace-nowrap">Billed Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ pack, qr, dr, mgPax, actualP, billedP, discAmt, billedAmt }) => (
                    <tr key={pack.id} className="border-t border-[var(--border)] hover:bg-[var(--surface-2)]">
                      <td className="px-3 py-2 font-medium text-[var(--text-1)] whitespace-nowrap">{pack.packName}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{pack.menuPoint ?? 0}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{fmt(qr)}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{discountPercent.toFixed(2)}%</td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{fmt(dr)}</td>
                      <td className="px-3 py-2 text-right font-medium bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                        {fmt(discAmt)}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-2)]">{mgPax}</td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          disabled={!unlocked}
                          className="input py-1 text-sm w-24 text-center disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                          value={actualPax[pack.id] ?? String(actualP)}
                          onChange={(e) =>
                            setActualPax((prev) => ({ ...prev, [pack.id]: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-[var(--text-1)]">{billedP}</td>
                      <td className="px-3 py-2 text-right font-semibold text-[var(--text-1)]">{fmt(billedAmt)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-2)] dark:bg-[var(--surface-3)]">
                    <td colSpan={5} className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-3)]">Totals</td>
                    <td className="px-3 py-2 text-right font-semibold bg-orange-50 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200">
                      {fmt(totalDiscAmt)}
                    </td>
                    <td colSpan={3} />
                    <td className="px-3 py-2 text-right font-bold text-[var(--text-1)]">{fmt(totalBilledAmt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Settlement — all three fields editable, bidirectional sync */}
          <div className={`rounded-xl border border-[var(--border-2)] overflow-hidden${!unlocked ? ' opacity-60' : ''}`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
                <span className="text-sm text-[var(--text-3)] shrink-0">Settlement Disc %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  disabled={!unlocked}
                  className="input py-1 text-sm w-24 text-right disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                  value={settleMode === 'pct' ? settlePctDraft : settlePct.toFixed(2)}
                  onChange={(e) => { setSettleMode('pct'); setSettlePctDraft(e.target.value); }}
                />
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 min-w-0">
                <span className="text-sm font-semibold text-red-600 dark:text-red-400 shrink-0">Settlement Discount</span>
                <IndianAmountInput
                  disabled={!unlocked}
                  className="input py-1 text-sm w-full sm:w-36 text-right text-red-600 dark:text-red-400 font-semibold disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                  value={settleMode === 'disc' ? settleDiscDraft : Math.round(settleDiscAmt).toString()}
                  onChange={(raw) => { setSettleMode('disc'); setSettleDiscDraft(raw); }}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 px-4 py-3 bg-[var(--surface-2)]">
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Settlement Amount</span>
              <IndianAmountInput
                disabled={!unlocked}
                className="input py-1 text-sm w-full sm:w-36 text-right text-emerald-700 dark:text-emerald-400 font-bold bg-[var(--surface)] disabled:bg-[var(--surface-2)] disabled:cursor-not-allowed"
                value={settleMode === 'total' ? settleTotalDraft : Math.round(settleTotalAmt).toString()}
                onChange={(raw) => { setSettleMode('total'); setSettleTotalDraft(raw); }}
              />
            </div>
          </div>

          {unlocked && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-500/10 p-3">
              <p className="text-xs text-red-700 dark:text-red-200">
                ⚠ Marking party as over permanently locks ALL booking versions. This action cannot be reversed. Please enter actual pax as used.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              className="btn bg-red-600 hover:bg-red-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={saving || !unlocked}
              onClick={handleSubmit}
            >
              <span className="inline-flex items-center gap-2">
                {!unlocked && <Lock className="w-4 h-4" />}
                {unlocked && <Flag className="w-4 h-4" />}
                {saving ? 'Processing…' : !unlocked ? 'Locked' : 'Settle & Lock Party'}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
