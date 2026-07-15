import { describe, expect, it } from 'vitest';
import { computeMealsSubtotal } from '@bika/booking-core';
import { snapshotToFormReadOnlyData } from '../snapshot-to-form';

describe('snapshotToFormReadOnlyData', () => {
  it('loads hallRate from hallRateValue for finalized snapshot packs', () => {
    const form = snapshotToFormReadOnlyData(
      {
        functionDate: '2026-06-15',
        functionType: 'Wedding',
        finalAmountValue: 360000,
        discountAmount: 69000,
        discountPercentage: 16.08,
        packs: [
          {
            id: 'pack-1',
            packName: 'lunch',
            ratePerPlate: 50,
            packCount: 1000,
            hallRate: '',
            hallRateValue: 179000,
          },
          {
            id: 'pack-2',
            packName: 'dinner',
            ratePerPlate: 50,
            packCount: 1000,
            hallRate: '',
            hallRateValue: 150000,
          },
        ],
        additionalItems: [],
      },
      [],
      []
    );

    expect(form.packs.lunch.hallRate).toBe('179000');
    expect(form.packs.dinner.hallRate).toBe('150000');
    expect(form.packs.lunch.withHall).toBe(true);

    const mealsSubtotal = computeMealsSubtotal(form.packs);
    expect(mealsSubtotal).toBe(429000);
    expect(form.finalAmount).toBe('360000');
    expect(Number(form.finalDiscountAmount)).toBe(69000);
  });

  it('loads a hall-only pack (ratePerPlate 0, no menu items) as non-catering', () => {
    const form = snapshotToFormReadOnlyData(
      {
        functionDate: '2026-06-16',
        functionType: 'Other',
        packs: [
          {
            id: 'pack-1',
            packName: 'lunch',
            ratePerPlate: 0,
            packCount: 1,
            hallRate: '',
            hallRateValue: 50000,
            bookingMenu: { items: [] },
          },
        ],
        additionalItems: [],
      },
      [],
      []
    );

    expect(form.packs.lunch.withCatering).toBe(false);
    expect(form.packs.lunch.withHall).toBe(true);
  });
});
