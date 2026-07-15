
import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { Moon, Search, Sun } from 'lucide-react';
import UserMenu from './UserMenu';
import { BIKA_LOGO_URL } from '@/lib/brandAssets';
import { useTheme } from '@/hooks/useTheme';

export interface TopNavItem {
  name: string;
  href: string;
  badge?: number | null;
}

interface TopNavProps {
  items: TopNavItem[];
  pathname: string;
  onSearchClick: () => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
  /** Items before this index are the primary/daily-driver group; a thin
   *  divider marks where the de-emphasised admin/config group starts —
   *  mirrors the sidebar drawer's primary/secondary split. */
  primaryCount?: number;
}

// HH:MM only — seconds forced a full TopNav re-render every second for zero
// operational value. Ticks every 15s to catch the minute change promptly.
function useClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString('en-IN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        })
      );
    tick();
    const id = setInterval(tick, 15_000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/') || pathname.startsWith(href + '?');
}

export default function TopNav({ items, pathname, onSearchClick, onLogout, userName, userEmail, primaryCount }: TopNavProps) {
  const clock = useClock();
  const { theme, toggle } = useTheme();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const p =
      (navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ??
      navigator.platform ??
      '';
    setIsMac(/mac/i.test(p));
  }, []);

  return (
    <header className="top-nav" aria-label="Main navigation">
      <div className="top-nav-mark">
        <img src={BIKA_LOGO_URL} alt="Bika Banquet" className="top-nav-logo" />
      </div>
      <div className="top-nav-divider" aria-hidden="true" />

      <nav className="top-nav-links" aria-label="Site navigation">
        {items.map((item, index) => {
          const active = isNavActive(pathname, item.href);
          return (
            <span key={item.href} style={{ display: 'contents' }}>
              {primaryCount != null && index === primaryCount && (
                <div className="top-nav-divider" aria-hidden="true" />
              )}
              <Link
                href={item.href}
                className={`top-nav-link${active ? ' active' : ''}${index >= (primaryCount ?? Infinity) ? ' top-nav-link-secondary' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {item.name}
                {item.badge != null && item.badge > 0 && (
                  <span className={`top-nav-badge${active ? ' active' : ''}`} aria-label={`${item.badge} pending`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            </span>
          );
        })}
      </nav>

      <div className="top-nav-right">
        <button
          type="button"
          className="top-nav-search"
          aria-label="Quick search"
          onClick={onSearchClick}
        >
          <Search style={{ width: 13, height: 13 }} aria-hidden="true" />
          <span>Search</span>
          <kbd className="kbd" aria-hidden="true">{isMac ? '⌘K' : 'Ctrl K'}</kbd>
        </button>

        {clock && (
          <div className="top-nav-clock" aria-label={`Current time: ${clock} IST`}>
            <span className="top-nav-time">{clock}</span>
            <span className="top-nav-tz">Kolkata</span>
          </div>
        )}

        <button
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={toggle}
          className="header-icon-btn header-icon-hover"
        >
          {theme === 'dark' ? (
            <Sun width={16} height={16} aria-hidden="true" />
          ) : (
            <Moon width={16} height={16} aria-hidden="true" />
          )}
        </button>

        <UserMenu userName={userName} userEmail={userEmail} onLogout={onLogout} size="sm" />
      </div>
    </header>
  );
}
