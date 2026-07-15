
import { useMemo, useState } from 'react';
import {
  computePackRowAmount,
  computePackRowAmountFromApiPack,
  computeExtrasSubtotal,
  computeMealsSubtotal,
  computePayableGrandTotal,
  formatRupeeAmount,
} from '@bika/booking-core';
import { IndianAmountInput } from '@/components/IndianAmountInput';
import { AutoResizeTextarea } from '@/components/AutoResizeTextarea';
import BookingMenuViewModal from '@/components/booking/BookingMenuViewModal';
import BookingTermsSection from '@/components/booking/BookingTermsSection';
import {
  PACK_BG_MAP,
  PACK_COLOR_MAP,
  PACK_LABELS,
  type PackKey,
} from '@/lib/booking-form/constants';
import type { BookingFormReadOnlyData, BookingPackRow } from '@/lib/booking-form/form-types';
import type { HallOption } from '@/lib/booking-form/snapshot-to-form';
import type { MenuItemLike } from '@/lib/booking-form/types';
import type { VersionDiff } from '@/lib/booking-form/version-history';

const PRIMARY_CUSTOMER_FIELD_CH = 20 + 12 + 4;

export default function BookingFormReadOnlyView({
  formData,
  apiPacks = [],
  halls,
  menuItemById,
  packDiff,
}: {
  formData: BookingFormReadOnlyData;
  apiPacks?: any[];
  halls: HallOption[];
  menuItemById: Map<string, MenuItemLike>;
  packDiff?: VersionDiff['packs'];
}) {
  const [menuEditorPack, setMenuEditorPack] = useState<PackKey | null>(null);

  const apiPackByKey = useMemo(() => {
    const map = new Map<PackKey, any>();
    for (const pack of apiPacks) {
      const key = (pack?.packName || pack?.mealSlot?.name || '').toLowerCase();
      if (key.includes('breakfast')) map.set('breakfast', pack);
      else if (key.includes('lunch')) map.set('lunch', pack);
      else if (key.includes('hi') || key.includes('tea')) map.set('hiTea', pack);
      else if (key.includes('dinner')) map.set('dinner', pack);
    }
    return map;
  }, [apiPacks]);

  const packRowAmount = (packKey: PackKey, row: BookingPackRow): string => {
    const apiPack = apiPackByKey.get(packKey);
    if (apiPack) return formatRupeeAmount(computePackRowAmountFromApiPack(apiPack));
    return formatRupeeAmount(computePackRowAmount(row));
  };

  const billingTotals = useMemo(() => {
    const mealsSubtotal =
      apiPacks.length > 0
        ? apiPacks.reduce(
            (sum, pack) => sum + computePackRowAmountFromApiPack(pack),
            0
          )
        : computeMealsSubtotal(formData.packs);
    const extrasSubtotal = computeExtrasSubtotal(formData.additionalRequirements);
    return { mealsSubtotal, extrasSubtotal, preDiscountTotal: mealsSubtotal + extrasSubtotal };
  }, [apiPacks, formData.packs, formData.additionalRequirements]);

  const payableGrandTotal = useMemo(
    () =>
      computePayableGrandTotal(
        parseFloat(formData.finalAmount || '0') || billingTotals.mealsSubtotal,
        billingTotals.extrasSubtotal
      ),
    [formData.finalAmount, billingTotals.mealsSubtotal, billingTotals.extrasSubtotal]
  );

  const activeMenuPackRow = menuEditorPack ? formData.packs[menuEditorPack] : null;

  return (
    <div className="space-y-5 pointer-events-auto">
      <section className="rounded-2xl border border-[var(--border-2)] p-4">
        <div className="space-y-3">
          <h3 className="text-2xl font-semibold text-[var(--text-1)]">Booking Details</h3>

          <div className="hidden md:flex md:flex-wrap md:items-end md:gap-3">
            <div
              className="min-w-0 shrink-0 space-y-1.5"
              style={{ width: `calc(${PRIMARY_CUSTOMER_FIELD_CH}ch + 2.5rem)` }}
            >
              <span className="label block">Primary Customer</span>
              <input className="input truncate bg-[var(--surface-2)]" value={formData.primaryCustomerLabel} readOnly />
            </div>
            <div className="w-[4.5rem] shrink-0 space-y-1.5">
              <label className="label block">Priority</label>
              <input className="input bg-[var(--surface-2)]" value={formData.priority} readOnly />
            </div>
            <div className="w-[11.5rem] shrink-0 space-y-1.5">
              <label className="label block">Function Date</label>
              <input className="input bg-[var(--surface-2)]" type="date" value={formData.functionDate} readOnly />
            </div>
          </div>

          <div className="hidden md:flex md:items-end md:gap-3">
            <div className="shrink-0 space-y-1.5 min-w-[12rem]">
              <label className="label block">Function Type</label>
              <input className="input bg-[var(--surface-2)]" value={formData.functionType} readOnly />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="label block">Referred By</label>
              <input className="input bg-[var(--surface-2)]" value={formData.referredByLabel || '—'} readOnly />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <label className="label block">Second Customer</label>
              <input className="input bg-[var(--surface-2)]" value={formData.secondCustomerLabel || '—'} readOnly />
            </div>
          </div>

          {/* Phone layout: the two flex rows above are desktop-only (hidden md:flex),
              so mirror the same fields stacked for small screens. */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            <div className="col-span-2 space-y-1.5">
              <label className="label block">Primary Customer</label>
              <input className="input w-full bg-[var(--surface-2)]" value={formData.primaryCustomerLabel} readOnly />
            </div>
            <div className="space-y-1.5">
              <label className="label block">Priority</label>
              <input className="input w-full bg-[var(--surface-2)]" value={formData.priority} readOnly />
            </div>
            <div className="space-y-1.5">
              <label className="label block">Function Date</label>
              <input className="input w-full bg-[var(--surface-2)]" type="date" value={formData.functionDate} readOnly />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="label block">Function Type</label>
              <input className="input w-full bg-[var(--surface-2)]" value={formData.functionType} readOnly />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="label block">Referred By</label>
              <input className="input w-full bg-[var(--surface-2)]" value={formData.referredByLabel || '—'} readOnly />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="label block">Second Customer</label>
              <input className="input w-full bg-[var(--surface-2)]" value={formData.secondCustomerLabel || '—'} readOnly />
            </div>
          </div>

          {formData.isPencilBooking && formData.pencilExpiresAt && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
              Pencil booking — expires {formData.pencilExpiresAt}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="rounded-2xl border border-[var(--border)] overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
          <table className="w-full min-w-[880px] text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--surface-2)] border-b border-[var(--border)]">
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)]">Meal</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)]">Banquet</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)]">Hall</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] min-w-[200px]">Time</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)]">Menu</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] min-w-[60px]">PAX</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] min-w-[70px]">Rate/Plate</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-[var(--text-2)] min-w-[70px]">Hall Rate</th>
                <th className="px-2 py-2 text-right text-xs font-semibold text-[var(--text-2)]">Amount</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PACK_LABELS) as PackKey[]).map((packKey) => {
                const row = formData.packs[packKey];
                const packDiffKey = PACK_LABELS[packKey].toLowerCase();
                const pd = packDiff?.[packDiffKey];
                const filteredHalls = halls.filter(
                  (hall) => !row.banquetId || hall.banquet?.id === row.banquetId
                );
                const selectedHallNames = filteredHalls
                  .filter((hall) => row.hallIds.includes(hall.id))
                  .map((hall) => hall.name);
                const banquetName =
                  filteredHalls.find((h) => row.hallIds.includes(h.id))?.banquet?.name || '—';
                const menuAdded = pd?.addedItemIds.length ?? 0;
                const menuRemoved = pd?.removedItemIds.length ?? 0;
                const hasMenuDiff = menuAdded > 0 || menuRemoved > 0;

                return (
                  <tr
                    key={packKey}
                    className={`border-b border-[var(--border)] ${!row.enabled ? 'opacity-50' : ''} ${PACK_BG_MAP[packKey]}`}
                    style={{ borderLeft: `3px solid ${PACK_COLOR_MAP[packKey]}` }}
                  >
                    <td className="px-2 py-2 align-top min-w-[140px]">
                      <div className="flex flex-col gap-1">
                        <label className="inline-flex items-center gap-1.5">
                          <input type="checkbox" className="h-4 w-4 rounded" checked={row.enabled} disabled readOnly />
                          <span className="text-xs font-semibold text-[var(--text-1)]">{PACK_LABELS[packKey]}</span>
                        </label>
                        <div className="flex gap-2 pl-0.5">
                          <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
                            <input type="checkbox" className="h-3.5 w-3.5 rounded" checked={row.withHall} disabled readOnly />
                            Hall
                          </label>
                          <label className="inline-flex items-center gap-1 text-xs text-[var(--text-2)]">
                            <input type="checkbox" className="h-3.5 w-3.5 rounded" checked={row.withCatering} disabled readOnly />
                            Cat.
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input className="input py-1 text-xs bg-[var(--surface-2)]" value={banquetName} readOnly />
                    </td>
                    <td className="px-2 py-2 align-top min-w-[120px]">
                      <input
                        className="input py-1 text-xs bg-[var(--surface-2)]"
                        value={selectedHallNames.join(', ') || '—'}
                        readOnly
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex items-center gap-1">
                        <input className="input py-1 text-xs w-[5.5rem] bg-[var(--surface-2)]" type="time" value={row.startTime} readOnly />
                        <span className="text-[var(--text-4)]">–</span>
                        <input className="input py-1 text-xs w-[5.5rem] bg-[var(--surface-2)]" type="time" value={row.endTime} readOnly />
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top min-w-[100px]">
                      <button
                        type="button"
                        className={`btn py-1 text-xs w-full ${hasMenuDiff ? 'btn-warning' : 'btn-secondary'}`}
                        onClick={() => setMenuEditorPack(packKey)}
                        disabled={!row.enabled}
                      >
                        {Number(row.menuPoints) > 0
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
                    <td className="px-2 py-2 align-top">
                      <input
                        className={`input py-1 text-xs w-full text-right bg-[var(--surface-2)]${pd?.paxChange ? ' ring-2 ring-amber-300' : ''}`}
                        value={row.pax}
                        readOnly
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        className={`input py-1 text-xs w-full text-right bg-[var(--surface-2)]${pd?.ratePerPlateChange ? ' ring-2 ring-amber-300' : ''}`}
                        value={row.ratePerPlate ? `₹${Number(row.ratePerPlate).toLocaleString('en-IN')}` : ''}
                        readOnly
                      />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <input
                        className={`input py-1 text-xs w-full text-right bg-[var(--surface-2)]${pd?.hallRateChange ? ' ring-2 ring-amber-300' : ''}`}
                        value={row.hallRate ? `₹${Number(row.hallRate).toLocaleString('en-IN')}` : ''}
                        readOnly
                      />
                    </td>
                    <td className="px-2 py-2 align-top min-w-[100px]">
                      <input
                        className="input py-1 text-xs w-full text-right bg-[var(--surface-2)] font-medium"
                        value={row.enabled ? packRowAmount(packKey, row) : ''}
                        readOnly
                      />
                    </td>
                  </tr>
                );
              })}

              <tr>
                <td colSpan={9} className="border-t-2 border-[var(--border)] p-0" />
              </tr>
              <tr className="bg-[var(--surface)]">
                <td colSpan={7} />
                <td className="px-2 py-2 text-right text-xs font-bold text-[var(--text-1)]">Total</td>
                <td className="px-2 py-2 text-right text-sm font-bold text-[var(--text-1)]">
                  ₹{billingTotals.mealsSubtotal.toLocaleString('en-IN')}
                </td>
              </tr>
              <tr className="bg-red-50 dark:bg-red-900/20">
                <td colSpan={5} />
                <td className="px-2 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-[var(--text-3)]">Disc %</span>
                    <input
                      className="input py-1 text-xs w-16 text-right bg-[var(--surface-2)]"
                      value={formData.finalDiscountPercent}
                      readOnly
                    />
                  </div>
                </td>
                <td colSpan={1} />
                <td className="px-2 py-1.5 text-right text-xs font-semibold text-red-700 dark:text-red-200">Discount</td>
                <td className="px-2 py-1.5">
                  <input
                    className="input py-1 text-xs w-full text-right bg-[var(--surface-2)] text-red-700 dark:text-red-200"
                    value={`₹${Number(formData.finalDiscountAmount || 0).toLocaleString('en-IN')}`}
                    readOnly
                  />
                </td>
              </tr>
              <tr className="bg-teal-50 dark:bg-teal-900/20">
                <td colSpan={7} />
                <td className="px-2 py-1.5 text-right text-xs font-bold text-teal-700 dark:text-teal-200">Net Amount</td>
                <td className="px-2 py-1.5">
                  <input
                    className="input py-1 text-xs w-full text-right font-semibold text-teal-700 dark:text-teal-200 bg-[var(--surface-2)]"
                    value={`₹${Number(formData.finalAmount || 0).toLocaleString('en-IN')}`}
                    readOnly
                  />
                </td>
              </tr>

              <tr className="bg-[var(--surface-2)] border-t border-[var(--border)]">
                <td colSpan={8} className="px-3 py-1.5">
                  <span className="text-xs font-semibold text-[var(--text-2)]">Extra Items</span>
                </td>
                <td />
              </tr>

              {formData.additionalRequirements.map((item, index) => (
                <tr key={`req-ro-${index}`} className="bg-[var(--surface)] border-t border-[var(--border)]">
                  <td colSpan={9} className="px-3 py-1.5">
                    <div className="flex gap-2 items-center min-w-0 max-w-md">
                      <input
                        className="input py-1 text-xs flex-1 min-w-[10rem] bg-[var(--surface-2)] text-[var(--text-1)]"
                        value={item.description}
                        readOnly
                      />
                      <div className="w-24 shrink-0">
                        <IndianAmountInput
                          className="input py-1 text-xs w-full text-right bg-[var(--surface-2)]"
                          value={item.amount}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}

              {formData.additionalRequirements.length > 0 && (
                <tr className="bg-[var(--surface)] border-t border-[var(--border)]">
                  <td colSpan={8} className="px-3 py-1.5 text-right text-xs font-semibold text-[var(--text-2)]">
                    Extras Total
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs font-bold text-[var(--text-1)]">
                    ₹{billingTotals.extrasSubtotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              )}

              <tr className="border-t-2 border-[var(--border)] bg-[var(--surface-2)]">
                <td colSpan={7} />
                <td className="px-2 py-2 text-right text-xs font-extrabold text-[var(--text-1)]">Grand Total</td>
                <td className="px-2 py-2 text-right text-base font-extrabold text-[var(--text-1)]">
                  ₹{payableGrandTotal.toLocaleString('en-IN')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div>
        <label className="label">Notes</label>
        <AutoResizeTextarea
          className="input bg-[var(--surface-2)]"
          value={formData.notes}
          readOnly
        />
      </div>

      {/* Mirror the live form's Terms & Conditions so version history is complete. */}
      <BookingTermsSection />

      <BookingMenuViewModal
        open={Boolean(menuEditorPack)}
        packLabel={menuEditorPack ? PACK_LABELS[menuEditorPack] : ''}
        packRow={activeMenuPackRow}
        menuItemById={menuItemById}
        onClose={() => setMenuEditorPack(null)}
      />
    </div>
  );
}
