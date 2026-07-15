import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface AdaptiveButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  expand?: 'block' | 'full';
  fill?: 'clear' | 'outline' | 'solid';
}

/** Thin alias — prefer `@/components/ui` Button in new code. */
export function AdaptiveButton({
  children,
  className = '',
  variant = 'primary',
  expand,
  fill,
  ...props
}: AdaptiveButtonProps) {
  void expand;
  void fill;

  return (
    <Button variant={variant} className={className} {...props}>
      {children}
    </Button>
  );
}
