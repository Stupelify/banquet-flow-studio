import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/profile/page';

export const Route = createFileRoute('/dashboard/profile')({
  component: Page,
});
