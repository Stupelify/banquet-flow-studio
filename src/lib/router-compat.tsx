/**
 * Drop-in replacements for the next/navigation + next/link APIs this app
 * uses, backed by TanStack Router. Search params intentionally stay
 * string-typed (URLSearchParams over the raw query string) to preserve
 * Next semantics; typed per-route validateSearch can be adopted later.
 */
import { useMemo } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
  Link as TanStackLink,
  useLocation,
  useParams as useTanStackParams,
  useRouter as useTanStackRouter,
} from '@tanstack/react-router';

function splitHref(href: string) {
  const url = new URL(href, window.location.origin);
  return {
    to: url.pathname,
    search: Object.fromEntries(url.searchParams.entries()),
    hash: url.hash ? url.hash.slice(1) : undefined,
  };
}

type NavOptions = { scroll?: boolean };

export function useRouter() {
  const router = useTanStackRouter();
  return useMemo(
    () => ({
      push: (href: string, options?: NavOptions) => {
        const { to, search, hash } = splitHref(href);
        // ponytail: untyped nav by design — compat layer takes arbitrary hrefs
        return router.navigate({
          to: to as never,
          search: search as never,
          hash,
          // Next's `{ scroll: false }` → TanStack `resetScroll: false`
          resetScroll: options?.scroll !== false,
        });
      },
      replace: (href: string, options?: NavOptions) => {
        const { to, search, hash } = splitHref(href);
        return router.navigate({
          to: to as never,
          search: search as never,
          hash,
          replace: true,
          resetScroll: options?.scroll !== false,
        });
      },
      back: () => router.history.back(),
    }),
    [router],
  );
}

export function usePathname(): string {
  return useLocation({ select: (l) => l.pathname });
}

export function useSearchParams(): URLSearchParams {
  const searchStr = useLocation({ select: (l) => l.searchStr });
  return useMemo(() => new URLSearchParams(searchStr), [searchStr]);
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string>>(): T {
  // ponytail: untyped by design, same as push/replace/Link above — compat
  // layer reads params from any route, not just the ones the registered
  // router's generated route tree knows about.
  return useTanStackParams({ strict: false } as never) as T;
}

type CompatLinkProps = Omit<ComponentProps<'a'>, 'href'> & {
  href: string;
  prefetch?: boolean;
  children?: ReactNode;
};

export function Link({ href, prefetch, children, ...rest }: CompatLinkProps) {
  const { to, search, hash } = splitHref(href);
  // For '/dashboard' (Insights page), only match exactly so it doesn't
  // highlight on other dashboard sub-routes.
  const activeOptions = to === '/dashboard' ? { exact: true } : undefined;

  return (
    <TanStackLink
      to={to as never}
      search={search as never}
      hash={hash}
      preload={prefetch === false ? false : 'intent'}
      activeOptions={activeOptions}
      {...rest}
    >
      {children}
    </TanStackLink>
  );
}
