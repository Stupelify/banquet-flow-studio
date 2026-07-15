
import { useCallback, useEffect, useRef } from 'react';

type Props = Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'rows' | 'onChange'
> & {
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

export function AutoResizeTextarea({
  value,
  onChange,
  className = '',
  readOnly,
  disabled,
  ...props
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={ref}
      rows={1}
      className={`resize-none overflow-hidden ${className}`}
      value={value}
      readOnly={readOnly}
      disabled={disabled}
      onChange={(e) => {
        onChange?.(e);
        adjustHeight();
      }}
      {...props}
    />
  );
}
