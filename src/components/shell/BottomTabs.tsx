/**
 * Phone bottom navigation. Shown only below `lg`. Slots:
 *   Bookings · Calendar · Enquiries · Payments · More
 *
 * "More" expands a sheet with the rest of the nav (Customers, Venues, Menu,
 * Reports, Activity, Settings, Theme toggle).
 */
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { useTheme } from "@/hooks/use-theme";

const PRIMARY = [
  { to: "/bookings",  label: "Bookings",  icon: "▤" },
  { to: "/calendar",  label: "Calendar",  icon: "▦" },
  { to: "/enquiries", label: "Enquiries", icon: "✎" },
  { to: "/payments",  label: "Payments",  icon: "₹" },
] as const;

const MORE = [
  { to: "/customers", label: "Customers" },
  { to: "/venues",    label: "Venues" },
  { to: "/menu",      label: "Menu" },
  { to: "/reports",   label: "Reports" },
  { to: "/activity",  label: "Activity" },
  { to: "/settings",  label: "Settings" },
] as const;

export function BottomTabs() {
  const router = useRouterState();
  const path = router.location.pathname;
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  const isActive = (to: string) => path === to || path.startsWith(to + "/");

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-14 border-t border-border bg-bg/95 backdrop-blur grid grid-cols-5"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {PRIMARY.map((item) => {
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] ${
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
              MORE.some((m) => isActive(m.to)) ? "text-fg" : "text-muted"
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
            {MORE.map((item) => (
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
