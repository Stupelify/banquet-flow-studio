
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/lib/useFocusTrap';

type FilterPanelProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  activeCount?: number;
  onClearAll?: () => void;
};

export default function FilterPanel({
  open,
  onClose,
  children,
  title = 'Filters',
  activeCount = 0,
  onClearAll,
}: FilterPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  useFocusTrap(open, panelRef);

  // Esc closes; when closed the panel is `inert` so its inputs stay out of the
  // tab order (it's always mounted for the slide animation).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    if (open) node.removeAttribute('inert');
    else node.setAttribute('inert', '');
  }, [open]);

  return (
    <>
      {open ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/20"
          onClick={onClose}
          aria-label="Close filters"
        />
      ) : null}
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal={open}
        className={`filter-panel fixed right-0 top-0 z-40 h-full w-[min(100vw,22rem)] border-l border-border bg-surface shadow-lg transition-transform duration-200 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center gap-2 border-b border-border px-5 py-4 pt-[max(1rem,var(--safe-top))]">
          <h2 className="page-title text-[18px]">{title}</h2>
          {activeCount > 0 ? (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-text-3">
              {activeCount}
            </span>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            {onClearAll ? (
              <button type="button" className="text-sm text-teal-600" onClick={onClearAll}>
                Clear all
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text-4">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="filter-panel-body">{children}</div>
      </aside>
    </>
  );
}
