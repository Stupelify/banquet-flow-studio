import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/customers/[id]/edit/client';

export const Route = createFileRoute('/dashboard/customers/$id/edit')({
  component: Page,
});
