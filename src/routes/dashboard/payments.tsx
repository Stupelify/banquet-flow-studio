import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/payments/page';

export const Route = createFileRoute('/dashboard/payments')({
  component: Page,
});
