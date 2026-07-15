/** Version diff helpers for finalized booking history. */

export type DiffPackSnapshot = {
  packName: string;
  pax: number;
  ratePerPlate: number;
  hallRate: number;
  menuItemIds: string[];
};

export type DiffSnapshot = {
  functionDate: string;
  functionType: string;
  discountAmount: number;
  finalAmount: number;
  advanceRequired: number;
  dueAmount: number;
  packs: DiffPackSnapshot[];
};

export type VersionDiff = {
  functionDate?: { from: string; to: string };
  functionType?: { from: string; to: string };
  discountAmountChange?: { from: number; to: number };
  finalAmountChange?: { from: number; to: number };
  advanceRequiredChange?: { from: number; to: number };
  dueAmountChange?: { from: number; to: number };
  packs: Record<
    string,
    {
      paxChange?: { from: number; to: number };
      ratePerPlateChange?: { from: number; to: number };
      hallRateChange?: { from: number; to: number };
      addedItemIds: string[];
      removedItemIds: string[];
    }
  >;
};

export function computeVersionDiff(newer: DiffSnapshot, older: DiffSnapshot): VersionDiff {
  const diff: VersionDiff = { packs: {} };
  if (newer.functionDate !== older.functionDate)
    diff.functionDate = { from: older.functionDate, to: newer.functionDate };
  if (newer.functionType !== older.functionType)
    diff.functionType = { from: older.functionType, to: newer.functionType };
  if (Math.abs(newer.discountAmount - older.discountAmount) > 0.001)
    diff.discountAmountChange = { from: older.discountAmount, to: newer.discountAmount };
  if (Math.abs(newer.finalAmount - older.finalAmount) > 0.001)
    diff.finalAmountChange = { from: older.finalAmount, to: newer.finalAmount };
  if (Math.abs(newer.advanceRequired - older.advanceRequired) > 0.001)
    diff.advanceRequiredChange = { from: older.advanceRequired, to: newer.advanceRequired };
  if (Math.abs(newer.dueAmount - older.dueAmount) > 0.001)
    diff.dueAmountChange = { from: older.dueAmount, to: newer.dueAmount };

  const olderPackMap = new Map(older.packs.map((p) => [p.packName.toLowerCase(), p]));
  const newerPackMap = new Map(newer.packs.map((p) => [p.packName.toLowerCase(), p]));
  const allPackNames = new Set([...Array.from(olderPackMap.keys()), ...Array.from(newerPackMap.keys())]);
  allPackNames.forEach((key) => {
    const o = olderPackMap.get(key);
    const n = newerPackMap.get(key);
    const packDiff: VersionDiff['packs'][string] = {
      addedItemIds: [],
      removedItemIds: [],
    };
    if (o && n) {
      if (o.pax !== n.pax) packDiff.paxChange = { from: o.pax, to: n.pax };
      if (Math.abs(o.ratePerPlate - n.ratePerPlate) > 0.001)
        packDiff.ratePerPlateChange = { from: o.ratePerPlate, to: n.ratePerPlate };
      if (Math.abs(o.hallRate - n.hallRate) > 0.001)
        packDiff.hallRateChange = { from: o.hallRate, to: n.hallRate };
      const oldSet = new Set(o.menuItemIds);
      const newSet = new Set(n.menuItemIds);
      packDiff.addedItemIds = n.menuItemIds.filter((id) => !oldSet.has(id));
      packDiff.removedItemIds = o.menuItemIds.filter((id) => !newSet.has(id));
    } else if (!o && n) {
      packDiff.addedItemIds = [...n.menuItemIds];
    } else if (o && !n) {
      packDiff.removedItemIds = [...o.menuItemIds];
    }
    const hasDiff =
      packDiff.paxChange ||
      packDiff.ratePerPlateChange ||
      packDiff.hallRateChange ||
      packDiff.addedItemIds.length > 0 ||
      packDiff.removedItemIds.length > 0;
    if (hasDiff) diff.packs[key] = packDiff;
  });
  return diff;
}

export function histToSnapshot(hist: any): DiffSnapshot {
  const resolved =
    hist?.snapshotData && typeof hist.snapshotData === 'object' ? hist.snapshotData : hist;
  const histPacks: any[] = Array.isArray(resolved?.packs) ? resolved.packs : [];
  return {
    functionDate: (resolved?.functionDate || hist?.functionDate || '').slice(0, 10),
    functionType: resolved?.functionType || hist?.functionType || '',
    discountAmount: Number(
      resolved?.discountAmountValue ?? resolved?.discountAmount ?? hist?.discountAmount ?? 0
    ),
    finalAmount: Number(
      resolved?.finalAmountValue ??
        resolved?.finalAmount ??
        hist?.finalAmount ??
        resolved?.grandTotal ??
        hist?.grandTotal ??
        0
    ),
    advanceRequired: Number(
      resolved?.advanceRequiredValue ?? resolved?.advanceRequired ?? hist?.advanceRequired ?? 0
    ),
    dueAmount: Number(resolved?.dueAmountValue ?? resolved?.dueAmount ?? hist?.dueAmount ?? 0),
    packs: histPacks.map((pack: any) => {
      const packName = (pack?.packName || pack?.mealSlot?.name || '').trim();
      const menuItemIds: string[] = (pack?.bookingMenu?.items || [])
        .map((e: any) => e?.itemId || e?.item?.id || '')
        .filter(Boolean);
      return {
        packName,
        pax: Number(pack?.packCount ?? pack?.noOfPack ?? 0),
        ratePerPlate: Number(pack?.ratePerPlate ?? 0),
        hallRate: Number(pack?.hallRateValue ?? pack?.hallRate ?? 0),
        menuItemIds,
      };
    }),
  };
}
