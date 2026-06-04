/**
 * Phone bottom navigation. Shown only below `lg`. Slots:
 *   Bookings · Calendar · Enquiries · Payments · More
 *
 * Each item is gated by a permission; "More" shows only the tail items the
 * current role can reach, plus a theme toggle, plus admin links when allowed.
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";
import { useCan } from "@/lib/auth/store";
import type { Permission } from "@/lib/auth/permissions";

type Item = { to: string; label: string; icon?: string; perm: Permission };

const PRIMARY: Item[] = [
  { to: "/bookings",  label: "Bookings",  icon: "▤", perm: "bookings.read" },
  { to: "/calendar",  label: "Calendar",  icon: "▦", perm: "bookings.read" },
  { to: "/enquiries", label: "Enquiries", icon: "✎", perm: "enquiries.read" },
  { to: "/payments",  label: "Payments",  icon: "₹", perm: "payments.read" },
];

const MORE: Item[] = [
  { to: "/customers", label: "Customers", perm: "customers.read" },
  { to: "/venues",    label: "Venues",    perm: "venues.read" },
  { to: "/menu",      label: "Menu",      perm: "menu.read" },
  { to: "/reports",   label: "Reports",   perm: "reports.read" },
  { to: "/activity",  label: "Activity",  perm: "activity.read" },
  { to: "/settings",  label: "Settings",  perm: "settings.read" },
  { to: "/users",     label: "Users",     perm: "users.manage" },
  { to: "/roles",     label: "Roles",     perm: "roles.manage" },
];

function usePermittedItems(items: Item[]) {
  // Hooks must run in stable order — call useCan for every item.
  return items.map((it) => ({ item: it, allowed: useCan(it.perm) }))
    .filter((x) => x.allowed)
    .map((x) => x.item);
}

export function BottomTabs() {
  const router = useRouterState();
  const path = router.location.pathname;
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const primary = usePermittedItems(PRIMARY);
  const more = usePermittedItems(MORE);
  const isActive = (to: string) => path === to || path.startsWith(to + "/");
  const cols = Math.min(primary.length + 1, 5);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-border bg-bg/95 backdrop-blur grid"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      aria-label="Primary"
    >
      {primary.map((item) => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`relative flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
              active ? "text-fg" : "text-muted"
            }`}
          >
            <span className="mono text-[14px] leading-none">{item.icon}</span>
            <span className="text-[9px] uppercase tracking-widest mono">{item.label}</span>
            {active && <span className="absolute top-0 h-0.5 w-10 bg-accent" />}
          </Link>
        );
      })}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
              more.some((m) => isActive(m.to)) ? "text-fg" : "text-muted"
            }`}
            aria-label="More"
          >
            <span className="mono text-[14px] leading-none">⋯</span>
            <span className="text-[9px] uppercase tracking-widest mono">More</span>
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="bg-surface border-border">
          <SheetHeader>
            <SheetTitle className="mono text-[11px] uppercase tracking-widest text-faint text-left">More</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {more.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`min-h-[56px] flex items-center justify-center text-[11px] mono uppercase tracking-widest border border-border ${
                  isActive(item.to) ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"
                }`}
              >{item.label}</Link>
            ))}
            <button
              onClick={() => { toggle(); }}
              className="min-h-[56px] flex items-center justify-center text-[11px] mono uppercase tracking-widest border border-border text-muted hover:text-fg"
            >Theme · {theme === "dark" ? "☼" : "☾"}</button>
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
