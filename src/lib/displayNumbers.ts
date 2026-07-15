/** Display-only number formatting for lists, KPIs, and dashboards — not for form inputs. */

export function formatDisplayNumber(
  value: unknown,
  maxFractionDigits = 2,
  minFractionDigits = 0,
): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString('en-IN', {
    minimumFractionDigits: minFractionDigits,
    maximumFractionDigits: maxFractionDigits,
  });
}

export function formatDisplayInteger(value: unknown): string {
  return formatDisplayNumber(value, 0, 0);
}

export function formatDisplayPercent(value: unknown, maxFractionDigits = 1): string {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return '0%';
  return `${formatDisplayNumber(Math.abs(n), maxFractionDigits)}%`;
}

export function formatDisplayInr(value: unknown, maxFractionDigits = 2): string {
  return `₹${formatDisplayNumber(value, maxFractionDigits)}`;
}
