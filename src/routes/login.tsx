import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/login/page';

export const Route = createFileRoute('/login')({
  component: Page,
});
