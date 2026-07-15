
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from '@/lib/router-compat';
import { Link } from '@/lib/router-compat';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { shouldPrefetchDashboardRoute } from '@/lib/navigationPrefetch';
import { useAuthStore } from '@/store/authStore';
import apiClient from '@/lib/api';
import { BIKA_LOGO_URL } from '@/lib/brandAssets';
import BottomNav from '@/components/BottomNav';
import Avatar from '@/components/Avatar';
import UserMenu from '@/components/UserMenu';
import TopNav, { type TopNavItem } from '@/components/TopNav';
import CommandPalette from '@/components/CommandPalette';
import { ConfirmDialogHost } from '@/components/ConfirmDialog';
import IdleTimeoutModal from '@/components/IdleTimeoutModal';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useSSE } from '@/hooks/useSSE';
import { useTheme } from '@/hooks/useTheme';
import SseStatusChip from '@/components/SseStatusChip';
import DashboardErrorBoundary from '@/components/DashboardErrorBoundary';
import { useFocusTrap } from '@/lib/useFocusTrap';
import {
  getDefaultDashboardRoute,
  hasAccessForRequiredPermissions,
  isPathAllowedForUser,
  routeMatches,
} from '@/lib/routeAccess';
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  LucideIcon,
  LogOut,
  Menu,
  Moon,
  PhoneCall,
  Search,
  Settings,
  Sun,
  Users,
  UtensilsCrossed,
  X,
  Activity,
} from 'lucide-react';

interface NavigationChild {
  name: string;
  href: string;
  permissions: string[];
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  children?: NavigationChild[];
}

// PRIMARY operational nav — shown prominently. Calendar leads: the core loop
// is "is hall X free on date Y?", so the availability board is the home screen.
// Insights (the KPI dashboard) is reference, not the daily driver, so it trails.
const primaryNavigation: NavigationItem[] = [
  {
    name: 'Calendar',
    href: '/dashboard/calendar',
    icon: CalendarDays,
    permissions: ['view_calendar', 'view_booking', 'view_enquiry', 'manage_bookings', 'manage_enquiries'],
  },
  {
    name: 'Bookings',
    href: '/dashboard/bookings',
    icon: CalendarCheck,
    permissions: ['view_booking', 'manage_bookings'],
  },
  {
    name: 'Payments',
    href: '/dashboard/payments',
    icon: DollarSign,
    permissions: ['manage_payments'],
  },
  {
    name: 'Customers',
    href: '/dashboard/customers',
    icon: Users,
    permissions: ['view_customer', 'manage_customers'],
  },
  {
    name: 'Insights',
    href: '/dashboard',
    icon: LayoutDashboard,
    permissions: ['view_dashboard'],
  },
];

