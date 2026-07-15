
import {
  selectAggregateSseStatus,
  useSseStatusStore,
} from '@/lib/sseStatusStore';

const STATUS_UI = {
  connected: {
    dot: 'bg-emerald-500',
    label: 'Live',
    chip: 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300',
    title: 'Realtime updates are connected',
  },
  reconnecting: {
    dot: 'bg-amber-500 animate-pulse',
    label: 'Reconnecting…',
    chip: 'border-amber-300 dark:border-amber-800/50 text-amber-700 dark:text-amber-300',
    title: 'Realtime updates dropped — reconnecting. Data shown may be slightly stale.',
  },
  offline: {
    dot: 'bg-red-500',
    label: 'Offline',
    chip: 'border-red-300 dark:border-red-900/50 text-red-700 dark:text-red-300',
    title: 'Realtime updates are unavailable — data shown may be stale. It will reconnect automatically.',
  },
} as const;

export default function SseStatusChip({ className = '' }: { className?: string }) {
  const status = useSseStatusStore(selectAggregateSseStatus);
  if (status === 'none') return null;
  const ui = STATUS_UI[status === 'connecting' ? 'reconnecting' : status];

  return (
    <span
      role="status"
      title={ui.title}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs font-medium select-none motion-colors ${ui.chip} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full shrink-0 ${ui.dot}`} aria-hidden />
      <span className="hidden sm:inline">{ui.label}</span>
      <span className="sr-only sm:hidden">{ui.label}</span>
    </span>
  );
}
