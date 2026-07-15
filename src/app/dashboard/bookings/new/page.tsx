import { useEffect } from 'react';
import { useRouter, useSearchParams } from '@/lib/router-compat';
import { buildBookingCreateHref } from '@/lib/dashboardNavigation';

/**
 * Compatibility shim: redesign briefly used a full-page new booking route.
 * Master parity opens create in the bookings modal via ?section=new.
 */
function NewBookingRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    router.replace(
      buildBookingCreateHref({
        date: searchParams.get('date') ?? undefined,
        hallId: searchParams.get('hallId') ?? searchParams.get('hall') ?? undefined,
        slot: searchParams.get('slot') ?? undefined,
      })
    );
  }, [router, searchParams]);

  return (
    <div className="page-content">
      <div className="skeleton" style={{ height: 360, borderRadius: 12 }} aria-busy="true" />
    </div>
  );
}

export default function NewBookingPage() {
  return <NewBookingRedirect />;
}
