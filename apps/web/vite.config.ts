import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBase = env.VITE_API_BASE ?? 'http://localhost:4000';
  return {
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
      rollupOptions: {
        output: {
          // Keep app & most deps in the main chunk; split out only large,
          // route-isolated deps to keep initial paint lean. react-hook-form
          // is only needed once the user opens a vehicle detail page.
          manualChunks(id) {
            if (id.includes('node_modules/react-hook-form')) return 'forms';
            if (id.includes('node_modules/@hookform')) return 'forms';
            return undefined;
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
