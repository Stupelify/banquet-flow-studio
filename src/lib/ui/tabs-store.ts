/**
 * Workspace tabs — browser-style tab strip across the top of the app.
 *
 * Tabs are pushed as the user navigates into a section. Each tab keeps the
 * full URL (path + search) so re-opening a booking returns to the same id.
 * Pinned tabs survive "close others". Persisted to localStorage.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type WorkspaceTab = {
  /** Stable id — usually the URL itself, or kind:entityId for detail views. */
  id: string;
  /** Display label shown in the tab. */
  title: string;
  /** Small kind tag — drives the colored dot. */
  kind: "page" | "booking" | "customer" | "enquiry" | "venue" | "payment";
  /** Full URL (pathname + search) to navigate to when the tab is clicked. */
  href: string;
  pinned?: boolean;
};

type State = {
  tabs: WorkspaceTab[];
  activeId: string | null;
};
type Actions = {
  open: (tab: WorkspaceTab) => void;
  close: (id: string) => string | null; // returns next active href or null
  closeOthers: (id: string) => void;
  closeAll: () => void;
  pin: (id: string, pinned: boolean) => void;
  setActive: (id: string | null) => void;
  rename: (id: string, title: string) => void;
};

export const useTabsStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeId: null,

      open: (tab) =>
        set((s) => {
          const existing = s.tabs.find((t) => t.id === tab.id);
          if (existing) {
            // refresh href/title in case query changed
            return {
              tabs: s.tabs.map((t) => (t.id === tab.id ? { ...t, ...tab, pinned: t.pinned } : t)),
              activeId: tab.id,
            };
          }
          return { tabs: [...s.tabs, tab], activeId: tab.id };
        }),

      close: (id) => {
        const { tabs, activeId } = get();
        const idx = tabs.findIndex((t) => t.id === id);
        if (idx < 0) return null;
        const next = tabs.filter((t) => t.id !== id);
        let nextActive: string | null = activeId;
        if (activeId === id) {
          const fallback = next[idx] ?? next[idx - 1] ?? next[next.length - 1] ?? null;
          nextActive = fallback?.id ?? null;
        }
        set({ tabs: next, activeId: nextActive });
        return next.find((t) => t.id === nextActive)?.href ?? null;
      },

      closeOthers: (id) =>
        set((s) => ({
          tabs: s.tabs.filter((t) => t.id === id || t.pinned),
          activeId: id,
        })),

      closeAll: () => set((s) => ({ tabs: s.tabs.filter((t) => t.pinned), activeId: null })),

      pin: (id, pinned) =>
        set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, pinned } : t)) })),

      setActive: (id) => set({ activeId: id }),

      rename: (id, title) =>
        set((s) => ({ tabs: s.tabs.map((t) => (t.id === id ? { ...t, title } : t)) })),
    }),
    {
      name: "bika-tabs-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);
