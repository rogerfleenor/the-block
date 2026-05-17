import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { AppRouter } from './app/routes';
import { attachAgentWsListeners } from './features/agent/agentClient';
import { queryClient } from './lib/query';
import { getWsClient } from './lib/ws';

import './styles/index.css';

/**
 * Web-vitals + WS plumbing are NOT on the critical render path. Schedule
 * them on the next idle frame so the initial bundle stays lean and the
 * first paint isn't blocked by a perf-measurement library.
 */
function deferIdle(work: () => void): void {
  const ric =
    typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? (
          window as Window & {
            requestIdleCallback: (cb: IdleRequestCallback, opts?: { timeout: number }) => number;
          }
        ).requestIdleCallback
      : null;
  if (ric) {
    ric(() => work(), { timeout: 2_000 });
  } else {
    setTimeout(work, 0);
  }
}

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

  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AppRouter />
      </QueryClientProvider>
    </StrictMode>,
  );

  // After first paint: open WS, wire agent listeners, register web-vitals.
  deferIdle(() => {
    getWsClient();
    attachAgentWsListeners();
    void import('./lib/vitals').then((m) => m.reportWebVitals());
  });
}

void start();
