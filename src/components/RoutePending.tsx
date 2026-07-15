/**
 * Lightweight placeholder while a lazy route chunk loads.
 * Renders inside the dashboard outlet — shell/nav stay mounted.
 */
export function RoutePending() {
  return (
    <div className="route-pending" aria-busy="true" aria-live="polite">
      <div className="skeleton route-pending-line" />
      <div className="skeleton route-pending-block" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
