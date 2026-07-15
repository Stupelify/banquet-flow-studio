import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/bookings/[id]/client';

export const Route = createFileRoute('/dashboard/bookings/$id')({
  component: Page,
});
