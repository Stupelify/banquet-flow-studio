import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";
import { useAuthStore, useCan, useCurrentUser } from "@/lib/auth/store";
import type { Permission } from "@/lib/auth/permissions";

const NAV: { to: string; label: string; perm?: Permission }[] = [
  { to: "/calendar",  label: "Timeline",  perm: "bookings.read" },
  { to: "/bookings",  label: "Bookings",  perm: "bookings.read" },
  { to: "/customers", label: "Customers", perm: "customers.read" },
  { to: "/enquiries", label: "Enquiries", perm: "enquiries.read" },
  { to: "/venues",    label: "Venues",    perm: "venues.read" },
  { to: "/menu",      label: "Menu",      perm: "menu.read" },
  { to: "/payments",  label: "Payments",  perm: "payments.read" },
  { to: "/reports",   label: "Reports",   perm: "reports.read" },
  { to: "/activity",  label: "Activity",  perm: "activity.read" },
  { to: "/users",     label: "Users",     perm: "users.manage" },
  { to: "/roles",     label: "Roles",     perm: "roles.manage" },
  { to: "/settings",  label: "Settings",  perm: "settings.read" },
];

function NavLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap border-b ${
        active ? "text-fg border-accent" : "text-muted border-transparent hover:text-fg"
      }`}
    >{label}</Link>
  );
}

export function TopNav({ onOpenCmd }: { onOpenCmd: () => void }) {
  const { theme, toggle } = useTheme();
  const router = useRouterState();
  const nav = useNavigate();
  const path = router.location.pathname;
  const user = useCurrentUser();
  const logout = useAuthStore((s) => s.logout);
  const [time, setTime] = useState("");

  // Build the visible nav by checking permissions per item.
  // useCan is a hook, so call it once per item (NAV is static).
  const canBookings  = useCan("bookings.read");
  const canCustomers = useCan("customers.read");
  const canEnquiries = useCan("enquiries.read");
  const canVenues    = useCan("venues.read");
  const canMenu      = useCan("menu.read");
  const canPayments  = useCan("payments.read");
  const canReports   = useCan("reports.read");
  const canActivity  = useCan("activity.read");
  const canUsers     = useCan("users.manage");
  const canRoles     = useCan("roles.manage");
  const canSettings  = useCan("settings.read");

  const allow: Record<string, boolean> = {
    "/calendar": canBookings, "/bookings": canBookings,
    "/customers": canCustomers, "/enquiries": canEnquiries,
    "/venues": canVenues, "/menu": canMenu,
    "/payments": canPayments, "/reports": canReports,
    "/activity": canActivity, "/users": canUsers,
    "/roles": canRoles, "/settings": canSettings,
  };

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const initials = user?.name?.split(/\s+/).map((n) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <header className="h-11 border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-40 flex items-center px-3 gap-6">
      <div className="flex items-center gap-2 shrink-0">
        <span className="size-3 bg-accent" />
        <span className="font-mono font-medium text-[11px] tracking-tight">BIKA_OPS</span>
        <span className="text-faint mono text-[10px]">v2.4</span>
      </div>
      <nav className="flex items-center gap-px overflow-x-auto scrollbar-thin">
        {NAV.filter((item) => allow[item.to]).map((item) => (
          <NavLink key={item.to} to={item.to} label={item.label} active={path === item.to || path.startsWith(item.to + "/")} />
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <button onClick={onOpenCmd} className="hidden md:flex items-center gap-2 h-7 px-2 bg-surface border border-border text-muted text-[11px] min-w-44">
          <span>Jump to…</span>
          <span className="ml-auto mono text-[10px] border border-border px-1">⌘K</span>
        </button>
        <div className="hidden lg:block text-right leading-tight">
          <div className="mono text-[10px]">{time}</div>
          <div className="text-[9px] text-faint uppercase tracking-widest">{user?.name ?? "—"}</div>
        </div>
        <button onClick={toggle} className="size-7 grid place-items-center border border-border text-muted hover:text-fg" title="Toggle theme">
          <span className="text-[11px]">{theme === "dark" ? "☼" : "☾"}</span>
        </button>
        <button
          onClick={() => { logout(); nav({ to: "/login" }); }}
          className="size-7 bg-surface-2 border border-border grid place-items-center mono text-[10px] hover:bg-bg"
          title={user ? `Sign out ${user.name}` : "Sign in"}
        >{initials}</button>
      </div>
    </header>
  );
}
