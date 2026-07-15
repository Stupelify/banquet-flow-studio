import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { RoutePending } from "@/components/RoutePending";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    trailingSlash: 'never',
    defaultPendingComponent: RoutePending,
    defaultPendingMs: 120,
    defaultPendingMinMs: 180,
  });

  return router;
};
