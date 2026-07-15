
import { Lock } from 'lucide-react';
import BookingFormReadOnlyView from '@/components/booking/BookingFormReadOnlyView';
import { formatDateTimeLabel } from '@/lib/date';
import {
  buildMenuItemByIdFromSnapshot,
  resolveHistorySnapshot,
  snapshotToFormReadOnlyData,
  type HallOption,
  type TemplateMenuOption,
} from '@/lib/booking-form/snapshot-to-form';
import type { MenuItemLike } from '@/lib/booking-form/types';
import { computeVersionDiff, histToSnapshot } from '@/lib/booking-form/version-history';

function VersionDiffPill({
  label,
  from,
  to,
  prefix = '',
  isNum = false,
}: {
  label: string;
  from: string | number;
  to: string | number;
  prefix?: string;
  isNum?: boolean;
}) {
  const numDelta = isNum ? Number(to) - Number(from) : 0;
  const up = isNum && numDelta > 0;
  const down = isNum && numDelta < 0;
  const baseStyle = isNum
    ? {
        background: '#2d1a00',
        color: '#fcd34d',
        border: '1px solid rgba(245, 158, 11, 0.35)',
      }
    : {
        background: 'var(--surface)',
        color: 'var(--text-2)',
        border: '1px solid var(--border)',
      };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
      style={baseStyle}
    >
      <span style={{ fontWeight: 600, opacity: 0.8 }}>{label}:</span>
      <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>
        {prefix}
        {typeof from === 'number' ? from.toLocaleString('en-IN') : from}
      </span>
      <span style={{ opacity: 0.7 }}>→</span>
      <span className={`font-semibold ${up ? 'text-green-200' : down ? 'text-red-200' : ''}`}>
        {prefix}
        {typeof to === 'number' ? to.toLocaleString('en-IN') : to}
      </span>
      {isNum && numDelta !== 0 && (
        <span className={`font-bold ${up ? 'text-green-200' : 'text-red-200'}`}>
          {up ? '▲' : '▼'}
          {Math.abs(numDelta).toLocaleString('en-IN')}
        </span>
      )}
    </span>
  );
}

