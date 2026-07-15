import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
type ButtonSize = 'md' | 'sm';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  /** Icon rendered before the label. */
  icon?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  danger: 'btn btn-danger',
  ghost: 'btn text-text-3 hover:bg-surface-2 hover:text-text-1',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  md: '',
  sm: 'text-sm',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    loading = false,
    icon,
    disabled,
    className,
    children,
    type,
    ...rest
  },
  ref
) {
  const sizeClass = SIZE_CLASS[size];
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={`${VARIANT_CLASS[variant]}${sizeClass ? ` ${sizeClass}` : ''}${className ? ` ${className}` : ''}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export default Button;
