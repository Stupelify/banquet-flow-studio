import { describe, expect, it } from 'vitest';
import {
  MIN_CATERING_RATE_PER_PLATE,
  clearedCateringFieldsPatch,
  clearedHallFieldsPatch,
  inferWithCateringFromPack,
  packRowHasCateringDataToClear,
  packRowHasHallDataToClear,
  validatePackCateringForSave,
} from '../pack-catering';

describe('inferWithCateringFromPack', () => {
  it('is off when rate is below minimum', () => {
    expect(inferWithCateringFromPack({ ratePerPlate: 199 })).toBe(false);
    expect(inferWithCateringFromPack({ ratePerPlate: 0 })).toBe(false);
  });

  it('is on when rate meets minimum', () => {
    expect(inferWithCateringFromPack({ ratePerPlate: 200 })).toBe(true);
  });

  it('falls back to bookingMenu rate', () => {
    expect(
      inferWithCateringFromPack({
        ratePerPlate: 0,
        bookingMenu: { ratePerPlate: 250 },
      })
    ).toBe(true);
  });
});

describe('validatePackCateringForSave', () => {
  it('requires minimum rate when catering is on', () => {
    expect(
      validatePackCateringForSave({
        withCatering: true,
        ratePerPlate: '150',
        pax: '100',
        menuItemIds: [],
        menuItemNotes: {},
      })
    ).toMatch(new RegExp(`${MIN_CATERING_RATE_PER_PLATE}`));
  });

  it('allows catering off with zero rate', () => {
    expect(
      validatePackCateringForSave({
        withCatering: false,
        ratePerPlate: '',
        pax: '',
        menuItemIds: [],
        menuItemNotes: {},
      })
    ).toBeNull();
  });
});

describe('packRowHasCateringDataToClear', () => {
  it('detects populated catering fields', () => {
    expect(
      packRowHasCateringDataToClear({
        withCatering: true,
        menuItemIds: ['a'],
        menuItemNotes: {},
        pax: '',
        ratePerPlate: '',
      })
    ).toBe(true);
  });
});

describe('clearedCateringFieldsPatch', () => {
  it('clears catering fields and turns catering off', () => {
    expect(clearedCateringFieldsPatch()).toEqual({
      withCatering: false,
      menuItemIds: [],
      menuItemNotes: {},
      menuPoints: '',
      templateMenuId: '',
      pax: '',
      ratePerPlate: '',
    });
  });
});

describe('packRowHasHallDataToClear', () => {
  it('detects hall selections and rate', () => {
    expect(
      packRowHasHallDataToClear({
        banquetId: 'b1',
        hallIds: [],
        hallRate: '',
      })
    ).toBe(true);
    expect(
      packRowHasHallDataToClear({
        banquetId: '',
        hallIds: ['h1'],
        hallRate: '',
      })
    ).toBe(true);
    expect(
      packRowHasHallDataToClear({
        banquetId: '',
        hallIds: [],
        hallRate: '50000',
      })
    ).toBe(true);
    expect(
      packRowHasHallDataToClear({
        banquetId: '',
        hallIds: [],
        hallRate: '',
      })
    ).toBe(false);
  });
});

describe('clearedHallFieldsPatch', () => {
  it('clears hall fields and turns hall off', () => {
    expect(clearedHallFieldsPatch()).toEqual({
      withHall: false,
      banquetId: '',
      hallIds: [],
      hallRate: '',
    });
  });
});
