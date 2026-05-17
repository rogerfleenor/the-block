import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';


import { AppLayout } from './layout';
import { NotFound } from './NotFound';

import { Skeleton } from '@/ui/Skeleton';

const InventoryPage = lazy(() =>
  import('@/features/inventory/InventoryPage').then((m) => ({ default: m.InventoryPage })),
);
const VehiclePage = lazy(() =>
  import('@/features/vehicle/VehiclePage').then((m) => ({ default: m.VehiclePage })),
);

function Fallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<Fallback />}>
            <InventoryPage />
          </Suspense>
        ),
      },
      {
        path: '/v/:id',
        element: (
          <Suspense fallback={<Fallback />}>
            <VehiclePage />
          </Suspense>
        ),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
