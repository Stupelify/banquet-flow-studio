import { describe, expect, it } from 'vitest';
import { computeMealsSubtotal } from '@bika/booking-core';
import { readPackHallRate, packHasHallCharge } from '../map-api-pack';
import { createEmptyPacks, type BookingPackRow } from '../form-types';

describe('readPackHallRate', () => {
  it('prefers hallRateValue over hallRate string', () => {
    expect(readPackHallRate({ hallRateValue: 50000, hallRate: '1000' })).toBe('50000');
  });

  it('falls back to hallRate when hallRateValue is null', () => {
    expect(readPackHallRate({ hallRateValue: null, hallRate: '25000' })).toBe('25000');
  });

  it('returns empty when neither field is set', () => {
    expect(readPackHallRate({ hallRateValue: null, hallRate: '' })).toBe('');
  });
});

describe('packHasHallCharge', () => {
  it('is true when only hallRateValue is set', () => {
    expect(packHasHallCharge({ hallRateValue: 10000 })).toBe(true);
  });
});

describe('hall rate in form packs', () => {
  it('meals subtotal includes hallRateValue-only pack charge', () => {
    const packs = createEmptyPacks();
    const lunch: BookingPackRow = {
      ...packs.lunch,
      enabled: true,
      withCatering: true,
      withHall: true,
      ratePerPlate: '100',
      pax: '100',
      hallRate: readPackHallRate({ hallRateValue: 50000, hallRate: '' }),
    };
    packs.lunch = lunch;
    expect(computeMealsSubtotal(packs)).toBe(100 * 100 + 50000);
  });
});
