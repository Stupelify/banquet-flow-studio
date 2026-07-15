
import type { LucideIcon } from 'lucide-react';

type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

type EmptyStateProps = {
  icon: LucideIcon;
  title?: string;
  description?: string;
  action?: EmptyStateAction;
  variant?: 'page' | 'search' | 'filter' | 'error';
};

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'page',
}: EmptyStateProps) {
  const resolvedTitle =
    title ||
    (variant === 'search'
      ? 'No results found'
      : variant === 'filter'
        ? 'No matches'
        : variant === 'error'
          ? 'Something went wrong'
          : 'Nothing here yet');
  const resolvedAction =
    action ||
    (variant === 'search'
      ? { label: 'Clear search', onClick: () => {} }
      : variant === 'filter'
        ? { label: 'Clear filters', onClick: () => {} }
        : undefined);

  return (
    <div className="empty-state">
      <div
        className="empty-state-icon"
        style={{ width: 52, height: 52, borderRadius: 14 }}
      >
        <Icon size={22} />
      </div>
      <p className="empty-state-title">{resolvedTitle}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
      {resolvedAction ? (
        <button
          type="button"
          onClick={resolvedAction.onClick}
          className={variant === 'page' ? 'btn btn-primary' : 'btn btn-secondary'}
        >
          {resolvedAction.label}
        </button>
      ) : null}
    </div>
  );
}
