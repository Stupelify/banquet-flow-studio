
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, Plus } from 'lucide-react';
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

/**
 * Desktop (lg+) pack & summary table for the booking form. Extracted verbatim
 * from the bookings page — props-only, all state stays in the page. Prop
 * names match the page identifiers one-to-one so the JSX body is unchanged.
 */
export interface BookingPackTableProps {
  formData: BookingFormData;
  setFormData: Dispatch<SetStateAction<BookingFormData>>;
  formDiff: VersionDiff | null;
  halls: HallOption[];
  banquets: BanquetOption[];
  openHallPickerPack: PackKey | null;
  setOpenHallPickerPack: Dispatch<SetStateAction<PackKey | null>>;
  hallPickerContainerRef: MutableRefObject<HTMLDivElement | null>;
  hallPickerPortalRef: MutableRefObject<HTMLDivElement | null>;
  hallPickerAnchorRect: DOMRect | null;
  setHallPickerAnchorRect: Dispatch<SetStateAction<DOMRect | null>>;
  updatePackRow: (packKey: PackKey, patch: Partial<BookingPackRow>) => void;
  requestCateringToggle: (packKey: PackKey, nextWithCatering: boolean) => void;
  requestHallToggle: (packKey: PackKey, nextWithHall: boolean) => void;
  setMenuEditorPack: Dispatch<SetStateAction<PackKey | null>>;
  setMenuItemSearch: (value: string) => void;
  formatComputedAmount: (amount: number) => string;
  packRowAmount: (row: BookingPackRow) => number;
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
  netAmountDraft: string | null;
  setNetAmountDraft: Dispatch<SetStateAction<string | null>>;
  isReadOnlyBooking: boolean;
  setIsFormDirty: Dispatch<SetStateAction<boolean>>;
  saving: boolean;
  handleFinalizeBooking: (e: React.MouseEvent) => void;
}

