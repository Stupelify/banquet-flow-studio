import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore, useCan } from "@/lib/auth/store";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users — Bika Ops" }] }),
  component: UsersPage,
});

function UsersPage() {
  const canManage = useCan("users.manage");
  const users = useAuthStore((s) => s.users);
  const roles = useAuthStore((s) => s.roles);
  const createUser = useAuthStore((s) => s.createUser);
  const updateUser = useAuthStore((s) => s.updateUser);
  const deleteUser = useAuthStore((s) => s.deleteUser);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", roleId: roles[0]?.id ?? "", password: "" });

  if (!canManage) {
    return <div className="p-6 text-[12px] text-muted">You don't have permission to manage users.</div>;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    createUser({ ...form, active: true });
    setForm({ name: "", email: "", phone: "", roleId: roles[0]?.id ?? "", password: "" });
    setCreating(false);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-[12px] uppercase tracking-widest mono">Users · {users.length}</h1>
        <button onClick={() => setCreating((v) => !v)} className="px-2 py-1 text-[10px] uppercase tracking-widest mono bg-accent text-accent-fg">{creating ? "Close" : "+ New user"}</button>
      </header>
      {creating && (
        <form onSubmit={submit} className="border border-border bg-surface p-3 grid grid-cols-1 sm:grid-cols-5 gap-2 text-[12px]">
          <input className={inp} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inp} placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input className={inp} placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <select className={inp} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <div className="flex gap-2">
            <input className={inp} placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button className="px-2 text-[10px] uppercase tracking-widest mono bg-accent text-accent-fg">Add</button>
          </div>
        </form>
      )}
      <div className="border border-border bg-surface overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead><tr className="text-[10px] uppercase tracking-widest text-muted mono border-b border-border">
            <th className="text-left px-2 py-2 font-normal">Name</th>
            <th className="text-left px-2 py-2 font-normal">Email</th>
            <th className="text-left px-2 py-2 font-normal">Role</th>
            <th className="text-left px-2 py-2 font-normal">Active</th>
            <th className="text-right px-2 py-2 font-normal">Actions</th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60">
                <td className="px-2 py-1.5">{u.name}</td>
                <td className="px-2 py-1.5 mono text-muted">{u.email}</td>
                <td className="px-2 py-1.5">
                  <select className={inp + " h-7"} value={u.roleId} onChange={(e) => updateUser(u.id, { roleId: e.target.value })}>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-1.5">
                  <label className="flex items-center gap-1.5 text-[11px]">
                    <input type="checkbox" checked={u.active} onChange={(e) => updateUser(u.id, { active: e.target.checked })} />
                    {u.active ? "Active" : "Disabled"}
                  </label>
                </td>
                <td className="px-2 py-1.5 text-right space-x-1">
                  <button onClick={() => { const p = prompt("New password for " + u.name); if (p) resetPassword(u.id, p); }} className="px-2 py-0.5 text-[10px] uppercase mono border border-border hover:bg-surface-2">Reset PW</button>
                  <button onClick={() => { if (confirm("Delete " + u.name + "?")) deleteUser(u.id); }} className="px-2 py-0.5 text-[10px] uppercase mono border border-border text-conflict hover:bg-surface-2">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const inp = "w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent";
