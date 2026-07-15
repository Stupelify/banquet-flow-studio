import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/calendar/page';

export const Route = createFileRoute('/dashboard/calendar')({
  component: Page,
});
