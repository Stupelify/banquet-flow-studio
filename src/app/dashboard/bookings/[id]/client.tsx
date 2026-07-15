import { useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from '@/lib/router-compat';
import { buildBookingEditorHref } from '@/lib/dashboardNavigation';

/**
 * Compatibility shim: redesign briefly used a full-page booking document route.
 * Master parity opens edit in the bookings modal via ?section=edit&id=.
 */
function BookingDetailRedirect() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!id) return;
    const tab = searchParams.get('tab') === 'payments' ? 'payments' : undefined;
    router.replace(buildBookingEditorHref(id, tab));
  }, [id, router, searchParams]);

  return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 360, borderRadius: 12 }} aria-busy="true" />
    </div>
  );
}

export default function BookingDetailPage() {
  return <BookingDetailRedirect />;
}
