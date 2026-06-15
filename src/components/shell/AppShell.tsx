/**
 * AppShell — persistent sidebar + workspace tab strip + content outlet.
 *
 * Desktop: sidebar fixed on the left, collapsible to icons.
 * Mobile:  sidebar is an off-canvas drawer triggered from the topbar.
 */
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { WorkspaceTabs } from "./WorkspaceTabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export function AppShell({ onOpenCmd }: { onOpenCmd: () => void }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bika-sidebar-collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    try { localStorage.setItem("bika-sidebar-collapsed", collapsed ? "1" : "0"); } catch { /* ignore */ }
  }, [collapsed]);

  // Close mobile sheet on route change.
  useEffect(() => { setMobileOpen(false); }, [path]);

  return (
    <div className="h-screen w-full flex bg-bg text-fg overflow-hidden">
      {/* Desktop sidebar */}
      {!isMobile && (
        <AppSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          onOpenCmd={onOpenCmd}
        />
      )}

      {/* Mobile sidebar (off-canvas) */}
      {isMobile && (
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="p-0 w-[260px] bg-surface border-border">
            <AppSidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onOpenCmd={() => { setMobileOpen(false); onOpenCmd(); }}
              onNavigate={() => setMobileOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar — mobile menu + tabs row */}
        <div className="flex items-stretch border-b border-border bg-surface shrink-0">
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              className="size-11 grid place-items-center text-muted hover:text-fg border-r border-border"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <WorkspaceTabs />
          </div>
        </div>

        {/* Content — every page fills available space */}
        <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
