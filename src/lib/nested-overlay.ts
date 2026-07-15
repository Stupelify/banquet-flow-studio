/**
 * Marker for app overlays portaled to `document.body` from inside a form
 * modal. Prefer this when a consumer still uses Radix Dialog overlays so
 * outside-dismiss handlers can ignore nested portals.
 *
 * Also set `pointerEvents: 'auto'` on the portal root when a modal Dialog
 * sets `pointer-events: none` on `body`.
 */
export const BIKA_NESTED_OVERLAY_ATTR = 'data-bika-nested-overlay';

export function isBikaNestedOverlayTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as { closest?: unknown }).closest !== 'function') {
    return false;
  }
  return Boolean((target as Element).closest(`[${BIKA_NESTED_OVERLAY_ATTR}]`));
}
