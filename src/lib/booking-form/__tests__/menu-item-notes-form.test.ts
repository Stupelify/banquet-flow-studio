import { describe, expect, it } from 'vitest';
import { buildMenuItemsPayload } from '@bika/booking-core';
import { clearedCateringFieldsPatch } from '../pack-catering';
import { snapshotToFormReadOnlyData } from '../snapshot-to-form';

describe('menu item notes form state', () => {
  it('hydrates pack menu item notes from booking menu items', () => {
    const form = snapshotToFormReadOnlyData(
      {
        functionDate: '2026-07-14',
        functionType: 'Wedding',
        packs: [
          {
            id: 'pack-1',
            packName: 'lunch',
            ratePerPlate: 300,
            packCount: 100,
            bookingMenu: {
              items: [
                { itemId: 'item-1', notes: 'less spicy' },
                { item: { id: 'item-2' }, notes: '  no nuts  ' },
                { itemId: 'item-3', notes: '   ' },
              ],
            },
          },
        ],
        additionalItems: [],
      },
      [],
      []
    );

    expect(form.packs.lunch.menuItemIds).toEqual(['item-1', 'item-2', 'item-3']);
    expect(form.packs.lunch.menuItemNotes).toEqual({
      'item-1': 'less spicy',
      'item-2': 'no nuts',
    });
  });

  it('omits empty and orphan notes from save payload items', () => {
    expect(
      buildMenuItemsPayload(['item-1', 'item-2'], {
        'item-1': '  less spicy  ',
        'item-2': '   ',
        orphan: 'do not send',
      })
    ).toEqual([
      { itemId: 'item-1', quantity: 1, notes: 'less spicy' },
      { itemId: 'item-2', quantity: 1 },
    ]);
  });

  it('clears notes when catering fields are cleared', () => {
    expect(clearedCateringFieldsPatch()).toMatchObject({
      menuItemIds: [],
      menuItemNotes: {},
    });
  });
});
