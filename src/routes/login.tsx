import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Bika Ops" }] }),
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  return (
    <div className="min-h-screen grid place-items-center bg-bg p-4">
      <form
        onSubmit={(e) => { e.preventDefault(); nav({ to: "/dashboard" }); }}
        className="w-full max-w-sm border border-border bg-surface p-6 space-y-5"
      >
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
        <button className="w-full h-9 bg-accent text-accent-fg text-[11px] uppercase tracking-widest mono">Sign in</button>
        <div className="text-[10px] text-muted mono text-center">— OR —</div>
        <button type="button" onClick={() => nav({ to: "/dashboard" })} className="w-full h-9 border border-border text-[11px] uppercase tracking-widest">Continue as demo</button>
      </form>
    </div>
  );
}
