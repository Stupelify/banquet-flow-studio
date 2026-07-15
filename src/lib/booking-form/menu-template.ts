import type { MenuItemLike } from './types';

/** Merge template item IDs into an existing pack selection (dedupe, preserve order). */
export function mergeTemplateItemIds(
  existingIds: string[],
  templateIds: string[]
): string[] {
  const seen = new Set(existingIds);
  const merged = [...existingIds];
  for (const id of templateIds) {
    const trimmed = `${id ?? ''}`.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    merged.push(trimmed);
  }
  return merged;
}

export function extractTemplateItemIds(
  templateItems: Array<{ item?: { id?: string } | null }> | undefined
): string[] {
  if (!templateItems?.length) return [];
  return templateItems
    .map((entry) => entry.item?.id)
    .filter((id): id is string => Boolean(id));
}

export function templateItemsToMenuItemLikes(
  templateItems: Array<{
    item?: {
      id: string;
      name: string;
      point?: number | null;
      points?: number | null;
      itemType?: MenuItemLike['itemType'];
    } | null;
  }> | undefined
): MenuItemLike[] {
  if (!templateItems?.length) return [];
  return templateItems
    .map((entry) => entry.item)
    .filter((item): item is NonNullable<typeof item> => Boolean(item?.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      point: item.point,
      points: item.points,
      itemType: item.itemType,
    }));
}

export function buildItemByIdMap(
  catalogItems: MenuItemLike[],
  extraItems: MenuItemLike[] = []
): Map<string, MenuItemLike> {
  const map = new Map<string, MenuItemLike>();
  for (const item of [...catalogItems, ...extraItems]) {
    if (item?.id) map.set(item.id, item);
  }
  return map;
}

export function getItemPoints(item?: MenuItemLike | null): number {
  if (!item) return 0;
  const rawPoints = item.points ?? item.point ?? 0;
  const numericPoints = Number(rawPoints);
  if (!Number.isFinite(numericPoints)) return 0;
  return Math.max(0, numericPoints);
}

export function calculateMenuPointsFromMap(
  menuItemIds: string[],
  itemById: Map<string, MenuItemLike>
): string {
  if (!menuItemIds.length) return '';
  const totalPoints = menuItemIds.reduce((sum, itemId) => {
    return sum + getItemPoints(itemById.get(itemId));
  }, 0);
  const rounded = Math.round(totalPoints * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function countNewTemplateItems(
  existingIds: string[],
  templateIds: string[]
): number {
  const existing = new Set(existingIds);
  return templateIds.filter((id) => id && !existing.has(id)).length;
}