export default function BookingPackTable({
  formData,
  setFormData,
  formDiff,
  halls,
  banquets,
  openHallPickerPack,
  setOpenHallPickerPack,
  hallPickerContainerRef,
  hallPickerPortalRef,
  hallPickerAnchorRect,
  setHallPickerAnchorRect,
  updatePackRow,
  requestCateringToggle,
  requestHallToggle,
  setMenuEditorPack,
  setMenuItemSearch,
  formatComputedAmount,
  packRowAmount,
  billingTotals,
  mealsBillBase,
  payableGrandTotal,
  setAmountSyncMode,
  setDiscountManuallySet,
  normalizeAmountSnapshot,
  netAmountDraft,
  setNetAmountDraft,
  isReadOnlyBooking,
  setIsFormDirty,
  saving,
  handleFinalizeBooking,
}: BookingPackTableProps) {
  return (
              <div className="hidden lg:block rounded-2xl border border-[var(--border)] overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Meal</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Banquet</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Hall</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap min-w-[200px]">Time</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Menu</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap min-w-[60px]">PAX</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap min-w-[70px]">Rate/Plate</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] whitespace-nowrap min-w-[70px]">Hall Rate</th>
                        <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-2)] whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
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
                        const packColorMap: Record<PackKey, string> = {
                          breakfast: '#f97316',
                          lunch: '#22c55e',
                          hiTea: '#64748b',
                          dinner: '#6366f1',
                        };
                        const packBgMap: Record<PackKey, string> = {
                          breakfast: 'bg-orange-50 dark:bg-orange-900/20',
                          lunch: 'bg-green-50 dark:bg-green-900/20',
                          hiTea: 'bg-[var(--surface-2)] dark:bg-slate-800/20',
                          dinner: 'bg-indigo-50 dark:bg-indigo-900/20',
                        };
                        return (
                          <tr
                            key={packKey}
                            className={`border-b border-[var(--border)] ${!row.enabled ? 'opacity-50' : ''} ${packBgMap[packKey]}`}
                            style={{ borderLeft: `3px solid ${packColorMap[packKey]}` }}
                          >
                            {/* Col 1: Meal toggle + Hall/Cat checkboxes */}
                            <td className="px-2 py-2 align-top min-w-[140px]">
                              <div className="flex flex-col gap-1">
                                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                                  <span className="relative inline-flex items-center">
                                    <input
                                      type="checkbox"
                                      className="peer sr-only"
                                      checked={row.enabled}
                                      onChange={(e) => {
                                        const enabled = e.target.checked;
                                        if (!enabled && openHallPickerPack === packKey) {
                                          setOpenHallPickerPack(null);
                                        }
                                        updatePackRow(packKey, { enabled });
                                      }}
                                    />
                                    <span className="h-5 w-9 rounded-full bg-[var(--surface-3)] transition-colors peer-checked:bg-primary-600 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:after:translate-x-4" />
                                  </span>
                                  <span className="text-xs font-semibold text-[var(--text-1)]">{PACK_LABELS[packKey]}</span>
                                </label>
                                <div className="flex gap-2 pl-0.5">
                                  <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-3 w-3 rounded dark:bg-slate-700 dark:border-slate-600"
                                      checked={row.withHall}
                                      disabled={!row.enabled}
                                      onChange={(e) => requestHallToggle(packKey, e.target.checked)}
                                    />
                                    Hall
                                  </label>
                                  <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)] cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="h-3 w-3 rounded dark:bg-slate-700 dark:border-slate-600"
                                      checked={row.withCatering}
                                      disabled={!row.enabled}
                                      onChange={(e) =>
                                        requestCateringToggle(packKey, e.target.checked)
                                      }
                                    />
                                    Cat
                                  </label>
                                </div>
                              </div>
                            </td>
                            {/* Col 2: Banquet */}
                            <td className="px-2 py-2 align-top min-w-[130px]">
                              <select
                                className="input py-1 text-xs w-full"
                                value={row.banquetId}
                                disabled={!row.enabled}
                                onChange={(e) => {
                                  setOpenHallPickerPack((cur) => cur === packKey ? null : cur);
                                  updatePackRow(packKey, { banquetId: e.target.value, hallIds: [] });
                                }}
                              >
                                <option value="">Select…</option>
                                {banquets.map((b) => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select>
                            </td>
                            {/* Col 3: Hall picker */}
                            <td className="px-2 py-2 align-top min-w-[130px]">
                              <div
                                className="relative"
                                ref={openHallPickerPack === packKey ? hallPickerContainerRef : undefined}
                              >
                              <button
                                type="button"
                                className="input py-1 text-xs w-full flex items-center justify-between text-left truncate"
                                disabled={!row.enabled || !row.withHall || !row.banquetId}
                                onClick={(e) => {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                  setHallPickerAnchorRect(rect);
                                  setOpenHallPickerPack((cur) => cur === packKey ? null : packKey);
                                }}
                              >
                                <span className="truncate">
                                  {!row.enabled || !row.withHall
                                    ? '—'
                                    : !row.banquetId
                                      ? 'Pick banquet'
                                      : selectedHallNames.length > 0
                                        ? selectedHallNames.join(', ')
                                        : 'Select halls'}
                                </span>
                              </button>
                              {openHallPickerPack === packKey && hallPickerAnchorRect && typeof document !== 'undefined' && createPortal(
                                <div
                                  ref={hallPickerPortalRef}
                                  style={{
                                    position: 'fixed',
                                    top: hallPickerAnchorRect.bottom + 4,
                                    left: hallPickerAnchorRect.left,
                                    width: Math.max(hallPickerAnchorRect.width, 208),
                                    zIndex: 9999,
                                  }}
                                  className="max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lg"
                                >
                                  {filteredHalls.length === 0 ? (
                                    <p className="px-3 py-2 text-xs text-[var(--text-4)]">No halls for this banquet.</p>
                                  ) : (
                                    filteredHalls.map((hall) => {
                                      const checked = row.hallIds.includes(hall.id);
                                      return (
                                        <label key={hall.id} className="flex cursor-pointer items-center gap-2 border-b border-[var(--border)] px-3 py-2 text-sm text-[var(--text-1)] last:border-b-0 hover:bg-[var(--surface-2)]">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              const next = checked
                                                ? row.hallIds.filter((id) => id !== hall.id)
                                                : [...row.hallIds, hall.id];
                                              updatePackRow(packKey, { hallIds: next });
                                            }}
                                          />
                                          <span>{hall.name}</span>
                                        </label>
                                      );
                                    })
                                  )}
                                </div>,
                                document.body
                              )}
                              </div>
                            </td>
                            {/* Col 4: Time */}
                            <td className="px-2 py-2 align-top min-w-[200px]">
                              <div className="flex gap-0.5 items-center">
                                <input
                                  className="input py-1 text-xs w-[90px]"
                                  type="time"
                                  step="900"
                                  value={row.startTime}
                                  disabled={!row.enabled}
                                  onChange={(e) => updatePackRow(packKey, { startTime: e.target.value })}
                                />
                                <span className="text-xs text-[var(--text-4)]">–</span>
                                <input
                                  className="input py-1 text-xs w-[90px]"
                                  type="time"
                                  step="900"
                                  value={row.endTime}
                                  disabled={!row.enabled}
                                  onChange={(e) => updatePackRow(packKey, { endTime: e.target.value })}
                                />
                              </div>
                            </td>
                            {/* Col 5: Menu */}
                            <td className="px-2 py-2 align-top min-w-[100px]">
                              <button
                                type="button"
                                className={`btn py-1 text-xs w-full ${hasMenuDiff ? 'btn-warning' : 'btn-secondary'}`}
                                disabled={!row.enabled || !row.withCatering}
                                title={
                                  row.withCatering
                                    ? undefined
                                    : 'Turn on catering to set a menu'
                                }
                                onClick={() => {
                                  if (!row.withCatering) return;
                                  setMenuEditorPack(packKey);
                                  setMenuItemSearch('');
                                }}
                              >
                                {!row.withCatering
                                  ? '—'
                                  : row.menuItemIds.length > 0
                                    ? `${row.menuPoints} pts`
                                    : 'Set menu…'}
                                {hasMenuDiff && (
                                  <span className="ml-1">
                                    {menuAdded > 0 && <span className="text-green-700 dark:text-green-200">+{menuAdded}</span>}
                                    {menuAdded > 0 && menuRemoved > 0 && <span>/</span>}
                                    {menuRemoved > 0 && <span className="text-red-700 dark:text-red-200">−{menuRemoved}</span>}
                                  </span>
                                )}
                              </button>
                            </td>
                            {/* Col 6: PAX */}
                            <td className="px-2 py-2 align-top min-w-[60px]">
                              <input
                                className={`input py-1 text-xs w-full${packDiff?.paxChange ? ' ring-2 ring-amber-300' : ''}`}
                                type="number"
                                min={0}
                                value={row.pax}
                                disabled={!row.enabled || !row.withCatering}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => updatePackRow(packKey, { pax: e.target.value })}
                              />
                              {packDiff?.paxChange && (
                                <p className="mt-0.5 text-xs text-amber-600">was {packDiff.paxChange.from}</p>
                              )}
                            </td>
                            {/* Col 7: Rate/Plate */}
                            <td className="px-2 py-2 align-top min-w-[70px]">
                              <IndianAmountInput
                                className={`input py-1 text-xs w-full text-right${packDiff?.ratePerPlateChange ? ' ring-2 ring-amber-300' : ''}`}
                                value={row.ratePerPlate}
                                disabled={!row.enabled || !row.withCatering}
                                onChange={(raw) => updatePackRow(packKey, { ratePerPlate: raw })}
                              />
                              {packDiff?.ratePerPlateChange && (
                                <p className="mt-0.5 text-xs text-amber-600">was ₹{packDiff.ratePerPlateChange.from.toLocaleString('en-IN')}</p>
                              )}
                            </td>
                            {/* Col 8: Hall Rate */}
                            <td className="px-2 py-2 align-top min-w-[70px]">
                              <IndianAmountInput
                                className={`input py-1 text-xs w-full text-right${packDiff?.hallRateChange ? ' ring-2 ring-amber-300' : ''}`}
                                value={row.hallRate}
                                disabled={!row.enabled || !row.withHall}
                                onChange={(raw) => updatePackRow(packKey, { hallRate: raw })}
                              />
                              {packDiff?.hallRateChange && (
                                <p className="mt-0.5 text-xs text-amber-600">was ₹{packDiff.hallRateChange.from.toLocaleString('en-IN')}</p>
                              )}
                            </td>
                            {/* Col 9: Amount (read-only — hall + pax × rate) */}
                            <td className="px-2 py-2 align-top min-w-[100px]">
                              <IndianAmountInput
                                className="input py-1 text-xs w-full text-right bg-[var(--surface-2)]"
                                value={formatComputedAmount(packRowAmount(row))}
                                disabled={!row.enabled}
                                readOnly
                                title="Catering + hall rate (once per meal)"
                              />
                            </td>
                          </tr>
                        );
                      })}

                      {/* ── Summary rows ── */}
                      <tr>
                        <td colSpan={9} className="border-t-2 border-[var(--border)] p-0" />
                      </tr>

                      {/* Total row */}
                      <tr className="bg-[var(--surface)]">
                        <td colSpan={7} />
                        <td className="px-2 py-2 text-right text-xs font-bold text-[var(--text-1)] whitespace-nowrap">Total</td>
                        <td className="px-2 py-2 text-right text-sm font-bold text-[var(--text-1)]">
                          ₹{billingTotals.mealsSubtotal.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Discount row */}
                      <tr className="bg-red-50 dark:bg-red-900/20">
                        <td colSpan={5} />
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-xs text-[var(--text-3)] whitespace-nowrap">Disc %</span>
                            <input
                              className="input py-1 text-xs w-16 text-right dark:bg-slate-800/40"
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              value={formData.finalDiscountPercent}
                              onFocus={(e) => e.target.select()}
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
                        </td>
                        <td colSpan={1} />
                        <td className="px-2 py-1.5 text-right text-xs font-semibold text-red-700 dark:text-red-200 whitespace-nowrap">Discount</td>
                        <td className="px-2 py-1.5">
                          <IndianAmountInput
                            className="input py-1 text-xs w-full text-right dark:bg-slate-800/40"
                            value={formData.finalDiscountAmount}
                            onChange={(raw) => {
                              setAmountSyncMode('discountAmount');
                              setDiscountManuallySet(true);
                              setFormData((prev) => ({
                                ...prev,
                                ...normalizeAmountSnapshot('discountAmount', raw, mealsBillBase),
                              }));
                            }}
                          />
                        </td>
                      </tr>

                      {/* Net Amount row */}
                      <tr className="bg-teal-50 dark:bg-teal-900/20">
                        <td colSpan={7} />
                        <td className="px-2 py-1.5 text-right text-xs font-bold text-teal-700 dark:text-teal-200 whitespace-nowrap">Net Amount</td>
                        <td className="px-2 py-1.5">
                          <IndianAmountInput
                            className="input py-1 text-xs w-full text-right font-semibold text-teal-700 dark:text-teal-200 dark:bg-slate-800/40"
                            value={netAmountDraft !== null ? netAmountDraft : formData.finalAmount}
                            onFocus={() => setNetAmountDraft(netAmountDraft !== null ? netAmountDraft : formData.finalAmount)}
                            onChange={(raw) => setNetAmountDraft(raw)}
                            onBlur={() => {
                              const draft = netAmountDraft;
                              setNetAmountDraft(null);
                              setAmountSyncMode('finalAmount');
                              setDiscountManuallySet(true);
                              setFormData((prev) => ({
                                ...prev,
                                ...normalizeAmountSnapshot('finalAmount', draft ?? formData.finalAmount, mealsBillBase),
                              }));
                            }}
                            aria-label="Net Amount"
                            title="Net Amount (after discount)"
                          />
                        </td>
                      </tr>

                      {/* Extra Items header row */}
                      <tr className="bg-[var(--surface-2)] border-t border-[var(--border)]">
                        <td colSpan={8} className="px-3 py-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[var(--text-2)]">Extra Items</span>
                            {!isReadOnlyBooking && (
                            <button
                              type="button"
                              className="inline-flex h-6 items-center gap-1 rounded-full border border-primary-600 px-2 text-xs font-medium text-primary-700 hover:bg-primary-50"
                              onClick={() => {
                                setIsFormDirty(true);
                                setFormData((prev) => ({
                                  ...prev,
                                  additionalRequirements: [
                                    ...prev.additionalRequirements,
                                    { description: '', amount: '' },
                                  ],
                                }));
                              }}
                            >
                              <Plus className="h-3 w-3" />
                              Add
                            </button>
                            )}
                          </div>
                        </td>
                        <td />
                      </tr>

                      {/* Extra item rows — description + amount on the left, no individual amount in right col */}
                      {formData.additionalRequirements.map((item, index) => (
                        <tr key={`req-${index}`} className="bg-[var(--surface)] border-t border-[var(--border)]">
                          <td colSpan={9} className="px-3 py-1.5">
                            <div className="flex gap-2 items-center min-w-0 max-w-md">
                              <input
                                className="input py-1 text-xs flex-1 min-w-[10rem] text-[var(--text-1)]"
                                value={item.description}
                                placeholder="Item name"
                                aria-label="Extra item name"
                                disabled={isReadOnlyBooking}
                                onChange={(e) => {
                                  setIsFormDirty(true);
                                  setFormData((prev) => ({
                                    ...prev,
                                    additionalRequirements: prev.additionalRequirements.map(
                                      (entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, description: e.target.value }
                                          : entry
                                    ),
                                  }));
                                }}
                              />
                              <IndianAmountInput
                                className="input py-1 text-xs w-24 text-right"
                                value={item.amount}
                                placeholder="0"
                                aria-label="Extra item amount"
                                disabled={isReadOnlyBooking}
                                onChange={(raw) => {
                                  setIsFormDirty(true);
                                  setFormData((prev) => ({
                                    ...prev,
                                    additionalRequirements: prev.additionalRequirements.map(
                                      (entry, entryIndex) =>
                                        entryIndex === index
                                          ? { ...entry, amount: raw }
                                          : entry
                                    ),
                                  }));
                                }}
                              />
                              {!isReadOnlyBooking && (
                              <button
                                type="button"
                                className="text-xs text-red-500 hover:text-red-700 dark:text-red-200 whitespace-nowrap"
                                onClick={() => {
                                  setIsFormDirty(true);
                                  setFormData((prev) => ({
                                    ...prev,
                                    additionalRequirements: prev.additionalRequirements.filter(
                                      (_, entryIndex) => entryIndex !== index
                                    ),
                                  }));
                                }}
                              >✕</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                      {/* Extras total row — label on left, total in amount column */}
                      {formData.additionalRequirements.length > 0 && (
                        <tr className="bg-[var(--surface)] border-t border-[var(--border)]">
                          <td colSpan={4} />
                          <td colSpan={4} className="px-2 py-1.5 text-right text-xs font-semibold text-[var(--text-2)]">
                            Extras Total
                          </td>
                          <td className="px-2 py-1.5 text-right text-xs font-bold text-[var(--text-1)]">
                            ₹{billingTotals.extrasSubtotal.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      )}

                      {/* Grand Total row */}
                      <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-2)]">
                        <td colSpan={7} />
                        <td className="px-2 py-2 text-right text-xs font-extrabold text-[var(--text-1)] whitespace-nowrap">Grand Total</td>
                        <td className="px-2 py-2 text-right text-base font-extrabold text-[var(--text-1)]">
                          ₹{payableGrandTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>

                      {/* Actions row */}
                      <tr className="border-t border-[var(--border)] bg-[var(--surface)]">
                        <td colSpan={8} />
                        <td className="px-3 py-2 text-right">
                          {!isReadOnlyBooking && (
                            <button
                              type="button"
                              className="btn bg-green-600 hover:bg-green-700 text-white shadow-sm whitespace-nowrap"
                              onClick={handleFinalizeBooking}
                              disabled={saving}
                            >
                              <span className="inline-flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Finalize Version
                              </span>
                            </button>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
              </div>
  );
}
