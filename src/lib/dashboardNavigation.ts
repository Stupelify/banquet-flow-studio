export function buildBookingEditorHref(id: string, tab?: 'payments' | 'details'): string {
  const params = new URLSearchParams({
    section: 'edit',
    id,
  });
  if (tab === 'payments') params.set('tab', 'payments');
  return `/dashboard/bookings?${params.toString()}`;
}

export function buildBookingCreateHref(prefill?: {
  date?: string;
  hallId?: string;
  slot?: string;
}): string {
  const params = new URLSearchParams({ section: 'new' });
  if (prefill?.date) params.set('date', prefill.date);
  if (prefill?.hallId) params.set('hall', prefill.hallId);
  if (prefill?.slot) params.set('slot', prefill.slot);
  return `/dashboard/bookings?${params.toString()}`;
}

export function buildEnquiryEditorHref(id: string): string {
  return `/dashboard/enquiries?section=edit&id=${encodeURIComponent(id)}`;
}

export function buildSseEventStreamUrl(baseUrl: string, sseToken?: string): string {
  const normalizedBase = baseUrl.replace(/\/$/, '');
  if (sseToken) {
    return `${normalizedBase}/events?sse_token=${encodeURIComponent(sseToken)}`;
  }
  return `${normalizedBase}/events`;
}
