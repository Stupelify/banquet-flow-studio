import { describe, expect, it } from 'vitest';
import {
  MENU_ITEM_NOTE_MAX_LENGTH,
  normalizeMenuItemNote,
  assertMenuItemNoteLength,
  notesMapFromMenuItems,
  pickNotesForSelectedItems,
  buildMenuItemsPayload,
} from '../menu-item-notes';

describe('normalizeMenuItemNote', () => {
  it('returns null for empty/whitespace', () => {
    expect(normalizeMenuItemNote('')).toBeNull();
    expect(normalizeMenuItemNote('   ')).toBeNull();
    expect(normalizeMenuItemNote(null)).toBeNull();
    expect(normalizeMenuItemNote(undefined)).toBeNull();
  });

  it('trims and keeps short notes', () => {
    expect(normalizeMenuItemNote('  less spicy  ')).toBe('less spicy');
  });
});

describe('assertMenuItemNoteLength', () => {
  it('throws when over max after trim', () => {
    const long = 'x'.repeat(MENU_ITEM_NOTE_MAX_LENGTH + 1);
    expect(() => assertMenuItemNoteLength(long)).toThrow(/120/);
  });

  it('allows exactly max length', () => {
    expect(() =>
      assertMenuItemNoteLength('x'.repeat(MENU_ITEM_NOTE_MAX_LENGTH))
    ).not.toThrow();
  });

  it('does not throw for whitespace-only', () => {
    expect(() => assertMenuItemNoteLength('   ')).not.toThrow();
  });

  it('does not throw when padding spaces make raw length > max but trim is within max', () => {
    const padded = '  ' + 'x'.repeat(MENU_ITEM_NOTE_MAX_LENGTH) + '  ';
    expect(padded.length).toBeGreaterThan(MENU_ITEM_NOTE_MAX_LENGTH);
    expect(() => assertMenuItemNoteLength(padded)).not.toThrow();
  });

  it('throws when trimmed length remains over max', () => {
    const long = '  ' + 'x'.repeat(MENU_ITEM_NOTE_MAX_LENGTH + 1) + '  ';
    expect(() => assertMenuItemNoteLength(long)).toThrow(/120/);
  });
});

describe('notesMapFromMenuItems', () => {
  it('builds map from itemId and notes', () => {
    expect(
      notesMapFromMenuItems([
        { itemId: 'a', notes: 'less spicy' },
        { itemId: 'b', notes: 'no nuts' },
      ])
    ).toEqual({ a: 'less spicy', b: 'no nuts' });
  });

  it('falls back to item.id when itemId is missing', () => {
    expect(
      notesMapFromMenuItems([
        { item: { id: 'fallback-id' }, notes: 'extra sauce' },
      ])
    ).toEqual({ 'fallback-id': 'extra sauce' });
  });

  it('skips entries with missing id and empty or whitespace notes', () => {
    expect(
      notesMapFromMenuItems([
        { notes: 'orphan note' },
        { itemId: 'empty', notes: '' },
        { itemId: 'blank', notes: '   ' },
        { itemId: 'valid', notes: '  keep me  ' },
      ])
    ).toEqual({ valid: 'keep me' });
  });
});

describe('pickNotesForSelectedItems', () => {
  it('drops notes for unselected items and empty values', () => {
    expect(
      pickNotesForSelectedItems(['a', 'b'], {
        a: 'note a',
        b: '  ',
        c: 'orphan',
      })
    ).toEqual({ a: 'note a' });
  });
});

describe('buildMenuItemsPayload', () => {
  it('maps ids to { itemId, quantity, notes? }', () => {
    expect(
      buildMenuItemsPayload(['a', 'b'], { a: 'less spicy' })
    ).toEqual([
      { itemId: 'a', quantity: 1, notes: 'less spicy' },
      { itemId: 'b', quantity: 1 },
    ]);
  });
});
