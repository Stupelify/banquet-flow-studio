
/**
 * Recharts wrappers themed with the design-system tokens. These replace the
 * hand-rolled SVG charts: interactive tooltips, responsive sizing, and
 * consistent INR formatting come for free.
 */
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatINR } from '@/lib/format';

export const CHART_COLORS = ['#14b8a6', '#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#94a3b8'];

function formatAxisValue(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)}Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function formatInr(value: number): string {
  return formatINR(Math.round(value));
}

const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border-2)',
  borderRadius: 10,
  fontSize: 12,
  color: 'var(--text-1)',
  boxShadow: 'var(--shadow-md)',
} as const;

const axisTick = { fontSize: 10, fill: 'var(--text-4)' } as const;

/** Vertical bars of one numeric series, INR tooltip. */
export function RevenueBarChart({
  data,
  height = 200,
  color = 'var(--teal-500)',
  valueLabel = 'Revenue',
  inr = true,
}: {
  data: Array<{ label: string; value: number }>;
  height?: number;
  color?: string;
  valueLabel?: string;
  inr?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis
          tick={axisTick}
          tickFormatter={formatAxisValue}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--surface-2)' }}
          formatter={(value) => [
            inr ? formatInr(Number(value)) : String(value),
            valueLabel,
          ]}
        />
        <Bar dataKey="value" fill={color} radius={[6, 6, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Donut breakdown with hover tooltips; colors match the legend rows. */
export function UtilizationDonut({
  data,
  size = 180,
  thickness = 22,
  colors = CHART_COLORS,
}: {
  data: Array<{ label: string; value: number }>;
  size?: number;
  thickness?: number;
  colors?: string[];
}) {
  const outer = size / 2;
  return (
    <PieChart width={size} height={size}>
      <Pie
        data={data}
        dataKey="value"
        nameKey="label"
        cx="50%"
        cy="50%"
        innerRadius={outer - thickness}
        outerRadius={outer}
        paddingAngle={2}
        strokeWidth={0}
      >
        {data.map((entry, index) => (
          <Cell key={entry.label} fill={colors[index % colors.length]} />
        ))}
      </Pie>
      <Tooltip contentStyle={tooltipStyle} />
    </PieChart>
  );
}

/** Bookings (bars, left axis) vs revenue (line, right axis) per month. */
export function TrendComposedChart({
  data,
  height = 240,
  formatMonth = (m: string) => m,
}: {
  data: Array<{ month: string; bookings: number; revenue: number }>;
  height?: number;
  formatMonth?: (month: string) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
        <XAxis dataKey="month" tickFormatter={formatMonth} tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis
          yAxisId="bookings"
          tick={axisTick}
          tickLine={false}
          axisLine={false}
          width={36}
          allowDecimals={false}
        />
        <YAxis
          yAxisId="revenue"
          orientation="right"
          tick={axisTick}
          tickFormatter={formatAxisValue}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: 'var(--surface-2)' }}
          labelFormatter={(label) => formatMonth(String(label))}
          formatter={(value, name) =>
            name === 'Revenue' ? [formatInr(Number(value)), name] : [String(value), name]
          }
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          yAxisId="bookings"
          dataKey="bookings"
          name="Bookings"
          fill="var(--teal-500)"
          radius={[6, 6, 0, 0]}
          maxBarSize={28}
        />
        <Line
          yAxisId="revenue"
          dataKey="revenue"
          name="Revenue"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ r: 2.5 }}
          activeDot={{ r: 4 }}
          type="monotone"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
