// Bootstrap is intentionally minimal at scaffold time.
// The Frontend Engineer agent expands this in Phase 1.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('#root not found');

createRoot(root).render(
  <StrictMode>
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">the-block</h1>
      <p className="text-sm text-neutral-500">
        Scaffold ready. The Frontend Engineer agent will build out the SPA in Phase 1.
      </p>
    </main>
  </StrictMode>,
);
