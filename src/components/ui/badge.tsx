
import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'teal';

const TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-3',
  success: 'bg-green-50 text-green-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  info: 'bg-blue-50 text-blue-700',
  teal: 'bg-primary-50 text-primary-700',
};

export interface BadgeProps {
  tone?: BadgeTone;
  /** Show the small status dot before the text. */
  dot?: boolean;
  children: ReactNode;
}

/** Generic pill for non-status labels; booking statuses keep using <StatusBadge>. */
export default function Badge({ tone = 'neutral', dot = false, children }: BadgeProps) {
  return (
    <span className={`status-pill ${TONE_CLASS[tone]}`}>
      {dot && <span className="status-dot" />}
      {children}
    </span>
  );
}
