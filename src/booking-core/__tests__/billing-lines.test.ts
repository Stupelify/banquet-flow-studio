import { describe, expect, it } from 'vitest';
import {
  buildBookingHallRows,
  computeExtrasSubtotal,
  computeMealsSubtotal,
  computePackCateringAmount,
  computePackHallAmount,
  computePackRowAmount,
  computePackRowAmountFromApiPack,
  computePreDiscountTotal,
  sumPackHallRates,
} from '../index';
import type { PackBillingRow } from '../index';

const baseRow = (overrides: Partial<PackBillingRow> = {}): PackBillingRow => ({
  enabled: true,
  withCatering: true,
  withHall: true,
  ratePerPlate: '100',
  pax: '10',
  setupCost: '0',
  extraCharges: 0,
  hallRate: '50000',
  ...overrides,
});

const fourPacks = (patch: Partial<Record<string, Partial<PackBillingRow>>>) => ({
  breakfast: baseRow(patch.breakfast),
  lunch: baseRow(patch.lunch),
  hiTea: baseRow(patch.hiTea),
  dinner: baseRow(patch.dinner),
});

// ---- ported verbatim from client billing-lines.test.ts ----
describe('computePackRowAmount', () => {
  it('does not multiply hall rate by number of halls', () => {
    const row = baseRow({ hallRate: '50000' });
    expect(computePackRowAmount(row)).toBe(10 * 100 + 50000);
  });

  it('returns 0 when pack disabled', () => {
    expect(computePackRowAmount(baseRow({ enabled: false }))).toBe(0);
  });
});

describe('computeMealsSubtotal', () => {
  it('sums only enabled packs', () => {
    const packs = fourPacks({
      breakfast: { enabled: true, hallRate: '1000' },
      lunch: { enabled: false, hallRate: '9000' },
      hiTea: { enabled: false },
      dinner: { enabled: false },
    });
    expect(computeMealsSubtotal(packs)).toBe(1000 + 1000);
  });

  it('sums hall rate per meal when same hall on two meals', () => {
    const packs = fourPacks({
      breakfast: { hallRate: '50000' },
      lunch: { hallRate: '50000' },
      hiTea: { enabled: false },
      dinner: { enabled: false },
    });
    const b = computePackRowAmount(packs.breakfast);
    const l = computePackRowAmount(packs.lunch);
    expect(computeMealsSubtotal(packs)).toBe(b + l);
  });
});

describe('computePreDiscountTotal', () => {
  it('includes extras', () => {
    const packs = fourPacks({
      lunch: { enabled: false },
      hiTea: { enabled: false },
      dinner: { enabled: false },
    });
    expect(computePreDiscountTotal(packs, [{ amount: '500' }])).toBe(
      computeMealsSubtotal(packs) + 500
    );
  });
});

describe('buildBookingHallRows', () => {
  it('lists unique halls with zero charges', () => {
    const rows = buildBookingHallRows([
      { validHallIds: ['h1', 'h2', 'h3'] },
      { validHallIds: ['h2'] },
    ]);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.charges === 0)).toBe(true);
  });
});

// ---- added edge cases ----
describe('computePackCateringAmount (edge cases)', () => {
  it('is zero when the pack is disabled', () => {
    expect(computePackCateringAmount(baseRow({ enabled: false }))).toBe(0);
  });

  it('drops rate/pax but keeps setup + extras when catering is off', () => {
    const row = baseRow({ withCatering: false, setupCost: '500', extraCharges: 200 });
    expect(computePackCateringAmount(row)).toBe(700);
  });

  it('clamps negative rate to zero', () => {
    const row = baseRow({ ratePerPlate: '-50', pax: '10', setupCost: '0', extraCharges: 0, withHall: false });
    expect(computePackCateringAmount(row)).toBe(0);
  });
});

describe('computePackHallAmount (edge cases)', () => {
  it('is zero when hall is not selected', () => {
    expect(computePackHallAmount(baseRow({ withHall: false }))).toBe(0);
  });
  it('is the hall rate once when selected', () => {
    expect(computePackHallAmount(baseRow({ withHall: true, hallRate: '30000' }))).toBe(30000);
  });
});

describe('computeExtrasSubtotal (edge cases)', () => {
  it('clamps negatives and ignores non-numeric amounts', () => {
    expect(
      computeExtrasSubtotal([{ amount: '500' }, { amount: '-100' }, { amount: 'abc' }])
    ).toBe(500);
  });
});

describe('sumPackHallRates / computePackRowAmountFromApiPack (edge cases)', () => {
  it('sums hall amounts across rows', () => {
    expect(
      sumPackHallRates([
        baseRow({ withHall: true, hallRate: '50000' }),
        baseRow({ withHall: false, hallRate: '99999' }),
        baseRow({ withHall: true, hallRate: '30000' }),
      ])
    ).toBe(80000);
  });

  it('prefers hallRateValue and rounds the API row amount', () => {
    expect(
      computePackRowAmountFromApiPack({
        ratePerPlate: 100,
        packCount: 10,
        hallRate: 99999,
        hallRateValue: 50000,
      })
    ).toBe(50000 + 1000);
  });
});
