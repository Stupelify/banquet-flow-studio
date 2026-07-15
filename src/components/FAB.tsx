
import { type ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface FABProps {
  onClick: () => void;
  icon?: ReactNode;
  label?: string;
}

export default function FAB({ onClick, icon, label = 'New' }: FABProps) {
  return (
    <button
      type="button"
      className="fab"
      onClick={onClick}
      aria-label={label}
    >
      {icon ?? <Plus width={22} height={22} aria-hidden="true" />}
    </button>
  );
}
