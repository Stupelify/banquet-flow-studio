import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ScriptOnce,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";

import appCss from "../styles.css?url";
import { TopNav } from "@/components/shell/TopNav";
import { CommandPalette } from "@/components/shell/CommandPalette";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-5xl font-semibold mono">404</h1>
        <p className="mt-3 text-muted text-sm">Route not found.</p>
        <a href="/" className="inline-block mt-4 px-3 py-1.5 border border-border text-[11px] uppercase tracking-widest hover:bg-surface-2">Home</a>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="max-w-md text-center">
        <h1 className="text-base font-semibold uppercase tracking-widest">Something broke</h1>
        <p className="mt-2 text-xs text-muted mono">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 px-3 py-1.5 border border-border text-[11px] uppercase tracking-widest hover:bg-surface-2"
        >Retry</button>
      </div>
    </div>
  );
}

const themeBootScript = `(function(){try{var t=localStorage.getItem('theme')||'dark';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bika Banquet — Operations Console" },
      { name: "description", content: "Dense operations console for banquet & event-venue management." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ScriptOnce>{themeBootScript}</ScriptOnce>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [cmd, setCmd] = useState(false);
  const router = useRouter();
  const path = router.state.location.pathname;
  const isPrint = path.startsWith("/calendar/print");
  const isLogin = path === "/login";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {!isPrint && !isLogin && <TopNav onOpenCmd={() => setCmd(true)} />}
      <Outlet />
      {!isPrint && !isLogin && <CommandPalette open={cmd} onClose={() => setCmd(false)} />}
    </QueryClientProvider>
  );
}
