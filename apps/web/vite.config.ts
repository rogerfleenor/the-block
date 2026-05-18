import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE ?? 'http://localhost:4000';
  /** GitHub Pages project site: set `VITE_BASE=/your-repo-name/` when building. */
  const base = env.VITE_BASE?.trim() || '/';
  return {
    base: base.endsWith('/') || base === '/' ? base : `${base}/`,
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, 'src') },
    },
    server: {
      port: Number(env.WEB_PORT ?? 5173),
      proxy: {
        '/api': { target: apiBase, changeOrigin: true },
        '/ws': { target: apiBase.replace(/^http/, 'ws'), ws: true },
      },
    },
    build: {
      target: 'es2022',
      cssCodeSplit: false,
      // No manualChunks: natural code-splitting via React.lazy in
      // app/routes.tsx + IntelTabs already isolates the per-route deps
      // (react-virtual rides inside the InventoryPage chunk). web-vitals
      // is loaded after first paint from main.tsx.
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
