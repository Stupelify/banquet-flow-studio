// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { useRouter, usePathname, useSearchParams } from '../router-compat';

// jsdom has no scroll implementation; TanStack Router's scroll-restoration
// effect calls it on every navigation commit.
window.scrollTo = () => {};
// React 19 requires this flag for act() to apply without a console warning.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return h(
    'div',
    null,
    h('span', { id: 'path' }, pathname),
    h('span', { id: 'q' }, search.get('tab') ?? ''),
    h('button', { id: 'go', onClick: () => router.push('/b?tab=menu') }, 'go'),
    h(
      'button',
      { id: 'replace-no-scroll', onClick: () => router.replace('/b?tab=x', { scroll: false }) },
      'replace',
    ),
  );
}

function makeRouter() {
  const rootRoute = createRootRoute();
  const aRoute = createRoute({ getParentRoute: () => rootRoute, path: '/a', component: Probe });
  const bRoute = createRoute({ getParentRoute: () => rootRoute, path: '/b', component: Probe });
  return createRouter({
    routeTree: rootRoute.addChildren([aRoute, bRoute]),
    history: createMemoryHistory({ initialEntries: ['/a'] }),
  });
}

describe('router-compat', () => {
  it('exposes pathname, search params, and push()', async () => {
    const router = makeRouter();
    await router.load();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(h(RouterProvider, { router }));
    });
    expect(container.querySelector('#path')!.textContent).toBe('/a');
    await act(async () => {
      (container.querySelector('#go') as HTMLButtonElement).click();
    });
    expect(router.state.location.pathname).toBe('/b');
    expect(container.querySelector('#q')!.textContent).toBe('menu');
  });

  it('maps scroll:false to resetScroll:false on replace()', async () => {
    const router = makeRouter();
    const navigateSpy = vi.spyOn(router, 'navigate');
    await router.load();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(h(RouterProvider, { router }));
    });
    await act(async () => {
      (container.querySelector('#replace-no-scroll') as HTMLButtonElement).click();
    });
    expect(navigateSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        replace: true,
        resetScroll: false,
      }),
    );
  });
});