// SECONDARY admin/config nav — de-emphasised below divider. Enquiries lives
// here now: it's folded into the Bookings pipeline as the first stage, so its
// standalone page is a secondary entry point rather than a primary tab.
const secondaryNavigation: NavigationItem[] = [
  {
    name: 'Enquiries',
    href: '/dashboard/enquiries',
    icon: PhoneCall,
    permissions: ['view_enquiry', 'manage_enquiries'],
  },
  {
    name: 'Venues',
    href: '/dashboard/halls',
    icon: Building2,
    permissions: ['view_hall', 'view_banquet', 'manage_halls'],
    children: [
      {
        name: 'Banquet',
        href: '/dashboard/halls?section=banquet',
        permissions: ['view_banquet', 'manage_halls'],
      },
      {
        name: 'Hall',
        href: '/dashboard/halls?section=hall',
        permissions: ['view_hall', 'manage_halls'],
      },
    ],
  },
  {
    name: 'Menu & Items',
    href: '/dashboard/menu',
    icon: UtensilsCrossed,
    permissions: ['view_item', 'view_itemtype', 'view_templatemenu', 'manage_menu'],
    children: [
      {
        name: 'Item Types',
        href: '/dashboard/menu?section=itemType',
        permissions: ['view_itemtype', 'manage_menu'],
      },
      {
        name: 'Items',
        href: '/dashboard/menu?section=item',
        permissions: ['view_item', 'manage_menu'],
      },
      {
        name: 'Template Menus',
        href: '/dashboard/menu?section=template',
        permissions: ['view_templatemenu', 'manage_menu'],
      },
      {
        name: 'Ingredients',
        href: '/dashboard/menu/ingredients',
        permissions: ['view_item', 'manage_menu'],
      },
      {
        name: 'Vendors',
        href: '/dashboard/menu/vendors',
        permissions: ['view_item', 'manage_menu'],
      },
    ],
  },
  {
    name: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
    permissions: ['view_reports'],
  },
  {
    name: 'Activity',
    href: '/dashboard/logs',
    icon: Activity,
    permissions: ['view_audit_logs', 'manage_users'],
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    permissions: [
      'add_user',
      'view_user',
      'delete_user',
      'add_role',
      'view_role',
      'delete_role',
      'add_permission',
      'view_permission',
      'delete_permission',
      'assign_role',
      'manage_permission',
      'manage_roles',
      'manage_users',
    ],
    children: [
      {
        name: 'Users',
        href: '/dashboard/settings?section=users',
        permissions: ['view_user', 'add_user', 'delete_user', 'manage_users'],
      },
      {
        name: 'Roles',
        href: '/dashboard/settings?section=roles',
        permissions: [
          'view_role',
          'add_role',
          'edit_role',
          'delete_role',
          'manage_roles',
          'manage_permission',
        ],
      },
    ],
  },
];

// Combined for existing usages that expect a flat array
const navigation: NavigationItem[] = [...primaryNavigation, ...secondaryNavigation];

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  customers: 'Customers',
  enquiries: 'Enquiries',
  bookings: 'Bookings',
  calendar: 'Calendar',
  halls: 'Venues',
  menu: 'Menu & Items',
  ingredients: 'Ingredients',
  vendors: 'Vendors',
  payments: 'Payments',
  reports: 'Reports',
  logs: 'Activity Logs',
  settings: 'Settings',
  create: 'Create',
  edit: 'Edit',
};

