
import { useMemo, useRef, useState } from 'react';
import { FileText, Search, StickyNote } from 'lucide-react';
import FormPromptModal from '@/components/FormPromptModal';
import Button from '@/components/ui/Button';
import MenuItemNotePopover from '@/components/booking/MenuItemNotePopover';
import type { MenuItemLike } from '@/lib/booking-form/types';
import type { BookingPackRow } from '@/lib/booking-form/form-types';
import { calculateMenuPointsFromMap } from '@/lib/booking-form/menu-template';

export default function BookingMenuViewModal({
  open,
  packLabel,
  packRow,
  menuItemById,
  onClose,
}: {
  open: boolean;
  packLabel: string;
  packRow: BookingPackRow | null;
  menuItemById: Map<string, MenuItemLike>;
  onClose: () => void;
}) {
  const [menuItemSearch, setMenuItemSearch] = useState('');
  const [activeNoteItem, setActiveNoteItem] = useState<MenuItemLike | null>(null);
  const noteButtonAnchorRef = useRef<HTMLElement | null>(null);
  const menuItemNotes = packRow?.menuItemNotes || {};
  const activeNote = activeNoteItem ? menuItemNotes[activeNoteItem.id] || '' : '';

  const selectedItems = useMemo(() => {
    if (!packRow) return [] as MenuItemLike[];
    return packRow.menuItemIds
      .map((id) => menuItemById.get(id))
      .filter((item): item is MenuItemLike => Boolean(item));
  }, [packRow, menuItemById]);

  const menuPoints = useMemo(() => {
    if (!packRow) return '0';
    return calculateMenuPointsFromMap(packRow.menuItemIds, menuItemById);
  }, [packRow, menuItemById]);

  const groupedCatalogItems = useMemo(() => {
    const query = menuItemSearch.trim().toLowerCase();
    const allItems = Array.from(menuItemById.values()).filter((item) => {
      if (!query) return true;
      const group = item.itemType?.name || '';
      return (
        item.name.toLowerCase().includes(query) || group.toLowerCase().includes(query)
      );
    });
    const map = new Map<string, MenuItemLike[]>();
    allItems.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const bucket = map.get(group) || [];
      bucket.push(item);
      map.set(group, bucket);
    });
    map.forEach((grouped, groupName) => {
      map.set(
        groupName,
        [...grouped].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        )
      );
    });
    return Array.from(map.entries());
  }, [menuItemById, menuItemSearch]);

  const selectedItemsByGroup = useMemo(() => {
    const map = new Map<string, MenuItemLike[]>();
    selectedItems.forEach((item) => {
      const group = item.itemType?.name || 'Other';
      const bucket = map.get(group) || [];
      bucket.push(item);
      map.set(group, bucket);
    });
    return Array.from(map.entries());
  }, [selectedItems]);

  return (
    <FormPromptModal
      open={open}
      title={packLabel ? `${packLabel} Menu Selection` : 'Menu Selection'}
      onClose={onClose}
      widthClass="max-w-6xl"
    >
      {packRow ? (
        <div className="space-y-4">
          <div>
            <label className="label">Template Menu</label>
            <input
              className="input bg-[var(--surface-2)] cursor-default"
              value={packRow.templateMenuName || 'Custom (no template)'}
              readOnly
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex gap-2 mb-3">
                <input
                  className="input flex-1"
                  placeholder="Search items..."
                  value={menuItemSearch}
                  onChange={(e) => setMenuItemSearch(e.target.value)}
                />
              </div>
              <div
                className="max-h-[360px] overflow-y-auto rounded-lg border border-[var(--border)]"
                style={{ contain: 'content', overscrollBehavior: 'contain' }}
              >
                {groupedCatalogItems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 12px' }}>
                    <div className="empty-state-icon">
                      <Search size={20} />
                    </div>
                    <p className="empty-state-title">No matching items</p>
                    <p className="empty-state-desc">Try another keyword.</p>
                  </div>
                ) : (
                  groupedCatalogItems.map(([group, grouped]) => (
                    <div key={group}>
                      <div className="px-3 py-2 text-sm font-semibold text-[var(--text-1)] bg-primary-50 dark:bg-primary-900/40 border-b border-[var(--border)]">
                        {group}
                      </div>
                      {grouped.map((item) => {
                        const selected = packRow.menuItemIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex items-center gap-2 px-3 py-2 text-sm border-b border-[var(--border)] last:border-b-0 ${
                              selected
                                ? 'bg-teal-50/80 dark:bg-teal-500/10 text-[var(--text-1)]'
                                : 'text-[var(--text-3)]'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled
                              readOnly
                              className="pointer-events-none"
                            />
                            <span>{item.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-[var(--text-1)]">Selected Items</p>
                {selectedItems.length > 0 && (
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-200 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                    {selectedItems.length} items · {menuPoints} pts
                  </span>
                )}
              </div>
              {selectedItems.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 12px' }}>
                  <div className="empty-state-icon">
                    <FileText size={20} />
                  </div>
                  <p className="empty-state-title">No items selected</p>
                  <p className="empty-state-desc">This pack had no menu items in this version.</p>
                </div>
              ) : (
                <div
                  className="max-h-[360px] overflow-y-auto space-y-3"
                  style={{ contain: 'content', overscrollBehavior: 'contain' }}
                >
                  {selectedItemsByGroup.map(([group, grouped]) => (
                    <div key={`selected-group-${group}`} className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--text-1)]">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {grouped.map((item) => {
                          const hasNote = Boolean(menuItemNotes[item.id]?.trim());
                          return (
                            <span
                              key={item.id}
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                                hasNote
                                  ? 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800/60 dark:bg-amber-500/10 dark:text-amber-200'
                                  : 'border-[var(--border-2)] bg-[var(--surface)]'
                              }`}
                            >
                              {item.name}
                              {hasNote && (
                                <button
                                  type="button"
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700 transition-colors hover:bg-amber-200 dark:border-amber-800/60 dark:bg-amber-500/20 dark:text-amber-200"
                                  onClick={(event) => {
                                    noteButtonAnchorRef.current = event.currentTarget;
                                    setActiveNoteItem(item);
                                  }}
                                  aria-label={`View note for ${item.name}`}
                                  title="View note"
                                >
                                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <MenuItemNotePopover
            itemName={activeNoteItem?.name || ''}
            initialNote={activeNote}
            readOnly
            open={Boolean(activeNoteItem)}
            onClose={() => setActiveNoteItem(null)}
            onSave={() => setActiveNoteItem(null)}
            onClear={() => setActiveNoteItem(null)}
            anchorRef={noteButtonAnchorRef}
          />

          <div className="form-actions">
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : null}
    </FormPromptModal>
  );
}
