import { useRef, useState } from 'react';
import { FileText, Plus, Search, StickyNote } from 'lucide-react';
import FormPromptModal from '@/components/FormPromptModal';
import Button from '@/components/ui/Button';
import MenuItemNotePopover from '@/components/booking/MenuItemNotePopover';
import { PACK_LABELS, type PackKey } from '@/lib/booking-form/constants';
import type { VersionDiff } from '@/lib/booking-form/version-history';

interface MenuItemOptionLike {
  id: string;
  name: string;
}

interface MenuPackRowLike {
  templateMenuId: string;
  menuItemIds: string[];
  menuPoints: string;
}

interface BookingMenuEditorModalProps {
  /** Pack whose menu is being edited; null keeps the modal closed. */
  packKey: PackKey | null;
  packRow: MenuPackRowLike | null;
  templateMenus: Array<{ id: string; name: string }>;
  menuItemSearch: string;
  onMenuItemSearchChange: (value: string) => void;
  groupedMenuItems: Array<[string, MenuItemOptionLike[]]>;
  selectedMenuItemsByGroup: Array<[string, MenuItemOptionLike[]]>;
  menuItemNotes: Record<string, string>;
  readOnly?: boolean;
  /** Live diff vs. last finalized version, for added/removed item tags. */
  formDiff: VersionDiff | null;
  onImportTemplate: (packKey: PackKey, templateMenuId: string) => void | Promise<unknown>;
  onToggleMenuItem: (packKey: PackKey, itemId: string) => void;
  onSaveMenuItemNote: (packKey: PackKey, itemId: string, note: string) => void;
  onQuickAddItem: () => void;
  onClose: () => void;
}

