import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/menu/vendors/page';

export const Route = createFileRoute('/dashboard/menu/vendors')({
  component: Page,
});
