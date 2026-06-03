import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Bika Ops" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const login = useAuthStore((s) => s.login);
  const loginAsDemo = useAuthStore((s) => s.loginAsDemo);
  const currentUserId = useAuthStore((s) => s.currentUserId);
  const [email, setEmail] = useState("admin@bika.in");
  const [pw, setPw] = useState("admin123");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { if (currentUserId) nav({ to: "/dashboard" }); }, [currentUserId, nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = login(email, pw);
    if (!r.ok) { setErr(r.error); return; }
    nav({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-bg p-4">
      <form onSubmit={submit} className="w-full max-w-sm border border-border bg-surface p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="size-3 bg-accent" />
          <span className="font-mono font-medium text-[12px] tracking-tight">BIKA_OPS</span>
          <span className="text-faint mono text-[10px] ml-auto">v2.4</span>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted mono mb-1">Email</div>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@venue.in" className="w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted mono mb-1">Password</div>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="w-full h-9 px-2 bg-bg border border-border text-[12px] outline-none focus:border-accent" />
        </div>
        {err && <div className="text-[11px] text-conflict mono">{err}</div>}
        <button className="w-full h-9 bg-accent text-accent-fg text-[11px] uppercase tracking-widest mono">Sign in</button>
        <div className="text-[10px] text-muted mono text-center">— OR —</div>
        <button type="button" onClick={() => { loginAsDemo(); nav({ to: "/dashboard" }); }} className="w-full h-9 border border-border text-[11px] uppercase tracking-widest">Continue as admin demo</button>
        <details className="text-[10px] text-muted mono">
          <summary className="cursor-pointer">Seed credentials</summary>
          <ul className="mt-2 space-y-0.5">
            <li>admin@bika.in / admin123</li>
            <li>manager@bika.in / manager123</li>
            <li>booking@bika.in / booking123</li>
            <li>reception@bika.in / recep123</li>
            <li>accounts@bika.in / acct123</li>
          </ul>
        </details>
      </form>
    </div>
  );
}
