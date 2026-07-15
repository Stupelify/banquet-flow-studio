import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/reports/page';

export const Route = createFileRoute('/dashboard/reports')({
  component: Page,
});
