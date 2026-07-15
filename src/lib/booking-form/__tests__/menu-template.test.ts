import { describe, expect, it } from 'vitest';
import {
  buildItemByIdMap,
  calculateMenuPointsFromMap,
  countNewTemplateItems,
  extractTemplateItemIds,
  mergeTemplateItemIds,
} from '../menu-template';

describe('mergeTemplateItemIds', () => {
  it('keeps existing items and appends new template items', () => {
    expect(mergeTemplateItemIds(['a', 'b'], ['b', 'c', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedupes within merged result', () => {
    expect(mergeTemplateItemIds(['a'], ['a', 'b'])).toEqual(['a', 'b']);
  });

  it('ignores empty template ids', () => {
    expect(mergeTemplateItemIds(['a'], ['', 'b', undefined as unknown as string])).toEqual([
      'a',
      'b',
    ]);
  });
});

describe('extractTemplateItemIds', () => {
  it('filters missing item relations', () => {
    expect(
      extractTemplateItemIds([
        { item: { id: 'x' } },
        { item: null },
        {},
      ])
    ).toEqual(['x']);
  });
});

describe('buildItemByIdMap and points', () => {
  it('resolves items from extras not in catalog', () => {
    const map = buildItemByIdMap(
      [{ id: 'a', name: 'A', points: 1 }],
      [{ id: 'z', name: 'Z', points: 5 }]
    );
    expect(calculateMenuPointsFromMap(['a', 'z'], map)).toBe('6');
  });
});

describe('countNewTemplateItems', () => {
  it('counts only ids not already selected', () => {
    expect(countNewTemplateItems(['a', 'b'], ['b', 'c'])).toBe(1);
  });
});
