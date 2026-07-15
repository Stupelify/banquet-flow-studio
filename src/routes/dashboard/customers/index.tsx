import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/customers/page';

export const Route = createFileRoute('/dashboard/customers/')({
  component: Page,
});