export default function FinalizedVersionHistory({
  historicalVersions,
  halls,
  items,
  templateMenus,
}: {
  historicalVersions: any[];
  halls: HallOption[];
  items: MenuItemLike[];
  templateMenus: TemplateMenuOption[];
}) {
  if (historicalVersions.length === 0) return null;

  return (
    <div className="mt-8 space-y-6 border-t border-[var(--border)] pt-8">
      <h2 className="text-xl font-bold text-[var(--text-1)]">Finalized Version History</h2>
      <p className="text-sm text-[var(--text-4)] -mt-3">
        Previous immutable versions — same layout as the booking form above, read-only.
      </p>
      {historicalVersions.map((hist: any, histIdx: number) => {
        const resolved = resolveHistorySnapshot(hist);
        const historyPacks = Array.isArray(resolved?.packs) ? resolved.packs : [];
        const menuItemById = buildMenuItemByIdFromSnapshot(resolved, items);
        const formData = snapshotToFormReadOnlyData(hist, halls, templateMenus, menuItemById);

        const finalizedBy =
          hist?.finalizedMeta?.finalizedBy?.name ||
          hist?.finalizedBooking?.finalizedByUser?.name ||
          hist?.finalizedBooking?.user?.name ||
          'System';
        const finalizedAt =
          hist?.finalizedMeta?.finalizedAt || hist?.finalizedBooking?.finalizedAt || null;

        const prevHist = historicalVersions[histIdx + 1];
        const thisDiff = prevHist
          ? computeVersionDiff(histToSnapshot(hist), histToSnapshot(prevHist))
          : null;
        const hasAnyDiff =
          thisDiff &&
          (thisDiff.functionDate ||
            thisDiff.functionType ||
            thisDiff.discountAmountChange ||
            thisDiff.finalAmountChange ||
            thisDiff.advanceRequiredChange ||
            thisDiff.dueAmountChange ||
            Object.keys(thisDiff.packs).length > 0);

        const allMenuItemsForDiff = new Map<string, string>();
        historyPacks.forEach((pack: any) => {
          (pack?.bookingMenu?.items || []).forEach((entry: any) => {
            const id = entry?.itemId || entry?.item?.id;
            const name = entry?.item?.name;
            if (id && name) allMenuItemsForDiff.set(id, name);
          });
        });
        for (const item of items) {
          allMenuItemsForDiff.set(item.id, item.name);
        }

        return (
          <div
            key={hist.id}
            className="rounded-xl border-2 border-[var(--border-2)] bg-[var(--surface)] shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 bg-[var(--surface-2)] px-5 py-3 border-b border-[var(--border)]">
              <div>
                <p className="text-sm font-bold text-[var(--text-1)]">
                  Version {hist.versionNumber}
                  <span className="ml-2 inline-flex items-center rounded-full bg-[var(--surface-3)] px-2 py-0.5 text-xs font-medium text-[var(--text-2)]">
                    {hist.status}
                  </span>
                </p>
                <p className="text-xs text-[var(--text-4)] mt-0.5">
                  Finalized by <strong>{finalizedBy}</strong> on {formatDateTimeLabel(finalizedAt)}
                </p>
              </div>
              <Lock className="w-4 h-4 text-[var(--text-4)] flex-shrink-0" />
            </div>

            {hasAnyDiff && thisDiff && (
              <div className="px-5 pt-3 pb-0">
                <div className="rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-500/10 p-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-200 uppercase tracking-wide">
                    Changes from v{historicalVersions[histIdx + 1]?.versionNumber ?? '?'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {thisDiff.functionDate && (
                      <VersionDiffPill
                        label="Date"
                        from={thisDiff.functionDate.from}
                        to={thisDiff.functionDate.to}
                      />
                    )}
                    {thisDiff.functionType && (
                      <VersionDiffPill
                        label="Function"
                        from={thisDiff.functionType.from}
                        to={thisDiff.functionType.to}
                      />
                    )}
                    {thisDiff.finalAmountChange && (
                      <VersionDiffPill
                        label="Net Amount"
                        prefix="₹"
                        from={thisDiff.finalAmountChange.from}
                        to={thisDiff.finalAmountChange.to}
                        isNum
                      />
                    )}
                    {thisDiff.discountAmountChange && (
                      <VersionDiffPill
                        label="Discount"
                        prefix="₹"
                        from={thisDiff.discountAmountChange.from}
                        to={thisDiff.discountAmountChange.to}
                        isNum
                      />
                    )}
                    {thisDiff.advanceRequiredChange && (
                      <VersionDiffPill
                        label="Advance"
                        prefix="₹"
                        from={thisDiff.advanceRequiredChange.from}
                        to={thisDiff.advanceRequiredChange.to}
                        isNum
                      />
                    )}
                    {thisDiff.dueAmountChange && (
                      <VersionDiffPill
                        label="Due"
                        prefix="₹"
                        from={thisDiff.dueAmountChange.from}
                        to={thisDiff.dueAmountChange.to}
                        isNum
                      />
                    )}
                    {Object.entries(thisDiff.packs).map(([packKey, pd]) => (
                      <span key={`diff-pack-${packKey}`} className="inline-flex flex-wrap gap-1 contents">
                        {pd.paxChange && (
                          <VersionDiffPill
                            label={`${packKey} PAX`}
                            from={pd.paxChange.from}
                            to={pd.paxChange.to}
                            isNum
                          />
                        )}
                        {pd.ratePerPlateChange && (
                          <VersionDiffPill
                            label={`${packKey} Rate`}
                            prefix="₹"
                            from={pd.ratePerPlateChange.from}
                            to={pd.ratePerPlateChange.to}
                            isNum
                          />
                        )}
                        {pd.hallRateChange && (
                          <VersionDiffPill
                            label={`${packKey} Hall`}
                            prefix="₹"
                            from={pd.hallRateChange.from}
                            to={pd.hallRateChange.to}
                            isNum
                          />
                        )}
                        {pd.addedItemIds.map((id) => (
                          <span
                            key={`add-${id}`}
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: '#052e16',
                              color: '#86efac',
                              border: '1px solid rgba(34, 197, 94, 0.4)',
                            }}
                          >
                            + {allMenuItemsForDiff.get(id) || id}
                          </span>
                        ))}
                        {pd.removedItemIds.map((id) => (
                          <span
                            key={`rem-${id}`}
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: '#2d0a0a',
                              color: '#fca5a5',
                              border: '1px solid rgba(239, 68, 68, 0.4)',
                            }}
                          >
                            − {allMenuItemsForDiff.get(id) || id}
                          </span>
                        ))}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="px-5 py-4">
              <BookingFormReadOnlyView
                formData={formData}
                apiPacks={historyPacks}
                halls={halls}
                menuItemById={menuItemById}
                packDiff={thisDiff?.packs}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
