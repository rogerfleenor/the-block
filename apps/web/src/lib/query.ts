import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

export const queryKeys = {
  vehicles: (q: Record<string, unknown>) => ['vehicles', q] as const,
  vehicle: (id: string) => ['vehicle', id] as const,
  bids: (id: string) => ['bids', id] as const,
  intel: (id: string) => ['intel', id] as const,
  agentFacts: (id: string) => ['agentFacts', id] as const,
};
