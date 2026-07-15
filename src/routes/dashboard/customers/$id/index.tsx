import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/customers/[id]/client';

export const Route = createFileRoute('/dashboard/customers/$id/')({
  component: Page,
});
