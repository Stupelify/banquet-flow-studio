import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/logs/page';

export const Route = createFileRoute('/dashboard/logs')({
  component: Page,
});
