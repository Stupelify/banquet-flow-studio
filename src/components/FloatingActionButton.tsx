
import { Plus, LucideIcon } from 'lucide-react';

interface FloatingActionButtonProps {
    onClick: () => void;
    label?: string;
    icon?: LucideIcon;
}

export default function FloatingActionButton({
    onClick,
    label = 'Create new',
    icon: Icon = Plus,
}: FloatingActionButtonProps) {
    return (
        <button
            type="button"
            className="fab lg:hidden"
            onClick={onClick}
            aria-label={label}
            title={label}
        >
            <Icon className="fab-icon" aria-hidden="true" />
        </button>
    );
}
