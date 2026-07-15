import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router';
import DashboardLayout from '@/app/dashboard/layout';

export const Route = createFileRoute('/dashboard')({
  component: DashboardRoute,
});

function DashboardRoute() {
  // Remount the pane on pathname change so the enter transition runs per hop
  // while the surrounding shell (sidebar/topnav) stays mounted.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <DashboardLayout>
      <div key={pathname} className="page-pane page-content-enter">
        <Outlet />
      </div>
    </DashboardLayout>
  );
}
