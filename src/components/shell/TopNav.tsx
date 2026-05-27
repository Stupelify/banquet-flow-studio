import { Link, useRouterState } from "@tanstack/react-router";
import { useTheme } from "@/hooks/use-theme";
import { useEffect, useState } from "react";

const NAV = [
  { to: "/calendar", label: "Timeline" },
  { to: "/bookings", label: "Bookings" },
  { to: "/customers", label: "Customers" },
  { to: "/enquiries", label: "Enquiries" },
  { to: "/venues", label: "Venues" },
  { to: "/menu", label: "Menu" },
  { to: "/payments", label: "Payments" },
  { to: "/reports", label: "Reports" },
  { to: "/activity", label: "Activity" },
  { to: "/settings", label: "Settings" },
] as const;

export function TopNav({ onOpenCmd }: { onOpenCmd: () => void }) {
  const { theme, toggle } = useTheme();
  const router = useRouterState();
  const path = router.location.pathname;
  const [time, setTime] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-11 border-b border-border bg-bg/95 backdrop-blur sticky top-0 z-40 flex items-center px-3 gap-6">
      <div className="flex items-center gap-2 shrink-0">
        <span className="size-3 bg-accent" />
        <span className="font-mono font-medium text-[11px] tracking-tight">BIKA_OPS</span>
        <span className="text-faint mono text-[10px]">v2.4</span>
      </div>
      <nav className="flex items-center gap-px overflow-x-auto scrollbar-thin">
        {NAV.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider whitespace-nowrap border-b ${
                active ? "text-fg border-accent" : "text-muted border-transparent hover:text-fg"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={onOpenCmd}
          className="hidden md:flex items-center gap-2 h-7 px-2 bg-surface border border-border text-muted text-[11px] min-w-44"
        >
          <span>Jump to…</span>
          <span className="ml-auto mono text-[10px] border border-border px-1">⌘K</span>
        </button>
        <div className="hidden lg:block text-right leading-tight">
          <div className="mono text-[10px]">{time}</div>
          <div className="text-[9px] text-faint uppercase tracking-widest">Mumbai</div>
        </div>
        <button
          onClick={toggle}
          className="size-7 grid place-items-center border border-border text-muted hover:text-fg"
          title="Toggle theme"
        >
          <span className="text-[11px]">{theme === "dark" ? "☼" : "☾"}</span>
        </button>
        <div className="size-7 bg-surface-2 border border-border grid place-items-center mono text-[10px]">SI</div>
      </div>
    </header>
  );
}
