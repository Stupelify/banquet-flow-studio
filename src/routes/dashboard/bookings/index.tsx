import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/bookings/page';

export const Route = createFileRoute('/dashboard/bookings/')({
  component: Page,
});
