import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — Bika Ops" }, { name: "description", content: "Profile, users, roles, integrations, theme." }] }),
  component: SettingsPage,
});

const TABS = ["Profile", "Users", "Roles", "Integrations", "Theme"] as const;

function SettingsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Profile");
  const { theme, toggle } = useTheme();
  return (
    <div className="flex h-[calc(100vh-2.75rem)]">
      <aside className="w-48 border-r border-border bg-surface p-2 space-y-px">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`w-full text-left px-2 py-1.5 text-[11px] uppercase tracking-widest mono ${tab === t ? "bg-surface-2 text-fg border-l-2 border-accent" : "text-muted hover:text-fg border-l-2 border-transparent"}`}>{t}</button>
        ))}
      </aside>
      <main className="flex-1 p-6 overflow-y-auto scrollbar-thin">
        {tab === "Theme" && (
          <div className="max-w-md space-y-4">
            <h2 className="text-[14px] font-semibold">Appearance</h2>
            <div className="flex items-center justify-between p-3 border border-border">
              <div>
                <div className="text-[12px] font-medium">Theme</div>
                <div className="text-[10px] text-muted">Currently {theme}</div>
              </div>
              <button onClick={toggle} className="px-3 py-1 text-[10px] uppercase tracking-widest border border-border hover:bg-surface-2">Toggle</button>
            </div>
          </div>
        )}
        {tab === "Profile" && (
          <div className="max-w-md grid grid-cols-2 gap-x-6 gap-y-3">
            {[["Name", "Suresh Iyer"], ["Email", "suresh@bikabanquet.in"], ["Role", "Owner"], ["Branch", "Andheri"]].map(([k, v]) => (
              <div key={k} className="border-l border-border pl-2">
                <div className="text-[9px] uppercase tracking-widest text-faint mono">{k}</div>
                <div className="text-[12px]">{v}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "Users" && <div className="text-muted text-[12px]">User management coming next pass.</div>}
        {tab === "Roles" && <div className="text-muted text-[12px]">Role-based access control coming next pass.</div>}
        {tab === "Integrations" && (
          <div className="max-w-md">
            <h2 className="text-[14px] font-semibold mb-3">Google Calendar</h2>
            <div className="flex items-center justify-between p-3 border border-border">
              <div>
                <div className="text-[12px]">Status</div>
                <div className="text-[10px] text-muted mono">Connected · syncing every 5m</div>
              </div>
              <span className="size-2 bg-confirmed rounded-full" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
