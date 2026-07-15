
import type { ReactNode } from 'react';

interface AdaptiveCardProps {
  children: ReactNode;
  className?: string;
  header?: ReactNode;
  title?: ReactNode;
  subtitle?: ReactNode;
  noPadding?: boolean;
}

export function AdaptiveCard({
  children,
  className = '',
  header,
  title,
  subtitle,
  noPadding = false,
}: AdaptiveCardProps) {
  return (
    <div className={`card ${className}`}>
      {(header || title || subtitle) && (
        <div className="panel-header">
          {header}
          <div>
            {title && <h3 className="panel-title">{title}</h3>}
            {subtitle && <p className="panel-subtitle">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className={noPadding ? '' : 'panel-body'}>
        {children}
      </div>
    </div>
  );
}
