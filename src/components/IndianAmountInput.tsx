
import {
  formatIndianAmountDisplay,
  stripToDigits,
} from '@/lib/indianAmountFormat';
import type { FocusEvent, ChangeEvent, KeyboardEvent } from 'react';

export interface IndianAmountInputProps {
  value: string;
  onChange?: (digits: string) => void;
  onBlur?: (e: FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  title?: string;
  id?: string;
}

/**
 * Rupee amount entry: real input holds digits only; mirror shows en-IN commas.
 * Parents always receive digit-only strings — billing state unchanged.
 */
export function IndianAmountInput({
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  className = 'input',
  disabled,
  readOnly,
  placeholder,
  'aria-label': ariaLabel,
  title,
  id,
}: IndianAmountInputProps) {
  const digits = stripToDigits(value);
  const formatted = formatIndianAmountDisplay(digits);
  const hasDigits = digits !== '';
  // In flex rows, a full-width wrapper steals space from siblings (e.g. extra-item name).
  const explicitWidth = className.match(/\b(w-\d+|w-\[[^\]]+\])\b/)?.[0];
  const wrapperClass = explicitWidth
    ? `relative shrink-0 min-w-0 ${explicitWidth}`
    : 'relative w-full min-w-0';

  return (
    <div className={wrapperClass}>
      {hasDigits && (
        <div
          className={`pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-nowrap ${className.includes('text-right') ? 'justify-end' : 'justify-start'} ${className}`}
          aria-hidden
        >
          <span className="truncate">{formatted}</span>
        </div>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`${className} relative z-[1] ${
          hasDigits ? 'bg-transparent text-transparent' : ''
        } caret-[var(--text-1)] selection:bg-teal-200/40 dark:selection:bg-teal-800/50 disabled:cursor-not-allowed read-only:cursor-default`}
        value={digits}
        disabled={disabled}
        readOnly={readOnly}
        placeholder={placeholder}
        aria-label={ariaLabel}
        title={title}
        onFocus={(e) => {
          e.target.select();
          onFocus?.(e);
        }}
        onChange={(e) => onChange?.(stripToDigits(e.target.value))}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
