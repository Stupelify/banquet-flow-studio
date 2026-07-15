import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/customers/create/page';

export const Route = createFileRoute('/dashboard/customers/create')({
  component: Page,
});
