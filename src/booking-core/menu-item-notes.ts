export const MENU_ITEM_NOTE_MAX_LENGTH = 120;

export function normalizeMenuItemNote(
  value: string | null | undefined
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assertMenuItemNoteLength(value: string): void {
  const normalized = normalizeMenuItemNote(value);
  if (normalized && normalized.length > MENU_ITEM_NOTE_MAX_LENGTH) {
    throw new Error(
      `Menu item note must be at most ${MENU_ITEM_NOTE_MAX_LENGTH} characters`
    );
  }
}

/** Keep only non-empty notes for currently selected item ids. */
export function pickNotesForSelectedItems(
  menuItemIds: string[],
  notes: Record<string, string> | null | undefined
): Record<string, string> {
  const source = notes || {};
  const next: Record<string, string> = {};
  for (const id of menuItemIds) {
    const n = normalizeMenuItemNote(source[id]);
    if (n) next[id] = n;
  }
  return next;
}

export function buildMenuItemsPayload(
  menuItemIds: string[],
  notes: Record<string, string> | null | undefined
): Array<{ itemId: string; quantity: number; notes?: string }> {
  const picked = pickNotesForSelectedItems(menuItemIds, notes);
  return menuItemIds.map((itemId) => {
    const n = picked[itemId];
    return n
      ? { itemId, quantity: 1, notes: n }
      : { itemId, quantity: 1 };
  });
}

/** Build notes map from API/snapshot bookingMenu.items rows. */
export function notesMapFromMenuItems(
  items: Array<{ itemId?: string; item?: { id?: string }; notes?: string | null }>
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const entry of items) {
    const id = entry.itemId || entry.item?.id;
    if (!id) continue;
    const n = normalizeMenuItemNote(entry.notes);
    if (n) map[id] = n;
  }
  return map;
}
