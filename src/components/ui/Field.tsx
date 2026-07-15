
import { useId, type ReactNode } from 'react';

export interface FieldProps {
  label: string;
  /** Marks the label with a required asterisk. */
  required?: boolean;
  error?: string;
  hint?: string;
  /** Render prop receives the generated id + aria props to spread on the control. */
  children: (control: {
    id: string;
    'aria-describedby'?: string;
    invalid: boolean;
  }) => ReactNode;
}

/** Label + control + error/hint with wired ids, so forms stop hand-rolling this. */
export default function Field({ label, required, error, hint, children }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children({ id, 'aria-describedby': describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-text-4">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
