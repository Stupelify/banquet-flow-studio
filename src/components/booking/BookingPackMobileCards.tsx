
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { Plus } from 'lucide-react';
import { IndianAmountInput } from '@/components/IndianAmountInput';
import { PACK_LABELS, type PackKey } from '@/lib/booking-form/constants';
import {
  formatPercentFieldOnBlur,
  type BillingAmountSyncMode,
  type SyncedBillingAmounts,
} from '@bika/booking-core';
import type { VersionDiff } from '@/lib/booking-form/version-history';
import type {
  BanquetOption,
  BookingFormData,
  BookingPackRow,
  HallOption,
} from '@/lib/booking-form/form-types';

const PACK_ROW_STYLES: Record<PackKey, string> = {
  breakfast: 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 border-l-[3px] border-l-orange-500',
  lunch: 'border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 border-l-[3px] border-l-green-500',
  hiTea: 'border-[var(--border)] dark:border-slate-700/50 bg-[var(--surface-2)] dark:bg-slate-800/30 border-l-[3px] border-l-slate-500',
  dinner: 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/20 border-l-[3px] border-l-indigo-500',
};

/**
 * Mobile (below lg) pack cards + amount summary for the booking form.
 * Extracted verbatim from the bookings page — props-only, all state stays in
 * the page. Prop names match the page identifiers one-to-one so the JSX body
 * is unchanged.
 */
export interface BookingPackMobileCardsProps {
  formData: BookingFormData;
  setFormData: Dispatch<SetStateAction<BookingFormData>>;
  formDiff: VersionDiff | null;
  halls: HallOption[];
  banquets: BanquetOption[];
  openHallPickerPack: PackKey | null;
  setOpenHallPickerPack: Dispatch<SetStateAction<PackKey | null>>;
  hallPickerContainerRef: MutableRefObject<HTMLDivElement | null>;
  updatePackRow: (packKey: PackKey, patch: Partial<BookingPackRow>) => void;
  requestCateringToggle: (packKey: PackKey, nextWithCatering: boolean) => void;
  requestHallToggle: (packKey: PackKey, nextWithHall: boolean) => void;
  setMenuEditorPack: Dispatch<SetStateAction<PackKey | null>>;
  setMenuItemSearch: (value: string) => void;
  formatComputedAmount: (amount: number) => string;
  packRowAmount: (row: BookingPackRow) => number;
  enabledPackAmountRows: Array<{ key: PackKey; label: string; enabled: boolean; amount: number }>;
  billingTotals: { mealsSubtotal: number; extrasSubtotal: number; preDiscountTotal: number };
  mealsBillBase: number;
  payableGrandTotal: number;
  setAmountSyncMode: Dispatch<SetStateAction<BillingAmountSyncMode>>;
  setDiscountManuallySet: Dispatch<SetStateAction<boolean>>;
  normalizeAmountSnapshot: (
    mode: BillingAmountSyncMode,
    sourceValue: string,
    totalAmount: number
  ) => SyncedBillingAmounts;
  isReadOnlyBooking: boolean;
  setIsFormDirty: Dispatch<SetStateAction<boolean>>;
}

