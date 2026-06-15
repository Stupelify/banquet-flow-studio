/**
 * WorkspaceTabs — browser-style tab strip across the top of the workspace.
 *
 * Tabs are added/updated by `useRegisterTab` from inside route components.
 * Clicking a tab navigates back to its saved URL; X closes it (and may
 * navigate to the neighbour if the closed tab was active).
 */
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useTabsStore, type WorkspaceTab } from "@/lib/ui/tabs-store";
import { useEffect } from "react";
import { X, Pin, PinOff } from "lucide-react";

const KIND_DOT: Record<WorkspaceTab["kind"], string> = {
  page: "bg-faint",
  booking: "bg-confirmed",
  customer: "bg-quotation",
  enquiry: "bg-pencil",
  venue: "bg-google",
  payment: "bg-accent",
};

export function WorkspaceTabs() {
  const tabs = useTabsStore((s) => s.tabs);
  const activeId = useTabsStore((s) => s.activeId);
  const close = useTabsStore((s) => s.close);
  const pin = useTabsStore((s) => s.pin);
  const setActive = useTabsStore((s) => s.setActive);
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname + r.location.searchStr });

  // Keep activeId in sync with the URL when user navigates via links/sidebar.
  useEffect(() => {
    const match = tabs.find((t) => t.href === path);
    if (match && match.id !== activeId) setActive(match.id);
  }, [path, tabs, activeId, setActive]);

  if (!tabs.length) return null;

  return (
    <div className="h-9 flex items-stretch border-b border-border bg-surface overflow-x-auto scrollbar-thin">
      {tabs.map((t) => {
        const isOn = t.id === activeId;
        return (
          <div
            key={t.id}
            onClick={() => { setActive(t.id); nav({ to: t.href as any }); }}
            className={`group relative flex items-center gap-2 pl-3 pr-1.5 min-w-[140px] max-w-[220px] border-r border-border cursor-pointer text-[12px] ${
              isOn ? "bg-bg text-fg" : "text-muted hover:text-fg hover:bg-surface-2"
            }`}
          >
            <span className={`size-2 rounded-full shrink-0 ${KIND_DOT[t.kind]}`} />
            <span className="truncate flex-1">{t.title}</span>
            <button
              onClick={(e) => { e.stopPropagation(); pin(t.id, !t.pinned); }}
              className={`size-5 grid place-items-center rounded hover:bg-surface-3 ${t.pinned ? "text-accent" : "text-faint opacity-0 group-hover:opacity-100"}`}
              title={t.pinned ? "Unpin" : "Pin"}
            >
              {t.pinned ? <Pin className="size-3" /> : <PinOff className="size-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = close(t.id);
                if (isOn && next) nav({ to: next as any });
                else if (isOn && !next) nav({ to: "/calendar" });
              }}
              className="size-5 grid place-items-center rounded hover:bg-surface-3 text-muted opacity-0 group-hover:opacity-100"
              title="Close"
            >
              <X className="size-3" />
            </button>
            {isOn && <span className="absolute left-0 right-0 bottom-0 h-0.5 bg-accent pointer-events-none" />}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Register/refresh a workspace tab for the current page. Call once near the
 * top of any route component you want represented in the tab strip.
 */
export function useRegisterTab(tab: WorkspaceTab) {
  const open = useTabsStore((s) => s.open);
  useEffect(() => {
    open(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id, tab.title, tab.href]);
}
