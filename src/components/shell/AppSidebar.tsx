/**
 * AppSidebar — persistent left navigation.
 *
 * Permission-gated. Collapses to icon-only at `lg` when the user toggles via
 * the sidebar handle; off-canvas drawer on mobile via the parent shell.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays, ClipboardList, Inbox, Wallet, Users, Building2, UtensilsCrossed,
  BarChart3, History, Settings, ShieldCheck, UserCog, LogOut, Search, Sun, Moon,
  PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import type { Permission } from "@/lib/auth/permissions";
import { useAuthStore, useCan, useCurrentUser } from "@/lib/auth/store";
import { useTheme } from "@/hooks/use-theme";
import { useNavigate } from "@tanstack/react-router";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; perm: Permission };

const PRIMARY: Item[] = [
  { to: "/calendar",  label: "Calendar",  icon: CalendarDays,    perm: "bookings.read" },
  { to: "/bookings",  label: "Bookings",  icon: ClipboardList,   perm: "bookings.read" },
  { to: "/enquiries", label: "Enquiries", icon: Inbox,           perm: "enquiries.read" },
  { to: "/payments",  label: "Payments",  icon: Wallet,          perm: "payments.read" },
];
const DIRECTORY: Item[] = [
  { to: "/customers", label: "Customers", icon: Users,           perm: "customers.read" },
  { to: "/venues",    label: "Venues",    icon: Building2,       perm: "venues.read" },
  { to: "/menu",      label: "Menu",      icon: UtensilsCrossed, perm: "menu.read" },
];
const INSIGHTS: Item[] = [
  { to: "/reports",   label: "Reports",   icon: BarChart3,       perm: "reports.read" },
  { to: "/activity",  label: "Activity",  icon: History,         perm: "activity.read" },
];
const ADMIN: Item[] = [
  { to: "/users",     label: "Users",     icon: UserCog,         perm: "users.manage" },
  { to: "/roles",     label: "Roles",     icon: ShieldCheck,     perm: "roles.manage" },
  { to: "/settings",  label: "Settings",  icon: Settings,        perm: "settings.read" },
];

function useFilter(items: Item[]) {
  return items.map((it) => ({ it, ok: useCan(it.perm) })).filter((x) => x.ok).map((x) => x.it);
}

export function AppSidebar({
  collapsed,
  onToggle,
  onOpenCmd,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onOpenCmd: () => void;
  onNavigate?: () => void;
}) {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { theme, toggle } = useTheme();
  const user = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const nav = useNavigate();

  const primary = useFilter(PRIMARY);
  const directory = useFilter(DIRECTORY);
  const insights = useFilter(INSIGHTS);
  const admin = useFilter(ADMIN);

  const isActive = (to: string) => path === to || path.startsWith(to + "/") || path.startsWith(to + "?");

  return (
    <aside
      className={`flex flex-col h-full bg-surface border-r border-border transition-[width] duration-200 ${
        collapsed ? "w-[60px]" : "w-[232px]"
      }`}
    >
      {/* Brand */}
      <div className="h-14 px-3 flex items-center gap-2 border-b border-border shrink-0">
        <div className="size-8 rounded-lg bg-accent text-accent-fg grid place-items-center font-semibold shrink-0">B</div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-[13px] font-semibold leading-tight truncate">Bika Banquet</div>
            <div className="text-[10px] text-muted leading-tight">Operations Console</div>
          </div>
        )}
      </div>

      {/* Search trigger */}
      <div className="p-2 shrink-0">
        <button
          onClick={onOpenCmd}
          className={`w-full h-9 flex items-center gap-2 px-2.5 rounded-md border border-border bg-surface-2 hover:bg-surface-3 text-muted text-[12.5px] ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <Search className="size-4 shrink-0" />
          {!collapsed && (
            <>
              <span>Search…</span>
              <span className="ml-auto text-[10px] mono px-1.5 py-0.5 rounded border border-border bg-surface">⌘K</span>
            </>
          )}
        </button>
      </div>

      {/* Nav scroll */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 pb-2 space-y-4">
        <NavSection label="Workspace" collapsed={collapsed} items={primary} active={isActive} onNavigate={onNavigate} />
        {directory.length > 0 && <NavSection label="Directory" collapsed={collapsed} items={directory} active={isActive} onNavigate={onNavigate} />}
        {insights.length > 0 && <NavSection label="Insights" collapsed={collapsed} items={insights} active={isActive} onNavigate={onNavigate} />}
        {admin.length > 0 && <NavSection label="Admin" collapsed={collapsed} items={admin} active={isActive} onNavigate={onNavigate} />}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        <button
          onClick={toggle}
          className={`w-full h-9 flex items-center gap-2 px-2.5 rounded-md hover:bg-surface-2 text-muted hover:text-fg text-[12.5px] ${
            collapsed ? "justify-center" : ""
          }`}
          title="Toggle theme"
        >
          {theme === "dark" ? <Sun className="size-4 shrink-0" /> : <Moon className="size-4 shrink-0" />}
          {!collapsed && <span>{theme === "dark" ? "Light" : "Dark"} mode</span>}
        </button>

        <div className={`flex items-center gap-2 px-1.5 py-1.5 rounded-md ${collapsed ? "justify-center" : ""}`}>
          <div className="size-8 rounded-full bg-accent-soft text-accent grid place-items-center font-semibold text-[11px] shrink-0">
            {user?.name?.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() ?? "?"}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium truncate">{user?.name ?? "Guest"}</div>
              <div className="text-[10px] text-muted truncate">{user?.email ?? "Not signed in"}</div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => { logout(); nav({ to: "/login" }); }}
              className="size-7 grid place-items-center text-muted hover:text-conflict rounded-md hover:bg-surface-2"
              title="Sign out"
            >
              <LogOut className="size-4" />
            </button>
          )}
        </div>

        <button
          onClick={onToggle}
          className={`hidden lg:flex w-full h-8 items-center gap-2 px-2.5 rounded-md text-muted hover:text-fg hover:bg-surface-2 text-[12px] ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}

function NavSection({
  label, collapsed, items, active, onNavigate,
}: {
  label: string; collapsed: boolean; items: Item[]; active: (to: string) => boolean; onNavigate?: () => void;
}) {
  return (
    <div>
      {!collapsed && (
        <div className="px-2 pt-1 pb-1 text-[10px] uppercase tracking-wider text-faint font-semibold">{label}</div>
      )}
      <ul className="space-y-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          const isOn = active(it.to);
          return (
            <li key={it.to}>
              <Link
                to={it.to}
                onClick={onNavigate}
                title={collapsed ? it.label : undefined}
                className={`group h-9 flex items-center gap-2.5 px-2.5 rounded-md text-[13px] relative ${
                  isOn
                    ? "bg-accent-soft text-accent font-medium"
                    : "text-fg/80 hover:text-fg hover:bg-surface-2"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className={`size-[18px] shrink-0 ${isOn ? "text-accent" : "text-muted group-hover:text-fg"}`} />
                {!collapsed && <span className="truncate">{it.label}</span>}
                {isOn && !collapsed && <span className="absolute right-2 size-1.5 rounded-full bg-accent" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
