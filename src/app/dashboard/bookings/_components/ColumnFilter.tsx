
import * as Popover from '@radix-ui/react-popover';
import { Filter } from 'lucide-react';

/**
 * A column-header filter trigger: a small funnel button that opens a Radix
 * popover (focus, Esc, outside-click, aria handled for us). `active` lights the
 * funnel teal and shows a dot when the column has a filter applied.
 */
export default function ColumnFilter({
  label,
  active,
  children,
}: {
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={`Filter ${label}`}
          className={`inline-flex items-center rounded p-1 ${
            active ? 'text-teal-600' : 'text-[var(--text-4)] hover:text-[var(--text-1)]'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          {active ? <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-teal-600" /> : null}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-64 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-left shadow-lg"
        >
          {children}
          <Popover.Arrow className="fill-[var(--surface)]" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
