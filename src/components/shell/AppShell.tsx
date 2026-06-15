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
import { useTabsStore, type WorkspaceTab } from "@/lib/ui/tabs-store";

const PAGE_TITLES: Record<string, { title: string; kind: WorkspaceTab["kind"] }> = {
  "/calendar":  { title: "Calendar",  kind: "page" },
  "/bookings":  { title: "Bookings",  kind: "booking" },
  "/enquiries": { title: "Enquiries", kind: "enquiry" },
  "/payments":  { title: "Payments",  kind: "payment" },
  "/customers": { title: "Customers", kind: "customer" },
  "/venues":    { title: "Venues",    kind: "venue" },
  "/menu":      { title: "Menu",      kind: "page" },
  "/reports":   { title: "Reports",   kind: "page" },
  "/activity":  { title: "Activity",  kind: "page" },
  "/settings":  { title: "Settings",  kind: "page" },
  "/users":     { title: "Users",     kind: "page" },
  "/roles":     { title: "Roles",     kind: "page" },
  "/":          { title: "Home",      kind: "page" },
  "/dashboard": { title: "Dashboard", kind: "page" },
};

export function AppShell({ onOpenCmd }: { onOpenCmd: () => void }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("bika-sidebar-collapsed") === "1";
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useIsMobile();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const searchStr = useRouterState({ select: (r) => r.location.searchStr });
  const openTab = useTabsStore((s) => s.open);

  // Auto-register a tab for every navigated route.
  useEffect(() => {
    const base = PAGE_TITLES[path];
    if (!base) return;
    const href = path + (searchStr || "");
    openTab({ id: path, title: base.title, kind: base.kind, href });
  }, [path, searchStr, openTab]);

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
