import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/halls/page';

export const Route = createFileRoute('/dashboard/halls')({
  component: Page,
});