function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      <ol className="breadcrumb-list">
        {segments.map((seg, index) => {
          const isLast = index === segments.length - 1;
          return (
            <li
              key={`${seg}-${index}`}
              className="breadcrumb-item"
            >
              {index > 0 && (
                <ChevronRight
                  aria-hidden="true"
                  className="breadcrumb-chevron"
                />
              )}
              {isLast ? (
                <span className="breadcrumb-current">{ROUTE_LABELS[seg] ?? seg}</span>
              ) : (
                <span className="breadcrumb-seg">{ROUTE_LABELS[seg] ?? seg}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function SearchShortcut() {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const platform = (navigator as any).userAgentData?.platform || (navigator.platform ?? '');
    setIsMac(/mac/i.test(platform));
  }, []);

  return <span className="kbd">{isMac ? '⌘K' : 'Ctrl K'}</span>;
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      type="button"
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className="sidebar-icon-btn inline-flex items-center justify-center cursor-pointer theme-toggle-btn"
    >
      {theme === 'dark' ? (
        <Sun width={16} height={16} aria-hidden="true" />
      ) : (
        <Moon width={16} height={16} aria-hidden="true" />
      )}
    </button>
  );
}

// ── Idle timeout config ───────────────────────────────────────────────────────
// Defined at module scope so they are stable references (no useCallback deps churn).
const IDLE_TIMEOUT_MS = 4 * 60 * 60 * 1000; // 4 hours total idle window
const IDLE_WARN_MS = 60 * 1000;         // show warning 60 s before logout
const IDLE_WARN_SECONDS = IDLE_WARN_MS / 1000; // countdown start value (60)
// ─────────────────────────────────────────────────────────────────────────────

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout, isAuthenticated, isAuthReady } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const navToggleRef = useRef<HTMLButtonElement>(null);
  const mobileSidebarRef = useRef<HTMLElement>(null);

  const sectionParam = searchParams.get('section');

  // ── Idle timeout ────────────────────────────────────────────────────────────
  // 4-hour idle window (IDLE_TIMEOUT_MS). 60-second warning before auto-logout.
  // Staff share computers so we need to protect against walk-away sessions.
  const [idleWarningOpen, setIdleWarningOpen] = useState(false);
  const [idleCountdown, setIdleCountdown] = useState(IDLE_WARN_SECONDS);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearCountdownInterval = useCallback(() => {
    if (countdownIntervalRef.current !== null) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleIdleWarn = useCallback(() => {
    setIdleCountdown(IDLE_WARN_SECONDS);
    setIdleWarningOpen(true);
    clearCountdownInterval();
    countdownIntervalRef.current = setInterval(() => {
      setIdleCountdown((prev) => {
        if (prev <= 1) {
          clearCountdownInterval();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdownInterval]);

  const handleIdleActivity = useCallback(() => {
    clearCountdownInterval();
    setIdleWarningOpen(false);
  }, [clearCountdownInterval]);

  const handleIdleTimeout = useCallback(async () => {
    clearCountdownInterval();
    setIdleWarningOpen(false);
    await logout();
    router.push('/login');
  }, [clearCountdownInterval, logout, router]);

  const handleStayLoggedIn = useCallback(() => {
    // Dismissing the modal counts as activity — the hook will reschedule timers
    // via the next real activity event. We also directly close the modal here.
    clearCountdownInterval();
    setIdleWarningOpen(false);
  }, [clearCountdownInterval]);

  useIdleTimeout({
    timeoutMs: IDLE_TIMEOUT_MS,
    warnBeforeMs: IDLE_WARN_MS,
    onWarn: handleIdleWarn,
    onTimeout: handleIdleTimeout,
    onActivity: handleIdleActivity,
    enabled: isAuthenticated,
  });

  // Clean up countdown interval on unmount
  useEffect(() => {
    return () => clearCountdownInterval();
  }, [clearCountdownInterval]);
  // ── End idle timeout ─────────────────────────────────────────────────────────

  const isHrefActive = (href: string) => {
    const [targetPath, queryString] = href.split('?');
    if (!routeMatches(pathname, targetPath)) {
      return false;
    }
    if (!queryString) {
      return true;
    }
    const expectedParams = new URLSearchParams(queryString);
    return Array.from(expectedParams.entries()).every(
      ([key, value]) => searchParams.get(key) === value
    );
  };

  const visiblePrimary = useMemo(() => {
    return primaryNavigation
      .filter((item) =>
        hasAccessForRequiredPermissions(user?.permissions, item.permissions)
      )
      .map((item) => ({
        ...item,
        children: (item.children || []).filter((child) =>
          hasAccessForRequiredPermissions(user?.permissions, child.permissions)
        ),
      }));
  }, [user?.permissions]);

  const visibleSecondary = useMemo(() => {
    return secondaryNavigation
      .filter((item) =>
        hasAccessForRequiredPermissions(user?.permissions, item.permissions)
      )
      .map((item) => ({
        ...item,
        children: (item.children || []).filter((child) =>
          hasAccessForRequiredPermissions(user?.permissions, child.permissions)
        ),
      }));
  }, [user?.permissions]);

  const visibleNavigation = useMemo(
    () => [...visiblePrimary, ...visibleSecondary],
    [visiblePrimary, visibleSecondary]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('sidebar-collapsed');
    setSidebarCollapsed(stored === 'true');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cores = navigator.hardwareConcurrency ?? 4;
    const memory = (navigator as any).deviceMemory ?? 4;
    const conn = (navigator as any).connection;
    const slowNet = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
    let tier: 'low' | 'mid' | 'high' = 'high';
    if (cores <= 2 || memory <= 1 || slowNet) tier = 'low';
    else if (cores <= 4 || memory <= 2) tier = 'mid';
    document.documentElement.dataset.deviceTier = tier;
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Nav badges (actionable counts only — pending enquiries, outstanding
  // payments). React Query owns freshness; SSE events invalidate (debounced so
  // bulk updates trigger one refetch); slow interval covers SSE-down sessions.
  const queryClient = useQueryClient();
  const { data: navBadges } = useQuery({
    queryKey: ['nav-badges'],
    queryFn: async () => {
      const [enq, out] = await Promise.all([
        apiClient.get('/enquiries/count?status=pending'),
        apiClient.get('/bookings/count?status=outstanding'),
      ]);
      return {
        pendingEnquiries: (enq.data?.data?.count ?? enq.data?.count ?? 0) as number,
        outstandingPayments: (out.data?.data?.count ?? out.data?.count ?? 0) as number,
      };
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
    refetchInterval: 5 * 60 * 1000,
  });
  const pendingEnquiries = navBadges?.pendingEnquiries ?? 0;
  const outstandingPayments = navBadges?.outstandingPayments ?? 0;

  const badgeRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedRefreshNavBadges = useCallback(() => {
    if (badgeRefreshTimerRef.current) clearTimeout(badgeRefreshTimerRef.current);
    badgeRefreshTimerRef.current = setTimeout(() => {
      badgeRefreshTimerRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ['nav-badges'] });
    }, 2000);
  }, [queryClient]);

  useEffect(() => () => {
    if (badgeRefreshTimerRef.current) clearTimeout(badgeRefreshTimerRef.current);
  }, []);

  useSSE(['enquiry:', 'booking:'], debouncedRefreshNavBadges, isAuthenticated);

  useEffect(() => {
    if (!isAuthReady || typeof window === 'undefined') return;
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isAuthReady, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }

    const fallbackRoute = getDefaultDashboardRoute(user.permissions);
    if (!fallbackRoute) {
      void logout();
      router.replace('/login');
      return;
    }

    if (!isPathAllowedForUser(pathname, user.permissions)) {
      router.replace(fallbackRoute);
    }
  }, [isAuthenticated, user, pathname, router, logout]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useFocusTrap(sidebarOpen, mobileSidebarRef);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      setSidebarOpen(false);
      window.setTimeout(() => navToggleRef.current?.focus(), 0);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const activeNav = useMemo(
    () =>
      visibleNavigation.find(
        (item) => routeMatches(pathname, item.href)
      ),
    [visibleNavigation, pathname]
  );

  useEffect(() => {
    if (!activeNav?.children?.length) return;
    setOpenGroups((prev) => {
      if (prev[activeNav.name]) return prev;
      return { ...prev, [activeNav.name]: true };
    });
  }, [activeNav?.name, activeNav?.children?.length, sectionParam]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navToggleButton = (
    <button
      ref={navToggleRef}
      type="button"
      onClick={() => {
        // 860px must match the CSS only-desktop/only-mobile switch (layout.css).
        if (typeof window !== 'undefined' && window.matchMedia('(min-width: 860px)').matches) {
          setSidebarCollapsed((prev) => !prev);
          return;
        }
        setSidebarOpen(true);
      }}
      aria-label={sidebarCollapsed ? 'Expand navigation' : 'Toggle navigation'}
      className="header-icon-btn header-icon-hover nav-toggle-btn"
    >
      <Menu className="icon-18" aria-hidden="true" />
    </button>
  );

  const renderNavItem = (item: NavigationItem, secondary: boolean, isCollapsed: boolean) => {
    const isActive = routeMatches(pathname, item.href);
    const hasChildren = Boolean(item.children && item.children.length > 0);
    const isOpen = hasChildren ? (openGroups[item.name] ?? isActive) : false;
    const badge =
      !secondary && item.name === 'Enquiries' && pendingEnquiries > 0
        ? { count: pendingEnquiries, toneClass: 'nav-badge-danger' }
        : !secondary && item.name === 'Payments' && outstandingPayments > 0
        ? { count: outstandingPayments, toneClass: 'nav-badge-warning' }
        : null;

    return (
      <div key={item.name} className="nav-item-wrapper">
        <div className={`nav-row${isActive ? ' active' : ''}`}>
          {isActive && <div className="nav-active-bar" />}
          <Link
            href={item.href}
            prefetch={shouldPrefetchDashboardRoute(item.href)}
            aria-current={isActive ? 'page' : undefined}
            title={isCollapsed ? item.name : undefined}
            className={`nav-link${secondary ? ' nav-link-secondary' : ''}${isActive ? ' active' : ''}`}
          >
            <item.icon className="nav-link-icon" aria-hidden="true" />
            <span className="sidebar-label sidebar-nav-label nav-link-text">{item.name}</span>
            {badge && !isCollapsed && (
              <span className={`nav-badge ${badge.toneClass}`}>
                {badge.count > 99 ? '99+' : badge.count}
              </span>
            )}
          </Link>
          {hasChildren && !isCollapsed && (
            <button
              type="button"
              aria-label={`Toggle ${item.name} submenu`}
              aria-expanded={isOpen}
              onClick={() =>
                setOpenGroups((prev) => ({
                  ...prev,
                  [item.name]: !isOpen,
                }))
              }
              className="nav-caret-btn"
            >
              <ChevronDown
                aria-hidden="true"
                className={`nav-caret-icon${isOpen ? ' open' : ''}`}
              />
            </button>
          )}
        </div>

        {hasChildren && isOpen && (
          <div className={`nav-children${secondary ? ' nav-children-secondary' : ''}`}>
            {item.children?.map((child) => {
              const childActive = isHrefActive(child.href);
              return (
                <Link
                  key={`${item.name}-${child.name}`}
                  href={child.href}
                  prefetch={shouldPrefetchDashboardRoute(child.href)}
                  className={`nav-child-link${childActive ? ' active' : ''}`}
                >
                  {child.name}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderSidebarContent = (isMobile: boolean, isCollapsed: boolean) => (
    <div
      className={isCollapsed ? 'sidebar-collapsed sidebar-inner' : 'sidebar-inner'}
    >
      <div className="sidebar-header">
        {isMobile && (
          <button
            type="button"
            className="lg:hidden sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            <X className="icon-16" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav aria-label="Main navigation" className="sidebar-nav">
        {/* PRIMARY nav group */}
        {visiblePrimary.map((item) => renderNavItem(item, false, isCollapsed))}

        {/* Divider between primary and secondary nav */}
        {visibleSecondary.length > 0 && (
          <div className="nav-divider" />
        )}

        {/* SECONDARY nav group — de-emphasised admin/config items */}
        {visibleSecondary.map((item) => renderNavItem(item, true, isCollapsed))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-row">
          <Avatar name={user?.name} size="sm" />
          <button
            type="button"
            onClick={() => router.push('/dashboard/profile')}
            className="sidebar-label sidebar-user-info text-left"
            title="My profile & password"
          >
            <p className="sidebar-user-name">{user?.name || 'User'}</p>
            <p className="sidebar-user-email">{user?.email}</p>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Log out"
            title={isCollapsed ? 'Log out' : undefined}
            className="header-icon-btn logout-btn-hover logout-btn"
          >
            <LogOut className="icon-15" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!isAuthReady) {
    return (
      <div className="loading-screen">
        <div className="loading-stack">
          <div className="skeleton loading-avatar" />
          <p className="loading-text">Loading workspace…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="loading-screen">
        <div className="loading-stack">
          <div className="skeleton loading-avatar" />
          <p className="loading-text">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  const currentSidebarWidth = sidebarCollapsed ? '60px' : 'var(--sidebar-w)';

  // Badges carry actionable counts only. A "total bookings" badge is noise —
  // it never tells anyone to do anything.
  const topNavItems: TopNavItem[] = visibleNavigation.map((item) => ({
    name: item.name,
    href: item.href,
    badge:
      item.name === 'Enquiries' && pendingEnquiries > 0
        ? pendingEnquiries
        : item.name === 'Payments' && outstandingPayments > 0
        ? outstandingPayments
        : null,
  }));

  return (
    <div
      className={sidebarCollapsed ? 'sidebar-collapsed ops-replica dashboard-root' : 'ops-replica dashboard-root'}
      style={{ '--current-sidebar-w': currentSidebarWidth } as React.CSSProperties}
    >
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      <TopNav
        items={topNavItems}
        pathname={pathname}
        onSearchClick={() => setPaletteOpen(true)}
        onLogout={() => void handleLogout()}
        userName={user?.name}
        userEmail={user?.email}
        primaryCount={visiblePrimary.length}
      />

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
          className="sidebar-overlay"
        />
      )}

      <aside
        ref={mobileSidebarRef}
        className="lg:hidden mobile-sidebar"
        aria-hidden={!sidebarOpen}
        style={{ transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {renderSidebarContent(true, false)}
      </aside>

      <div className="ops-content-wrapper content-wrapper">
        <header className="ops-mobile-header dashboard-header">
          <div className="lg:hidden">{navToggleButton}</div>
          <div className="header-logo-group">
            <img
              src={BIKA_LOGO_URL}
              alt="Bika Banquet"
              className="header-logo-img"
            />
            <span aria-hidden="true" className="header-logo-divider">|</span>
          </div>

          <Breadcrumb pathname={pathname} />

          <div className="flex-spacer" />

          <button
            className="header-search hidden md:flex"
            aria-label="Quick search"
            type="button"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="icon-13" aria-hidden="true" />
            <span>Quick search…</span>
            <SearchShortcut />
          </button>

          <button
            type="button"
            aria-label="Quick search"
            className="md:hidden mobile-search-btn"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="icon-16" aria-hidden="true" />
          </button>

          <SseStatusChip />
          <ThemeToggle />

          {/* Logout lives behind this avatar menu (and the drawer footer), never
              as a bare one-tap icon — a mis-tap there could discard unsaved form
              state. */}
          <UserMenu
            userName={user?.name}
            userEmail={user?.email}
            onLogout={() => void handleLogout()}
            size="md"
          />
        </header>

        <main
          id="main-content"
          className="ops-main has-bottom-nav lg:!pb-0 dashboard-main"
          style={{
            maxWidth: '100%',
            paddingLeft: '0',
            paddingRight: '0',
            /* paddingBottom is intentionally omitted here so the
               .has-bottom-nav class can apply the correct bottom
               clearance (nav height + safe-area + extra breathing room).
               On desktop, lg:!pb-0 resets it back to zero. */
          }}
          data-active-nav={activeNav?.name || ''}
        >
          <div className="page-content">
            <DashboardErrorBoundary>{children}</DashboardErrorBoundary>
          </div>
        </main>
      </div>

      <BottomNav
        permissions={user?.permissions || []}
        onMoreClick={() => setSidebarOpen(true)}
        paymentsCount={outstandingPayments}
      />

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      <ConfirmDialogHost />

      <IdleTimeoutModal
        open={idleWarningOpen}
        secondsRemaining={idleCountdown}
        onStayLoggedIn={handleStayLoggedIn}
        onLogoutNow={handleIdleTimeout}
      />
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Auth-gated shell only — QueryProvider lives at the app root so the cache
  // survives login↔dashboard and in-dashboard navigations.
  return <DashboardLayoutContent>{children}</DashboardLayoutContent>;
}
