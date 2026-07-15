
import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="card-padded max-w-md text-center">
        <h1 className="page-title">Something went wrong</h1>
        <p className="page-subtitle mt-2">
          An unexpected error occurred. Please try again.
        </p>
        <p className="text-xs text-[var(--text-4)] mt-2">{error?.message}</p>
        <div className="form-actions mt-6">
          <Button type="button" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
