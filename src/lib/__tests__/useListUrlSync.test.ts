// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  RouterProvider,
  createBrowserHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { useListUrlSync } from '../useListUrlSync';

window.scrollTo = () => {};
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function Probe({ q }: { q: string }) {
  useListUrlSync({ q });
  return h('div', { id: 'probe' }, q);
}

describe('useListUrlSync', () => {
  it('silently replaceStates the URL without notifying TanStack history', async () => {
    // jsdom starts at about:blank; give it a real path so URL parsing works.
    window.history.replaceState({}, '', '/list?section=edit&id=1');

    const rootRoute = createRootRoute();
    const listRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/list',
      component: function ListPage() {
        const [q, setQ] = useState('');
        return h(
          'div',
          null,
          h(Probe, { q }),
          h('button', { id: 'set-q', onClick: () => setQ('hello') }, 'set'),
        );
      },
    });
    const history = createBrowserHistory();
    const notifySpy = vi.spyOn(history, 'notify');
    const router = createRouter({
      routeTree: rootRoute.addChildren([listRoute]),
      history,
    });
    await router.load();

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => {
      root.render(h(RouterProvider, { router }));
    });

    notifySpy.mockClear();
    await act(async () => {
      (container.querySelector('#set-q') as HTMLButtonElement).click();
    });

    expect(window.location.pathname + window.location.search).toBe(
      '/list?section=edit&id=1&q=hello',
    );
    expect(notifySpy).not.toHaveBeenCalled();
  });
});
