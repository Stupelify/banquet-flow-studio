export interface DashboardRouteRule {
  href: string;
  permissions: string[];
}

// Order matters: getDefaultDashboardRoute() lands the user on the first rule
// they can access. Calendar leads so login drops onto the availability board.
export const DASHBOARD_ROUTE_RULES: DashboardRouteRule[] = [
  {
    href: '/dashboard/calendar',
    permissions: [
      'view_calendar',
      'view_booking',
      'view_enquiry',
      'manage_bookings',
      'manage_enquiries',
    ],
  },
  {
    href: '/dashboard',
    permissions: ['view_dashboard'],
  },
  {
    href: '/dashboard/bookings',
    permissions: ['view_booking', 'manage_bookings'],
  },
  {
    href: '/dashboard/customers',
    permissions: ['view_customer', 'manage_customers'],
  },
  {
    href: '/dashboard/enquiries',
    permissions: ['view_enquiry', 'manage_enquiries'],
  },
  {
    href: '/dashboard/halls',
    permissions: ['view_hall', 'view_banquet', 'manage_halls'],
  },
  {
    href: '/dashboard/menu',
    permissions: ['view_item', 'view_itemtype', 'view_templatemenu', 'manage_menu'],
  },
  {
    href: '/dashboard/payments',
    permissions: ['manage_payments'],
  },
  {
    href: '/dashboard/reports',
    permissions: ['view_reports'],
  },
  {
    href: '/dashboard/logs',
    permissions: ['view_audit_logs', 'manage_users'],
  },
  {
    href: '/dashboard/settings',
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
  },
];

export function hasAccessForRequiredPermissions(
  userPermissions: string[] | undefined,
  requiredPermissions: string[]
): boolean {
  if (!userPermissions || userPermissions.length === 0) {
    return false;
  }
  return requiredPermissions.some((permission) =>
    userPermissions.includes(permission)
  );
}

export function routeMatches(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isPathAllowedForUser(
  pathname: string,
  userPermissions: string[] | undefined
): boolean {
  // The profile page (self password change) is available to any authenticated
  // user regardless of their module permissions.
  if (routeMatches(pathname, '/dashboard/profile')) {
    return true;
  }
  return DASHBOARD_ROUTE_RULES.some(
    (rule) =>
      routeMatches(pathname, rule.href) &&
      hasAccessForRequiredPermissions(userPermissions, rule.permissions)
  );
}

export function getDefaultDashboardRoute(
  userPermissions: string[] | undefined
): string | null {
  const firstAllowedRule = DASHBOARD_ROUTE_RULES.find((rule) =>
    hasAccessForRequiredPermissions(userPermissions, rule.permissions)
  );
  return firstAllowedRule?.href || null;
}
