
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createAppQueryClient } from '@/lib/query/client';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createAppQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