export default function BookingMenuEditorModal({
  packKey,
  packRow,
  templateMenus,
  menuItemSearch,
  onMenuItemSearchChange,
  groupedMenuItems,
  selectedMenuItemsByGroup,
  menuItemNotes,
  readOnly = false,
  formDiff,
  onImportTemplate,
  onToggleMenuItem,
  onSaveMenuItemNote,
  onQuickAddItem,
  onClose,
}: BookingMenuEditorModalProps) {
  const [activeNoteItem, setActiveNoteItem] = useState<MenuItemOptionLike | null>(null);
  const noteButtonAnchorRef = useRef<HTMLElement | null>(null);
  const activeNote = activeNoteItem ? menuItemNotes[activeNoteItem.id] || '' : '';

  return (
    <FormPromptModal
      open={Boolean(packKey)}
      title={packKey ? `${PACK_LABELS[packKey]} Menu Selection` : 'Menu Selection'}
      onClose={onClose}
      widthClass="max-w-6xl"
    >
      {packKey && packRow ? (
        <div className="space-y-4">
          <div>
            <label className="label">Template Menu</label>
            <select
              className="input"
              value={packRow.templateMenuId}
              onChange={(e) => {
                void onImportTemplate(packKey, e.target.value);
              }}
              disabled={readOnly}
            >
              <option value="">Custom (no template)</option>
              {templateMenus.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-[var(--text-4)]">
              Selecting a template replaces the current menu with all template items. You will be
              asked to confirm if items are already selected.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[var(--border)] p-3">
              <div className="flex gap-2 mb-3">
                <input
                  className="input flex-1"
                  placeholder="Search items..."
                  value={menuItemSearch}
                  onChange={(e) => onMenuItemSearchChange(e.target.value)}
                />
                <Button
                  type="button"
                  size="sm"
                  className="flex items-center gap-1 shrink-0"
                  onClick={onQuickAddItem}
                  disabled={readOnly}
                  icon={<Plus size={14} />}
                >
                  Add Item
                </Button>
              </div>
              <div
                className="max-h-[360px] overflow-y-auto rounded-lg border border-[var(--border)]"
                style={{ contain: 'content', overscrollBehavior: 'contain' }}
              >
                {groupedMenuItems.length === 0 ? (
                  <div className="empty-state" style={{ padding: '20px 12px' }}>
                    <div className="empty-state-icon">
                      <Search size={20} />
                    </div>
                    <p className="empty-state-title">No matching items</p>
                    <p className="empty-state-desc">Try another keyword.</p>
                  </div>
                ) : (
                  groupedMenuItems.map(([group, grouped]) => (
                    <div key={group}>
                      <div className="px-3 py-2 text-sm font-semibold text-[var(--text-1)] bg-primary-50 dark:bg-primary-900/40 border-b border-[var(--border)]">
                        {group}
                      </div>
                      {grouped.map((item) => {
                          const _edPDK = packKey ? PACK_LABELS[packKey].toLowerCase() : '';
                          const _edPD = formDiff?.packs[_edPDK];
                          const _isAdded = _edPD?.addedItemIds.includes(item.id);
                          const _isRemoved = _edPD?.removedItemIds.includes(item.id);
                          return (
                            <label
                              key={`${packKey}-${item.id}`}
                              className={`cv-auto flex items-center gap-2 px-3 py-2 text-sm border-b border-[var(--border)] last:border-b-0 ${
                                _isAdded ? 'bg-green-50 dark:bg-green-500/10 text-green-900 dark:text-green-200' : _isRemoved ? 'bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200' : 'text-[var(--text-2)]'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={packRow.menuItemIds.includes(item.id)}
                                onChange={() => onToggleMenuItem(packKey, item.id)}
                                disabled={readOnly}
                              />
                              <span>{item.name}</span>
                              {_isAdded && <span className="ml-auto text-xs font-semibold text-green-700 dark:text-green-200">+ added</span>}
                              {_isRemoved && <span className="ml-auto text-xs font-semibold text-red-700 dark:text-red-200">− removed</span>}
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
                {packRow.menuItemIds.length > 0 && (
                  <span className="text-xs font-semibold text-teal-700 dark:text-teal-200 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full">
                    {packRow.menuItemIds.length} items · {packRow.menuPoints || '0'} pts
                  </span>
                )}
              </div>
              {packRow.menuItemIds.length === 0 ? (
                <div className="empty-state" style={{ padding: '20px 12px' }}>
                  <div className="empty-state-icon">
                    <FileText size={20} />
                  </div>
                  <p className="empty-state-title">No items selected</p>
                  <p className="empty-state-desc">Choose items from the list to build this pack.</p>
                </div>
              ) : (
                <div
                  className="max-h-[360px] overflow-y-auto space-y-3"
                  style={{ contain: 'content', overscrollBehavior: 'contain' }}
                >
                  {selectedMenuItemsByGroup.map(([group, grouped]) => (
                    <div key={`selected-group-${group}`} className="space-y-2">
                      <p className="text-sm font-semibold text-[var(--text-1)]">{group}</p>
                      <div className="flex flex-wrap gap-2">
                        {grouped.map((item) => {
                            const _sPDK = packKey ? PACK_LABELS[packKey].toLowerCase() : '';
                            const _sPD = formDiff?.packs[_sPDK];
                            const _sAdded = _sPD?.addedItemIds.includes(item.id);
                            const _sRemoved = _sPD?.removedItemIds.includes(item.id);
                            return (
                              <span
                                key={`selected-${packKey}-${item.id}`}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                                  _sAdded ? 'border-green-400 bg-green-50 dark:bg-green-500/10 text-green-900 dark:text-green-200' : _sRemoved ? 'border-red-400 bg-red-50 dark:bg-red-500/10 text-red-900 dark:text-red-200' : 'border-[var(--border-2)] bg-[var(--surface)]'
                                }`}
                              >
                                {_sAdded && <span className="text-green-600 font-bold text-xs">+</span>}
                                {_sRemoved && <span className="text-red-600 font-bold text-xs">−</span>}
                                {item.name}
                                <button
                                  type="button"
                                  className={`inline-flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                                    menuItemNotes[item.id]?.trim()
                                      ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800/60 dark:bg-amber-500/10 dark:text-amber-200'
                                      : 'border-transparent text-[var(--text-4)] hover:border-[var(--border)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]'
                                  }`}
                                  onClick={(event) => {
                                    noteButtonAnchorRef.current = event.currentTarget;
                                    setActiveNoteItem(item);
                                  }}
                                  aria-label={`${readOnly ? 'View' : 'Edit'} note for ${item.name}`}
                                  title={`${readOnly ? 'View' : 'Edit'} note`}
                                >
                                  <StickyNote className="h-3.5 w-3.5" aria-hidden />
                                </button>
                                {!readOnly && (
                                  <button
                                    type="button"
                                    className="text-red-600"
                                    onClick={() => onToggleMenuItem(packKey, item.id)}
                                  >
                                    ×
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
            readOnly={readOnly}
            open={Boolean(activeNoteItem)}
            onClose={() => setActiveNoteItem(null)}
            onSave={(note) => {
              if (packKey && activeNoteItem) {
                onSaveMenuItemNote(packKey, activeNoteItem.id, note);
              }
              setActiveNoteItem(null);
            }}
            onClear={() => {
              if (packKey && activeNoteItem) {
                onSaveMenuItemNote(packKey, activeNoteItem.id, '');
              }
              setActiveNoteItem(null);
            }}
            anchorRef={noteButtonAnchorRef}
          />

          <div className="form-actions">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      ) : null}
    </FormPromptModal>
  );
}
