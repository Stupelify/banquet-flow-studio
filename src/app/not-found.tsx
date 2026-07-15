export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center px-6">
      <div className="card-padded max-w-md text-center">
        <h1 className="page-title">Page not found</h1>
        <p className="page-subtitle mt-2">
          The page you are looking for doesnt exist or has moved.
        </p>
        <div className="form-actions mt-6">
          <a className="btn btn-primary" href="/dashboard">
            Back to dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
