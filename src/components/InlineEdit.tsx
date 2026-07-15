
import { useEffect, useRef, useState } from 'react';

interface InlineEditProps {
  value: string | number;
  onCommit: (value: string) => void;
  type?: 'text' | 'number';
  prefix?: string;
  format?: (v: string | number) => string;
  width?: number | string;
  disabled?: boolean;
}

export default function InlineEdit({
  value,
  onCommit,
  type = 'text',
  prefix,
  format,
  width,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== String(value)) onCommit(draft);
  };

  const display = format ? format(value) : `${prefix ?? ''}${value}`;

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="iedit-input"
        type={type}
        value={draft}
        style={{ width: width ?? 80 }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') { setDraft(String(value)); setEditing(false); }
        }}
        aria-label="Edit value"
      />
    );
  }

  return (
    <span
      className="iedit-trigger"
      role="button"
      tabIndex={disabled ? undefined : 0}
      aria-label={`Edit: ${display}`}
      onClick={() => { if (!disabled) setEditing(true); }}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) setEditing(true); }}
    >
      {display}
    </span>
  );
}
