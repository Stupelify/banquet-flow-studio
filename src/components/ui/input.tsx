
import { forwardRef, type InputHTMLAttributes } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Renders the error border + aria-invalid. Message itself lives in <Field>. */
  invalid?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid = false, className, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      className={`input${invalid ? ' !border-red-400' : ''}${className ? ` ${className}` : ''}`}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
});

export default Input;
