export type PackKey = 'breakfast' | 'lunch' | 'hiTea' | 'dinner';

export const PACK_LABELS: Record<PackKey, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  hiTea: 'Hi-Tea',
  dinner: 'Dinner',
};

export const PACK_COLOR_MAP: Record<PackKey, string> = {
  breakfast: '#f97316',
  lunch: '#22c55e',
  hiTea: '#64748b',
  dinner: '#6366f1',
};

export const PACK_BG_MAP: Record<PackKey, string> = {
  breakfast: 'bg-orange-50 dark:bg-orange-900/20',
  lunch: 'bg-green-50 dark:bg-green-900/20',
  hiTea: 'bg-[var(--surface-2)] dark:bg-slate-800/20',
  dinner: 'bg-indigo-50 dark:bg-indigo-900/20',
};

export function normalizePackKey(value: string): PackKey | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'breakfast') return 'breakfast';
  if (normalized === 'lunch') return 'lunch';
  if (normalized === 'hi-tea' || normalized === 'hitea' || normalized === 'hi tea') {
    return 'hiTea';
  }
  if (normalized === 'dinner') return 'dinner';
  return null;
}
