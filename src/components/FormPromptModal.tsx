'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface FormPromptModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  widthClass?: string;
  isDirty?: boolean;
  /** When set, replaces the default title heading (e.g. tab navigation in the header row). */
  headerContent?: ReactNode;
}

// Modals nest (booking form → menu editor → quick-add item), so Escape must
// only close the topmost one. Module-level stack of open modal ids.
const openModalStack: number[] = [];
let modalIdCounter = 0;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * App form modal — master-parity custom portal (nested Escape stack, dirty
 * close confirm, capacitor chrome). Prefer this over Radix Dialog for ops
 * forms so nested portals (menu item notes, hall pickers) behave predictably.
 */
export default function FormPromptModal({
  open,
  title,
  onClose,
  children,
  widthClass = 'max-w-4xl',
  isDirty = false,
  headerContent,
}: FormPromptModalProps) {
  const [mounted, setMounted] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const modalIdRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) setShowCloseConfirm(false);
  }, [open]);

  // Warn on browser-level exits (refresh / tab close / back) while there are
  // unsaved changes — the in-app close button is already guarded below.
  useEffect(() => {
    if (!open || !isDirty || typeof window === 'undefined') return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [open, isDirty]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const bodyStyle = document.body.style;
    const prevOverflow = bodyStyle.overflow;
    const prevOverscroll = bodyStyle.overscrollBehavior;

    // Keep scrolling isolated to the modal content while it is open.
    bodyStyle.overflow = 'hidden';
    bodyStyle.overscrollBehavior = 'none';

    return () => {
      bodyStyle.overflow = prevOverflow;
      bodyStyle.overscrollBehavior = prevOverscroll;
    };
  }, [open]);

  const handleCloseRequest = () => {
    if (isDirty) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  };

  // Escape behaves like the close button (and dismisses the unsaved-changes
  // confirm first). Routed through a ref so the document listener always sees
  // the latest dirty state without re-subscribing.
  const onEscapeRef = useRef<() => void>(() => {});
  onEscapeRef.current = () => {
    if (showCloseConfirm) {
      setShowCloseConfirm(false);
      return;
    }
    handleCloseRequest();
  };

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;

    const id = (modalIdCounter += 1);
    modalIdRef.current = id;
    openModalStack.push(id);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (openModalStack[openModalStack.length - 1] !== id) return;
      event.stopPropagation();
      onEscapeRef.current();
    };
    document.addEventListener('keydown', onKeyDown);

    // Move focus into the dialog unless something inside (e.g. an autofocused
    // field) already has it; restore the previous focus on close.
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = setTimeout(() => {
      const root = containerRef.current;
      const active = document.activeElement;
      if (root && active && active !== document.body && root.contains(active)) return;
      panelRef.current?.focus();
    }, 50);

    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      const idx = openModalStack.indexOf(id);
      if (idx !== -1) openModalStack.splice(idx, 1);
      modalIdRef.current = null;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  // Keep Tab cycling within the modal while it is open.
  const handleTrapKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const root = containerRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (event.shiftKey) {
      if (active === first || !root.contains(active)) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last || !root.contains(active)) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!open || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={containerRef}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-3 sm:p-4"
      data-capacitor-overlay="open"
      data-ops-form-surface="true"
      style={{ overscrollBehavior: 'contain' }}
      onKeyDown={handleTrapKeyDown}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45 z-0"
        onClick={handleCloseRequest}
        aria-label="Close form prompt backdrop"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`capacitor-modal-panel relative z-10 w-full ${widthClass} max-h-[calc(100dvh-var(--safe-top)-var(--keyboard-offset,0px))] sm:max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-[var(--border)] bg-surface shadow-xl outline-none`}
      >
        <div
          className={`sticky top-0 z-10 bg-surface/95 border-b border-[var(--border)] px-4 sm:px-5 flex justify-between gap-3 ${
            headerContent ? 'items-end pt-2 pb-0' : 'items-center py-3.5 sm:py-4'
          }`}
        >
          {headerContent ?? (
            <h2 className="text-lg font-display font-semibold text-[var(--text-1)]">{title}</h2>
          )}
          <button
            type="button"
            onClick={handleCloseRequest}
            className={`min-h-11 min-w-11 p-2 rounded-lg text-[var(--text-4)] hover:bg-surface-2 hover:text-[var(--text-2)] border border-transparent hover:border-[var(--border)] ${
              headerContent ? 'mb-1.5 shrink-0' : ''
            }`}
            aria-label="Close form prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 sm:p-5 pb-[calc(1rem+var(--safe-bottom)+var(--keyboard-offset,0px))]">{children}</div>
      </div>

      {showCloseConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
          <div className="bg-surface rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-base font-semibold text-[var(--text-1)] mb-1">Unsaved Changes</h3>
              <p className="text-sm text-[var(--text-3)]">
                You have unsaved changes. Are you sure you want to close without saving?
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="btn btn-secondary"
              >
                Stay on Page
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  onClose();
                }}
                className="btn btn-danger"
              >
                Discard & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
