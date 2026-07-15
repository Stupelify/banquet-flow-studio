import { create } from 'zustand';

/**
 * R6 — visible realtime connection state. Each useSSE instance reports its
 * own status here; the UI shows the best across instances (one healthy
 * connection means realtime updates are flowing).
 */

export type SseConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

interface SseStatusState {
  statuses: Record<string, SseConnectionStatus>;
  setStatus: (id: string, status: SseConnectionStatus) => void;
  removeStatus: (id: string) => void;
}

export const useSseStatusStore = create<SseStatusState>((set) => ({
  statuses: {},
  setStatus: (id, status) =>
    set((state) => ({ statuses: { ...state.statuses, [id]: status } })),
  removeStatus: (id) =>
    set((state) => {
      const next = { ...state.statuses };
      delete next[id];
      return { statuses: next };
    }),
}));

export function selectAggregateSseStatus(
  state: SseStatusState
): SseConnectionStatus | 'none' {
  const values = Object.values(state.statuses);
  if (values.length === 0) return 'none';
  if (values.includes('connected')) return 'connected';
  if (values.includes('connecting') || values.includes('reconnecting')) {
    return 'reconnecting';
  }
  return 'offline';
}
