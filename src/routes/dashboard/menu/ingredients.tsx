import { createFileRoute } from '@tanstack/react-router';
import Page from '@/app/dashboard/menu/ingredients/page';

export const Route = createFileRoute('/dashboard/menu/ingredients')({
  component: Page,
});
