import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/bookings/new/page';

export const Route = createFileRoute('/dashboard/bookings/new')({
  component: Page,
});
