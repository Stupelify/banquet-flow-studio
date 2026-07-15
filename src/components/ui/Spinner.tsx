
import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 16, label }: { size?: number; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-text-3" role="status">
      <Loader2 size={size} className="animate-spin" aria-hidden="true" />
      {label && <span className="text-sm">{label}</span>}
      {!label && <span className="sr-only">Loading</span>}
    </span>
  );
}
