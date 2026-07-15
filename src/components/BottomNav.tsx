
import { Link } from '@/lib/router-compat';
import { usePathname } from '@/lib/router-compat';
import { shouldPrefetchDashboardRoute } from '@/lib/navigationPrefetch';
import {
    CalendarDays,
    CalendarCheck,
    DollarSign,
    LayoutDashboard,
    Menu,
} from 'lucide-react';
import { useMemo } from 'react';

interface BottomNavProps {
    permissions: string[];
    onMoreClick: () => void;
    paymentsCount?: number;
}

// Four top-level tabs maximum — everything else lives under "More". Cramming
// 6+ tabs onto a 375px screen makes every target too small to hit reliably.
const navItems = [
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
        name: 'Insights',
        href: '/dashboard',
        icon: LayoutDashboard,
        permissions: ['view_dashboard'],
        exact: true,
    },
];

function hasAccess(userPerms: string[], requiredPerms: string[]): boolean {
    if (!requiredPerms.length) return true;
    return requiredPerms.some((p) => userPerms.includes(p));
}

export default function BottomNav({
    permissions,
    onMoreClick,
    paymentsCount = 0,
}: BottomNavProps) {
    const pathname = usePathname();

    const visibleItems = useMemo(
        () => navItems.filter((item) => hasAccess(permissions, item.permissions)),
        [permissions]
    );

    return (
        <nav className="bottom-nav lg:hidden" aria-label="Quick navigation">
            {visibleItems.map((item) => {
                const isActive = item.exact
                    ? pathname === item.href
                    : pathname.startsWith(item.href);
                const badge = item.name === 'Payments' ? paymentsCount : 0;
                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        prefetch={shouldPrefetchDashboardRoute(item.href)}
                        className={`bottom-nav-item${isActive ? ' active' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <span className="bottom-nav-icon-wrap">
                            <item.icon className="bottom-nav-icon" aria-hidden="true" />
                            {badge > 0 && (
                                <span className="bottom-nav-badge" aria-label={`${badge} outstanding payments`}>
                                    {badge > 99 ? '99+' : badge}
                                </span>
                            )}
                        </span>
                        <span>{item.name}</span>
                    </Link>
                );
            })}
            <button
                type="button"
                className="bottom-nav-item"
                onClick={onMoreClick}
                aria-label="More navigation options"
            >
                <Menu className="bottom-nav-icon" aria-hidden="true" />
                <span>More</span>
            </button>
        </nav>
    );
}
