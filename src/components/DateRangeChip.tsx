
import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/style.css';
import { CalendarDays, Check } from 'lucide-react';
import {
  endOfQuarter,
  format,
  parseISO,
  startOfDay,
  startOfQuarter,
  subDays,
} from 'date-fns';
import { formatAppDate } from '@/lib/format';

export type RangePreset = 'today' | '7d' | '30d' | 'quarter' | 'fy' | 'all' | 'custom';

export interface DateRangeValue {
  preset: RangePreset;
  /** ISO yyyy-MM-dd. Empty for the 'all' preset. */
  from: string;
  to: string;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');

// Presets resolve to concrete dates so every consumer sends the same
// { startDate, endDate } shape to the API — 'all' sends neither.
export function resolvePreset(preset: Exclude<RangePreset, 'custom'>): { from: string; to: string } {
  const today = startOfDay(new Date());
  switch (preset) {
    case 'today':
      return { from: iso(today), to: iso(today) };
    case '7d':
      return { from: iso(subDays(today, 6)), to: iso(today) };
    case '30d':
      return { from: iso(subDays(today, 29)), to: iso(today) };
    case 'quarter':
      return { from: iso(startOfQuarter(today)), to: iso(endOfQuarter(today)) };
    case 'fy': {
      // Indian financial year: 1 Apr → 31 Mar (month index 3 == April).
      const y = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
      return { from: `${y}-04-01`, to: `${y + 1}-03-31` };
    }
    case 'all':
    default:
      return { from: '', to: '' };
  }
}

const PRESETS: Array<{ key: Exclude<RangePreset, 'custom'>; label: string }> = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'quarter', label: 'This quarter' },
  { key: 'fy', label: 'Financial year' },
  { key: 'all', label: 'All time' },
];

function labelFor(value: DateRangeValue): string {
  const preset = PRESETS.find((p) => p.key === value.preset);
  if (preset) return preset.label;
  if (value.from && value.to) {
    return `${formatAppDate(value.from)} – ${formatAppDate(value.to)}`;
  }
  return 'Custom range';
}

interface DateRangeChipProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

// One control replacing the preset select + two native date inputs + Refresh.
// Presets apply instantly; a react-day-picker range covers the custom case.
export default function DateRangeChip({ value, onChange, className }: DateRangeChipProps) {
  const [open, setOpen] = useState(false);

  const selectedRange: DateRange | undefined =
    value.from && value.to
      ? { from: parseISO(value.from), to: parseISO(value.to) }
      : undefined;

  const applyPreset = (key: Exclude<RangePreset, 'custom'>) => {
    onChange({ preset: key, ...resolvePreset(key) });
    setOpen(false);
  };

  const handleRangeSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ preset: 'custom', from: iso(range.from), to: iso(range.to) });
      setOpen(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={`daterange-chip inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] transition ${className ?? ''}`}
          aria-label={`Date range: ${labelFor(value)}`}
        >
          <CalendarDays className="w-4 h-4 text-[var(--text-4)]" />
          {labelFor(value)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="daterange-popover" align="end" sideOffset={6}>
          <div className="daterange-presets">
            {PRESETS.map((preset) => {
              const active = value.preset === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => applyPreset(preset.key)}
                  className={`daterange-preset${active ? ' active' : ''}`}
                >
                  {preset.label}
                  {active && <Check className="w-3.5 h-3.5" />}
                </button>
              );
            })}
          </div>
          <div className="daterange-calendar rdp-bika">
            <DayPicker
              mode="range"
              numberOfMonths={1}
              selected={selectedRange}
              onSelect={handleRangeSelect}
              defaultMonth={selectedRange?.from}
              weekStartsOn={1}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
