'use client';

import { type CSSProperties, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, X } from 'lucide-react';
import { MENU_ITEM_NOTE_MAX_LENGTH } from '@bika/booking-core';

type MenuItemNotePopoverProps = {
  itemName: string;
  initialNote: string;
  readOnly?: boolean;
  open: boolean;
  onClose: () => void;
  onSave: (note: string) => void;
  onClear: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
};

const PANEL_WIDTH = 320;
const PANEL_MARGIN = 12;
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function MenuItemNotePopover({
  itemName,
  initialNote,
  readOnly = false,
  open,
  onClose,
  onSave,
  onClear,
  anchorRef,
}: MenuItemNotePopoverProps) {
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState('');
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const titleId = useId();
  const counterId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft(initialNote.slice(0, MENU_ITEM_NOTE_MAX_LENGTH));
  }, [initialNote, open]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const updatePosition = () => {
      const anchorRect = anchorRef?.current?.getBoundingClientRect();
      if (!anchorRect) {
        setPosition(null);
        return;
      }

      const panelWidth = Math.max(
        240,
        Math.min(PANEL_WIDTH, window.innerWidth - PANEL_MARGIN * 2)
      );
      const panelHeight = panelRef.current?.offsetHeight || (readOnly ? 180 : 245);
      const maxLeft = window.innerWidth - panelWidth - PANEL_MARGIN;
      const maxTop = window.innerHeight - panelHeight - PANEL_MARGIN;
      const belowTop = anchorRect.bottom + 8;
      const aboveTop = anchorRect.top - panelHeight - 8;
      const preferredTop = belowTop <= maxTop ? belowTop : Math.max(PANEL_MARGIN, aboveTop);

      setPosition({
        top: Math.max(PANEL_MARGIN, Math.min(preferredTop, maxTop)),
        left: Math.max(
          PANEL_MARGIN,
          Math.min(anchorRect.left + anchorRect.width / 2 - panelWidth / 2, maxLeft)
        ),
        width: panelWidth,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open, readOnly]);

  useEffect(() => {
    if (!open || readOnly) return;
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 30);
    return () => window.clearTimeout(timer);
  }, [open, readOnly]);

  useEffect(() => {
    if (!open || typeof window === 'undefined') return;
    const restoreElement =
      anchorRef?.current ||
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const timer = window.setTimeout(() => {
      if (!readOnly) return;
      panelRef.current?.focus();
    }, 30);
    return () => {
      window.clearTimeout(timer);
      if (restoreElement && document.contains(restoreElement)) {
        restoreElement.focus();
      }
    };
  }, [anchorRef, open, readOnly]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, open]);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const handleSave = () => {
    onSave(draft.trim());
    onClose();
  };

  const handleClear = () => {
    onClear();
    onClose();
  };

  const handleTrapKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length === 0) {
      event.preventDefault();
      root.focus();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || active === root || !root.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || active === root || !root.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  const panelStyle: CSSProperties = position
    ? { top: position.top, left: position.left, width: position.width }
    : {
        top: '50%',
        left: '50%',
        width: `min(${PANEL_WIDTH}px, calc(100vw - ${PANEL_MARGIN * 2}px))`,
        transform: 'translate(-50%, -50%)',
      };

  return createPortal(
    <div
      className="fixed inset-0 z-[90]"
      data-bika-nested-overlay="menu-item-note"
      // Modal Dialog sets pointer-events:none on body; re-enable for this portal.
      style={{ pointerEvents: 'auto' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/20"
        onClick={onClose}
        aria-label="Close menu item note popover"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl"
        style={panelStyle}
        onKeyDown={handleTrapKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-start gap-2">
          <span className="mt-0.5 rounded-full bg-amber-50 p-1.5 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300">
            <StickyNote className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="truncate text-sm font-semibold text-[var(--text-1)]">
              Item note
            </h3>
            <p className="truncate text-xs text-[var(--text-3)]">{itemName}</p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-[var(--text-4)] hover:bg-[var(--surface-2)] hover:text-[var(--text-2)]"
            onClick={onClose}
            aria-label="Close note popover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {readOnly ? (
          <div className="space-y-4">
            <p className="min-h-16 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text-2)]">
              {initialNote.trim() || 'No note added for this item.'}
            </p>
            <div className="flex justify-end">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              className="input min-h-24 resize-none"
              maxLength={MENU_ITEM_NOTE_MAX_LENGTH}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Add an ops note for this item..."
              aria-labelledby={titleId}
              aria-describedby={counterId}
            />
            <div className="flex items-center justify-between gap-3">
              <span id={counterId} className="text-xs text-[var(--text-4)]">
                {draft.length}/{MENU_ITEM_NOTE_MAX_LENGTH}
              </span>
              <span className="flex gap-2">
                <button type="button" className="btn btn-secondary" onClick={handleClear}>
                  Clear
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  Save
                </button>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
