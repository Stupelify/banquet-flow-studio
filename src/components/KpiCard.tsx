
import type { LucideIcon } from 'lucide-react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { formatDisplayPercent } from '@/lib/displayNumbers';

type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: { value: number; label: string };
  icon?: LucideIcon;
  sparkline?: number[];
  format?: 'number' | 'currency' | 'percent';
  currency?: string;
};

function formatValue(
  value: string | number,
  format: KpiCardProps['format'],
  currency: string
) {
  if (typeof value === 'string') return value;
  if (format === 'currency') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (format === 'percent') {
    return `${new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(value)}%`;
  }
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value);
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length === 0) return null;

  const width = 60;
  const height = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="60" height="24" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="var(--teal-500)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

export default function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  sparkline,
  format = 'number',
  currency = 'INR',
}: KpiCardProps) {
  const DeltaIcon = delta && delta.value >= 0 ? TrendingUp : TrendingDown;
  const deltaClass =
    delta && delta.value >= 0 ? 'delta-up' : delta && delta.value < 0 ? 'delta-down' : 'delta-neutral';

  return (
    <div className="kpi-card">
      <div className="kpi-label">
        <span>{label}</span>
        {Icon ? <Icon size={16} className="text-text-4" /> : null}
      </div>
      <p className="kpi-value num">{formatValue(value, format, currency)}</p>
      <div className="flex items-center justify-between gap-3">
        {delta ? (
          <span className={`kpi-delta ${deltaClass}`}>
            <DeltaIcon size={12} />
            {formatDisplayPercent(delta.value, 2)} {delta.label}
          </span>
        ) : <span />}
        {sparkline ? <Sparkline values={sparkline} /> : null}
      </div>
    </div>
  );
}
