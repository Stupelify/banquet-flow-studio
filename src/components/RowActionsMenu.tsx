
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface RowAction {
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

interface RowActionsMenuProps {
  actions: Array<RowAction | false | null | undefined>;
  /** Accessible label for the trigger; also its tooltip. */
  label?: string;
  align?: 'start' | 'end';
}

// One overflow (kebab) menu shared by the bookings table row, desktop card and
// mobile card. Destructive actions (Delete) live here instead of as an inline
// trash icon a mis-tap from Edit. Radix handles focus, keyboard nav and escape.
export default function RowActionsMenu({ actions, label = 'Row actions', align = 'end' }: RowActionsMenuProps) {
  const items = actions.filter(Boolean) as RowAction[];
  if (items.length === 0) return null;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="app-menu-trigger"
          aria-label={label}
          title={label}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="w-4 h-4" aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="app-menu-content"
          align={align}
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenu.Item
                key={action.label}
                className={`app-menu-item${action.danger ? ' danger' : ''}`}
                disabled={action.disabled}
                onSelect={action.onSelect}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                {action.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
