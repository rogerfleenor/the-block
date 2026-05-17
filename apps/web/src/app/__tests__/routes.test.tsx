import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AppLayout } from '@/app/layout';
import { NotFound } from '@/app/NotFound';
import { InventoryPage } from '@/features/inventory/InventoryPage';
import { VehiclePage } from '@/features/vehicle/VehiclePage';
import { allVehicles } from '@/mocks/fixtures';

function makeRouter(initialPath: string) {
  return createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <InventoryPage /> },
          { path: '/v/:id', element: <VehiclePage /> },
          { path: '*', element: <NotFound /> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  );
}

function renderRoute(path: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={makeRouter(path)} />
    </QueryClientProvider>,
  );
}

describe('routes smoke', () => {
  it('renders inventory without crashing', async () => {
    renderRoute('/');
    expect(await screen.findByPlaceholderText(/Search year/i)).toBeInTheDocument();
  });

  it('renders vehicle detail using the first fixture id', async () => {
    const v = allVehicles()[0]!;
    renderRoute(`/v/${v.id}`);
    expect(await screen.findByText(/Back to inventory/i)).toBeInTheDocument();
  });

  it('renders 404 for unknown route', () => {
    renderRoute('/this-does-not-exist');
    expect(screen.getByText(/404/)).toBeInTheDocument();
  });
});
