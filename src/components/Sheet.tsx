import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/Dialog';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  width?: number | string;
  children: ReactNode;
}

/** Side/bottom sheet — Radix Dialog with sheet chrome (focus, Escape, portal). */
export default function Sheet({ open, onClose, title, width = 480, children }: SheetProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="ui-sheet-overlay z-[60]" />
        <DialogContent
          panelClassName="ui-sheet-panel"
          className="z-[60]"
          style={{ ['--ui-sheet-width' as string]: typeof width === 'number' ? `${width}px` : width }}
          aria-describedby={undefined}
        >
          {title ? (
            <div className="sheet-header">
              <DialogTitle className="sheet-title">{title}</DialogTitle>
              <DialogClose asChild>
                <button
                  type="button"
                  className="header-icon-btn header-icon-hover"
                  aria-label="Close panel"
                >
                  <X width={16} height={16} aria-hidden="true" />
                </button>
              </DialogClose>
            </div>
          ) : (
            <DialogTitle className="sr-only">Panel</DialogTitle>
          )}
          <div className="sheet-body">{children}</div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
