
export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** Accessible name; required because the control has no visible text. */
  label: string;
}

export default function Switch({ checked, onChange, disabled = false, label }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-primary-600 border-primary-600' : 'bg-surface-3 border-border-2'
      }`}
      style={{ transitionDuration: 'var(--motion-base)' }}
    >
      <span
        aria-hidden="true"
        className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
        style={{ transitionDuration: 'var(--motion-base)' }}
      />
    </button>
  );
}
