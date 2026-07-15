import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/menu/page';

export const Route = createFileRoute('/dashboard/menu/')({
  component: Page,
});
