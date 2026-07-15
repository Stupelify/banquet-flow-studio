import { describe, expect, it } from 'vitest';
import {
  computeVersionDiff,
  histToSnapshot,
  type DiffSnapshot,
} from '../version-history';

describe('version-history', () => {
  const base: DiffSnapshot = {
    functionDate: '2026-06-01',
    functionType: 'Wedding',
    discountAmount: 1000,
    finalAmount: 9000,
    advanceRequired: 5000,
    dueAmount: 4000,
    packs: [],
  };

  it('detects due amount changes between versions', () => {
    const newer = { ...base, dueAmount: 2000 };
    const diff = computeVersionDiff(newer, base);
    expect(diff.dueAmountChange).toEqual({ from: 4000, to: 2000 });
  });

  it('normalizes history entries into diff snapshots', () => {
    const snap = histToSnapshot({
      functionDate: '2026-06-01',
      functionType: 'Wedding',
      dueAmountValue: 944500,
      finalAmountValue: 1444500,
      packs: [],
    });
    expect(snap.dueAmount).toBe(944500);
    expect(snap.finalAmount).toBe(1444500);
  });
});
