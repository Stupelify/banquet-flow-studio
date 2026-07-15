
import { useRouter } from '@/lib/router-compat';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { LogOut, User } from 'lucide-react';
import Avatar from './Avatar';

interface UserMenuProps {
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
  /** 'sm' for the compact TopNav; 'md' for the mobile header. */
  size?: 'sm' | 'md';
}

// Avatar → dropdown with Profile + Log out. Replaces the bare logout icon that
// sat one mis-tap from other header actions and could discard unsaved form state.
export default function UserMenu({ userName, userEmail, onLogout, size = 'sm' }: UserMenuProps) {
  const router = useRouter();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]"
          aria-label="Account menu"
        >
          <Avatar name={userName} size={size} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="app-menu-content" align="end" sideOffset={8}>
          {(userName || userEmail) && (
            <>
              <div className="app-menu-user">
                {userName && <div className="app-menu-user-name">{userName}</div>}
                {userEmail && <div className="app-menu-user-email">{userEmail}</div>}
              </div>
              <div className="app-menu-sep" role="separator" />
            </>
          )}
          <DropdownMenu.Item
            className="app-menu-item"
            onSelect={() => router.push('/dashboard/profile')}
          >
            <User className="w-4 h-4" aria-hidden="true" />
            My profile &amp; password
          </DropdownMenu.Item>
          <DropdownMenu.Item className="app-menu-item danger" onSelect={onLogout}>
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Log out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
