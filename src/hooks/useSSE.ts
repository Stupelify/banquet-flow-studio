
import { useEffect, useRef } from 'react';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Capacitor } from '@capacitor/core';
import { api } from '@/lib/api';
import { getInMemoryAuthToken } from '@/lib/authToken';
import { buildSseEventStreamUrl } from '@/lib/dashboardNavigation';
import { matchesEventPrefix, nextBackoffDelay } from '@/lib/sseSubscription';
import { useSseStatusStore, type SseConnectionStatus } from '@/lib/sseStatusStore';

let sseInstanceCounter = 0;

export interface SseEventPayload {
  type?: string;
  id?: string;
}

export function useSSE(
  eventPrefixes: string[],
  onEvent: (event?: SseEventPayload) => void,
  enabled: boolean
): void {
  const prefixesRef = useRef(eventPrefixes);
  prefixesRef.current = eventPrefixes;

  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let abortController: AbortController | null = null;

    const instanceId = `sse-${(sseInstanceCounter += 1)}`;
    const reportStatus = (status: SseConnectionStatus) => {
      if (!cancelled) useSseStatusStore.getState().setStatus(instanceId, status);
    };
    reportStatus('connecting');

    const scheduleReconnect = () => {
      if (cancelled || reconnectTimer) return;
      reportStatus(attempt >= 3 ? 'offline' : 'reconnecting');
      const delay = nextBackoffDelay(attempt);
      attempt += 1;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        void openSseConnection();
      }, delay);
    };

    const resolveStreamUrl = async (): Promise<{ url: string; headers: Record<string, string> }> => {
      const baseUrl = import.meta.env.VITE_API_URL || '/api';
      const isNative = Capacitor.isNativePlatform();
      const bearer = getInMemoryAuthToken();

      if (isNative && bearer) {
        return {
          url: buildSseEventStreamUrl(baseUrl),
          headers: { Authorization: `Bearer ${bearer}` },
        };
      }

      if (isNative) {
        const res = await api.getSseToken();
        return {
          url: buildSseEventStreamUrl(baseUrl, res.data.token),
          headers: {},
        };
      }

      return {
        url: buildSseEventStreamUrl(baseUrl),
        headers: {},
      };
    };

    const openSseConnection = async () => {
      if (cancelled) return;

      abortController?.abort();
      abortController = new AbortController();

      try {
        const { url, headers } = await resolveStreamUrl();
        if (cancelled) return;

        await fetchEventSource(url, {
          signal: abortController.signal,
          credentials: Capacitor.isNativePlatform() ? 'omit' : 'include',
          headers,
          openWhenHidden: true,
          async onopen(response) {
            if (cancelled) return;
            if (!response.ok) {
              throw new Error(`SSE connection failed: ${response.status}`);
            }
            attempt = 0;
            reportStatus('connected');
          },
          onmessage(event) {
            if (cancelled) return;
            try {
              const payload = JSON.parse(event.data) as SseEventPayload;
              if (matchesEventPrefix(payload.type, prefixesRef.current)) {
                onEventRef.current(payload);
              }
            } catch {
              // Ignore malformed SSE payloads.
            }
          },
          onclose() {
            if (cancelled) return;
            scheduleReconnect();
          },
          onerror() {
            if (cancelled) return;
            scheduleReconnect();
            return nextBackoffDelay(Math.max(0, attempt - 1));
          },
        });
      } catch (error) {
        if (cancelled) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        scheduleReconnect();
      }
    };

    void openSseConnection();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      abortController?.abort();
      useSseStatusStore.getState().removeStatus(instanceId);
    };
  }, [enabled]);
}
