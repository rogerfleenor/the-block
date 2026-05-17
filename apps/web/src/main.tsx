import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouter } from './app/routes';
import { attachAgentWsListeners } from './features/agent/agentClient';
import { queryClient } from './lib/query';
import { reportWebVitals } from './lib/vitals';
import { getWsClient } from './lib/ws';

import './styles/index.css';

async function start() {
  if (import.meta.env.VITE_USE_MSW === '1') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      serviceWorker: { url: `${import.meta.env.BASE_URL ?? '/'}mockServiceWorker.js` },
    });
  }

  const root = document.getElementById('root');
  if (!root) throw new Error('#root not found');

  // Eagerly open the WS so cross-tab fan-out works even before the user
  // mounts a route that subscribes to a topic.
  getWsClient();
  attachAgentWsListeners();
  reportWebVitals();

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </StrictMode>,
  );
}

void start();
