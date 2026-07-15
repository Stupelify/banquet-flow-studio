import { type ReactNode } from 'react';

interface StatPill {
  label: string;
  value: ReactNode;
}

interface ToolbarProps {
  title: string;
  stats?: StatPill[];
  actions?: ReactNode;
  children?: ReactNode;
}

export default function Toolbar({ title, stats, actions, children }: ToolbarProps) {
  return (
    <div className="toolbar">
      <h1 className="toolbar-title">{title}</h1>

      {stats && stats.length > 0 && (
        <div className="toolbar-stats" role="list">
          {stats.map((s, i) => (
            <div key={i} className="statpill" role="listitem">
              <span className="statpill-label">{s.label}</span>
              <span className="statpill-value">{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {(actions || children) && (
        <div className="toolbar-actions">
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
