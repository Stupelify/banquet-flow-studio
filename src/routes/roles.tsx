import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore, useCan } from "@/lib/auth/store";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "@/lib/auth/permissions";

export const Route = createFileRoute("/roles")({
  head: () => ({ meta: [{ title: "Roles — Bika Ops" }] }),
  component: RolesPage,
});

function RolesPage() {
  const canManage = useCan("roles.manage");
  const roles = useAuthStore((s) => s.roles);
  const updateRole = useAuthStore((s) => s.updateRole);
  const createRole = useAuthStore((s) => s.createRole);
  const deleteRole = useAuthStore((s) => s.deleteRole);
  const [activeId, setActiveId] = useState(roles[0]?.id ?? "");

  if (!canManage) return <div className="p-6 text-[12px] text-muted">You don't have permission to manage roles.</div>;

  const active = roles.find((r) => r.id === activeId) ?? roles[0];

  const toggle = (perm: Permission) => {
    if (!active) return;
    const has = active.permissions.includes(perm);
    updateRole(active.id, {
      permissions: has ? active.permissions.filter((p) => p !== perm) : [...active.permissions, perm],
    });
  };

  return (
    <div className="p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-3">
      <aside className="border border-border bg-surface">
        <header className="px-2 py-2 border-b border-border flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest mono text-muted">Roles · {roles.length}</span>
          <button
            onClick={() => { const name = prompt("Role name"); if (name) { const r = createRole({ name, description: "", permissions: [] }); setActiveId(r.id); } }}
            className="text-[10px] uppercase mono text-accent"
          >+ New</button>
        </header>
        <ul>
          {roles.map((r) => (
            <li key={r.id}>
              <button
                onClick={() => setActiveId(r.id)}
                className={`w-full text-left px-2 py-2 border-b border-border/60 hover:bg-surface-2 ${r.id === activeId ? "bg-surface-2" : ""}`}
              >
                <div className="text-[12px] font-medium">{r.name}</div>
                <div className="text-[10px] text-muted">{r.permissions.length} permissions</div>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="border border-border bg-surface p-3 space-y-3">
        {active && (
          <>
            <header className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <input
                  value={active.name}
                  onChange={(e) => updateRole(active.id, { name: e.target.value })}
                  className="text-[16px] font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none px-0 py-0.5 w-full"
                />
                <input
                  value={active.description}
                  onChange={(e) => updateRole(active.id, { description: e.target.value })}
                  placeholder="Role description"
                  className="text-[11px] text-muted bg-transparent border-b border-transparent hover:border-border focus:border-accent outline-none w-full mt-0.5"
                />
              </div>
              <button
                onClick={() => { if (confirm("Delete role " + active.name + "? Affected users will be reassigned to Viewer.")) deleteRole(active.id); }}
                className="px-2 py-1 text-[10px] uppercase mono border border-border text-conflict hover:bg-surface-2 shrink-0"
              >Delete role</button>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group} className="border border-border bg-bg/30 p-2">
                  <div className="text-[9px] uppercase tracking-widest text-faint mono mb-1.5">{group}</div>
                  <div className="space-y-1">
                    {ALL_PERMISSIONS.filter((p) => p.group === group).map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-[12px]">
                        <input type="checkbox" checked={active.permissions.includes(p.key)} onChange={() => toggle(p.key)} />
                        <span>{p.label}</span>
                        <span className="ml-auto mono text-[9px] text-faint">{p.key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
