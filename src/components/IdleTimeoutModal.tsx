
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Clock } from 'lucide-react';
import { useFocusTrap } from '@/lib/useFocusTrap';
import Button from '@/components/ui/Button';

interface IdleTimeoutModalProps {
  open: boolean;
  /** Seconds remaining until auto-logout — shown in the countdown */
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export default function IdleTimeoutModal({
  open,
  secondsRemaining,
  onStayLoggedIn,
  onLogoutNow,
}: IdleTimeoutModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, panelRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted || typeof document === 'undefined') return null;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const countdownLabel =
    mins > 0
      ? `${mins}m ${secs.toString().padStart(2, '0')}s`
      : `${secs}s`;

  // Urgency colour — amber when >20s left, red when ≤20s
  const urgentColor = secondsRemaining <= 20 ? 'var(--color-red, #ef4444)' : '#f59e0b';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="idle-timeout-title"
      aria-describedby="idle-timeout-desc"
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50" aria-hidden="true" />

      {/* Modal panel */}
      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-sm bg-surface rounded-2xl border border-[var(--border)] shadow-2xl p-6 flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-start gap-3">
          <span
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: 'rgba(245,158,11,0.12)' }}
            aria-hidden="true"
          >
            <Clock
              style={{ color: urgentColor, transition: 'color 0.4s' }}
              className="w-5 h-5"
            />
          </span>
          <div>
            <h2
              id="idle-timeout-title"
              className="text-base font-semibold text-[var(--text-1)] leading-snug"
            >
              Still there?
            </h2>
            <p id="idle-timeout-desc" className="text-sm text-[var(--text-3)] mt-0.5">
              You've been inactive. For security, you'll be logged out automatically.
            </p>
          </div>
        </div>

        {/* Countdown */}
        <div
          className="flex items-center justify-center py-2 rounded-xl"
          style={{ background: 'var(--surface-2)' }}
        >
          <span
            className="text-2xl font-mono font-bold tabular-nums"
            style={{ color: urgentColor, transition: 'color 0.4s' }}
            aria-live="polite"
            aria-atomic="true"
          >
            {countdownLabel}
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <Button
            type="button"
            variant="primary"
            onClick={onStayLoggedIn}
            className="flex-1"
            autoFocus
          >
            Stay logged in
          </Button>
          <Button
            type="button"
            onClick={onLogoutNow}
            className="flex-1 flex items-center justify-center gap-1.5"
            icon={<LogOut className="w-3.5 h-3.5" aria-hidden="true" />}
          >
            Log out now
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
