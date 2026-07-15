import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/settings/page';

export const Route = createFileRoute('/dashboard/settings')({
  component: Page,
});
