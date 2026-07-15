import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

/**
 * Promise-based replacement for window.confirm(). Call `confirmDialog(opts)`
 * from any handler and `await` the boolean. <ConfirmDialogHost /> must be
 * mounted once (dashboard layout); if it is not, falls back to the native
 * confirm so a call can never hang.
 */
export interface ConfirmOptions {
  title: string;
  /** What exactly is affected + consequence, e.g. "Wedding — Sharma. This cannot be undone." */
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'danger' | 'default';
}

type PendingConfirm = ConfirmOptions & { resolve: (ok: boolean) => void };

let presentConfirm: ((p: PendingConfirm) => void) | null = null;

export function confirmDialog(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (presentConfirm) {
      presentConfirm({ ...options, resolve });
    } else {
      resolve(
        typeof window !== 'undefined'
          ? window.confirm(
              options.description ? `${options.title}\n\n${options.description}` : options.title
            )
          : false
      );
    }
  });
}

export function ConfirmDialogHost() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    presentConfirm = (next) => {
      setPending((prev) => {
        prev?.resolve(false);
        return next;
      });
    };
    return () => {
      presentConfirm = null;
    };
  }, []);

  // Danger dialogs focus Cancel (safe default); plain ones focus Confirm.
  useEffect(() => {
    if (!pending) return;
    const target = pending.tone === 'danger' ? cancelRef.current : confirmRef.current;
    const timer = setTimeout(() => target?.focus(), 30);
    return () => clearTimeout(timer);
  }, [pending]);

  const close = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const isDanger = pending?.tone === 'danger';

  return (
    <Dialog
      open={Boolean(pending)}
      onOpenChange={(next) => {
        if (!next) close(false);
      }}
    >
      <DialogPortal>
        <DialogOverlay className="z-[90]" />
        <DialogContent
          panelClassName="ui-dialog-alert"
          className="z-[90]"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {pending && (
            <>
              <div className="flex items-start gap-3">
                {isDanger && (
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0">
                  <DialogTitle className="text-base font-semibold text-[var(--text-1)] mb-1">
                    {pending.title}
                  </DialogTitle>
                  {pending.description ? (
                    <DialogDescription className="text-sm text-[var(--text-3)] break-words">
                      {pending.description}
                    </DialogDescription>
                  ) : (
                    <DialogDescription className="sr-only">{pending.title}</DialogDescription>
                  )}
                </div>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button ref={cancelRef} type="button" onClick={() => close(false)}>
                  {pending.cancelLabel ?? 'Cancel'}
                </Button>
                <Button
                  ref={confirmRef}
                  type="button"
                  variant={isDanger ? 'danger' : 'primary'}
                  onClick={() => close(true)}
                >
                  {pending.confirmLabel ?? 'Confirm'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