export default function BookingPackMobileCards({
  formData,
  setFormData,
  formDiff,
  halls,
  banquets,
  openHallPickerPack,
  setOpenHallPickerPack,
  hallPickerContainerRef,
  updatePackRow,
  requestCateringToggle,
  requestHallToggle,
  setMenuEditorPack,
  setMenuItemSearch,
  formatComputedAmount,
  packRowAmount,
  enabledPackAmountRows,
  billingTotals,
  mealsBillBase,
  payableGrandTotal,
  setAmountSyncMode,
  setDiscountManuallySet,
  normalizeAmountSnapshot,
  isReadOnlyBooking,
  setIsFormDirty,
}: BookingPackMobileCardsProps) {
  return (
              <div className="lg:hidden space-y-3">
                {(Object.keys(PACK_LABELS) as PackKey[]).map((packKey) => {
                  const row = formData.packs[packKey];
                  const packDiffKey = PACK_LABELS[packKey].toLowerCase();
                  const packDiff = formDiff?.packs[packDiffKey];
                  const menuAdded = packDiff?.addedItemIds.length ?? 0;
                  const menuRemoved = packDiff?.removedItemIds.length ?? 0;
                  const hasMenuDiff = menuAdded > 0 || menuRemoved > 0;
                  const filteredHalls = halls.filter(
                    (hall) => !row.banquetId || hall.banquet?.id === row.banquetId
                  );
                  const validSelectedHallIds = row.hallIds.filter((hallId) =>
                    filteredHalls.some((hall) => hall.id === hallId)
                  );
                  const selectedHallNames = filteredHalls
                    .filter((hall) => validSelectedHallIds.includes(hall.id))
                    .map((hall) => hall.name);

                  return (
                    <div key={packKey} className={`rounded-2xl border p-3 space-y-3 ${PACK_ROW_STYLES[packKey]}`}>
                      <div className="flex items-center justify-between">
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <span className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              className="peer sr-only"
                              checked={row.enabled}
                              onChange={(e) => {
                                const enabled = e.target.checked;
                                if (!enabled && openHallPickerPack === packKey) setOpenHallPickerPack(null);
                                updatePackRow(packKey, { enabled });
                              }}
                            />
                            <span className="h-6 w-11 rounded-full bg-[var(--surface-3)] transition-colors peer-checked:bg-primary-600 peer-focus:ring-2 peer-focus:ring-primary-200 peer-focus:ring-offset-1 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
                          </span>
                          <span className="text-base font-semibold text-[var(--text-1)]">{PACK_LABELS[packKey]}</span>
                        </label>
                        <div className="flex gap-3">
                          <label className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-1)]">
                            <input type="checkbox" className="h-4 w-4 rounded" checked={row.withHall} disabled={!row.enabled}
                              onChange={(e) => requestHallToggle(packKey, e.target.checked)} />
                            Hall
                          </label>
                          <label className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--text-1)]">
                            <input type="checkbox" className="h-4 w-4 rounded" checked={row.withCatering} disabled={!row.enabled}
                              onChange={(e) => requestCateringToggle(packKey, e.target.checked)} />
                            Catering
                          </label>
                        </div>
                      </div>

                      {row.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          {row.withHall && (
                            <div>
                              <label className="label text-xs">Banquet</label>
                              <select className="input" value={row.banquetId}
                                onChange={(e) => { setOpenHallPickerPack((cur) => cur === packKey ? null : cur); updatePackRow(packKey, { banquetId: e.target.value, hallIds: [] }); }}>
                                <option value="">Select Banquet</option>
                                {banquets.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            </div>
                          )}
                          {row.withHall && (
                            <div className="relative" ref={openHallPickerPack === packKey ? hallPickerContainerRef : undefined}>
                              <label className="label text-xs">Hall</label>
                              <button type="button" className="input flex w-full items-center justify-between text-left" disabled={!row.banquetId}
                                onClick={() => setOpenHallPickerPack((cur) => cur === packKey ? null : packKey)}>
                                <span className="truncate">{!row.banquetId ? 'Select Banquet First' : selectedHallNames.length > 0 ? selectedHallNames.join(', ') : 'Select Halls *'}</span>
                              </button>
                              {openHallPickerPack === packKey && (
                                <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg">
                                  {filteredHalls.length === 0 ? <p className="px-3 py-2 text-xs text-[var(--text-4)]">No halls for this banquet.</p> : filteredHalls.map((hall) => {
                                    const checked = row.hallIds.includes(hall.id);
                                    return (
                                      <label key={hall.id} className="flex cursor-pointer items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-sm text-[var(--text-1)] last:border-b-0 hover:bg-[var(--surface-2)]">
                                        <input type="checkbox" checked={checked} onChange={() => { const next = checked ? row.hallIds.filter((id) => id !== hall.id) : [...row.hallIds, hall.id]; updatePackRow(packKey, { hallIds: next }); }} />
                                        <span>{hall.name}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <label className="label text-xs">Start Time</label>
                            <input className="input" type="time" step="900" value={row.startTime} onChange={(e) => updatePackRow(packKey, { startTime: e.target.value })} />
                          </div>
                          <div>
                            <label className="label text-xs">End Time</label>
                            <input className="input" type="time" step="900" value={row.endTime} onChange={(e) => updatePackRow(packKey, { endTime: e.target.value })} />
                          </div>
                          <div>
                            <label className="label text-xs">Menu</label>
                            <button
                              type="button"
                              className={`btn w-full ${hasMenuDiff ? 'btn-warning' : 'btn-secondary'}`}
                              disabled={!row.withCatering}
                              title={
                                row.withCatering ? undefined : 'Turn on catering to set a menu'
                              }
                              onClick={() => {
                                if (!row.withCatering) return;
                                setMenuEditorPack(packKey);
                                setMenuItemSearch('');
                              }}
                            >
                              {!row.withCatering
                                ? '—'
                                : Number(row.menuPoints) > 0
                                  ? `${row.menuPoints} pts`
                                  : 'Set menu…'}
                              {hasMenuDiff && <span className="ml-1 text-xs">{menuAdded > 0 && <span className="text-green-700 dark:text-green-200">+{menuAdded}</span>}{menuAdded > 0 && menuRemoved > 0 && '/'}{menuRemoved > 0 && <span className="text-red-700 dark:text-red-200">−{menuRemoved}</span>}</span>}
                            </button>
                          </div>
                          <div>
                            <label className="label text-xs">PAX</label>
                            <input className={`input${packDiff?.paxChange ? ' ring-2 ring-amber-300' : ''}`} type="number" min={0} value={row.pax}
                              disabled={!row.withCatering} onChange={(e) => updatePackRow(packKey, { pax: e.target.value })} />
                            {packDiff?.paxChange && <p className="mt-0.5 text-xs text-amber-600">was {packDiff.paxChange.from}</p>}
                          </div>
                          <div>
                            <label className="label text-xs">Rate/Plate</label>
                            <IndianAmountInput className={`input text-right${packDiff?.ratePerPlateChange ? ' ring-2 ring-amber-300' : ''}`} value={row.ratePerPlate}
                              disabled={!row.withCatering} onChange={(raw) => updatePackRow(packKey, { ratePerPlate: raw })} />
                            {packDiff?.ratePerPlateChange && <p className="mt-0.5 text-xs text-amber-600">was ₹{packDiff.ratePerPlateChange.from.toLocaleString('en-IN')}</p>}
                          </div>
                          <div>
                            <label className="label text-xs">Hall Rate</label>
                            <IndianAmountInput className={`input text-right${packDiff?.hallRateChange ? ' ring-2 ring-amber-300' : ''}`} value={row.hallRate}
                              disabled={!row.withHall} onChange={(raw) => updatePackRow(packKey, { hallRate: raw })} />
                            {packDiff?.hallRateChange && <p className="mt-0.5 text-xs text-amber-600">was ₹{packDiff.hallRateChange.from.toLocaleString('en-IN')}</p>}
                          </div>
                          <div>
                            <label className="label text-xs">Amount</label>
                            <IndianAmountInput
                              className="input bg-[var(--surface-2)] text-right"
                              value={formatComputedAmount(packRowAmount(row))}
                              readOnly
                              title="Catering + hall rate (once per meal)"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Mobile summary */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-[var(--text-1)]">Amount Summary</h3>
                    {!isReadOnlyBooking && (
                    <button type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary-600 px-2 text-xs font-semibold text-primary-700 hover:bg-primary-50"
                      onClick={() => { setIsFormDirty(true); setFormData((prev) => ({ ...prev, additionalRequirements: [...prev.additionalRequirements, { description: '', amount: '' }] })); }}>
                      <Plus className="h-3.5 w-3.5" /> Add Extra
                    </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {enabledPackAmountRows.map((entry) => (
                      <div key={entry.key} className="flex items-center justify-between">
                        <span className="text-sm text-[var(--text-2)]">{entry.label}</span>
                        <span className="text-sm font-medium text-[var(--text-1)]">₹{formatComputedAmount(entry.amount)}</span>
                      </div>
                    ))}
                    {formData.additionalRequirements.map((item, index) => (
                      <div key={`mob-req-${index}`} className="grid grid-cols-[1fr,120px,auto] gap-2 items-center">
                        <input className="input" value={item.description} placeholder="Item name" aria-label="Extra item name" disabled={isReadOnlyBooking} onChange={(e) => { setIsFormDirty(true); setFormData((prev) => ({ ...prev, additionalRequirements: prev.additionalRequirements.map((r, i) => i === index ? { ...r, description: e.target.value } : r) })); }} />
                        <IndianAmountInput className="input text-right" value={item.amount} placeholder="0" aria-label="Extra item amount" disabled={isReadOnlyBooking} onChange={(raw) => { setIsFormDirty(true); setFormData((prev) => ({ ...prev, additionalRequirements: prev.additionalRequirements.map((r, i) => i === index ? { ...r, amount: raw } : r) })); }} />
                        {!isReadOnlyBooking && (
                        <button type="button" className="text-red-500 text-xs" onClick={() => { setIsFormDirty(true); setFormData((prev) => ({ ...prev, additionalRequirements: prev.additionalRequirements.filter((_, i) => i !== index) })); }}>✕</button>
                        )}
                      </div>
                    ))}
                    <div className="border-t border-[var(--border)] pt-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--text-1)]">Total</span>
                        <span className="text-sm font-semibold text-[var(--text-1)]">₹{billingTotals.mealsSubtotal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="label text-xs">Discount %</label>
                          <input
                            className="input text-right"
                            type="text"
                            inputMode="decimal"
                            autoComplete="off"
                            value={formData.finalDiscountPercent}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setAmountSyncMode('discountPercent');
                              setDiscountManuallySet(true);
                              setFormData((prev) => {
                                const synced = normalizeAmountSnapshot('discountPercent', raw, mealsBillBase);
                                return {
                                  ...prev,
                                  finalDiscountAmount: synced.finalDiscountAmount,
                                  finalAmount: synced.finalAmount,
                                  finalDiscountPercent: raw,
                                };
                              });
                            }}
                            onBlur={(e) => {
                              const formatted = formatPercentFieldOnBlur(e.target.value);
                              setFormData((prev) => ({
                                ...prev,
                                ...normalizeAmountSnapshot(
                                  'discountPercent',
                                  formatted !== '' ? formatted : e.target.value,
                                  mealsBillBase
                                ),
                              }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Discount ₹</label>
                          <IndianAmountInput className="input text-right" value={formData.finalDiscountAmount}
                            onChange={(raw) => { setAmountSyncMode('discountAmount'); setDiscountManuallySet(true); setFormData((prev) => ({ ...prev, ...normalizeAmountSnapshot('discountAmount', raw, mealsBillBase) })); }} />
                        </div>
                        <div>
                          <label className="label text-xs">Net Amount</label>
                          <IndianAmountInput className="input text-right font-semibold text-teal-700 dark:text-teal-200" value={formData.finalAmount}
                            onChange={(raw) => { setAmountSyncMode('finalAmount'); setDiscountManuallySet(true); setFormData((prev) => ({ ...prev, ...normalizeAmountSnapshot('finalAmount', raw, mealsBillBase) })); }}
                            aria-label="Net Amount" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
                        <span className="text-base font-extrabold text-[var(--text-1)]">Grand Total</span>
                        <span className="text-base font-extrabold text-[var(--text-1)]">₹{payableGrandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
  );
}
