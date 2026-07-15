import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/enquiries/page';

export const Route = createFileRoute('/dashboard/enquiries')({
  component: Page,
});
