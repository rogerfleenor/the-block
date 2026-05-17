import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

import { api } from './api';

/**
 * In dev, log Core Web Vitals to console.info. In prod, beacon them to
 * POST /api/health/vitals so the perf budget can be measured server-side.
 */
export function reportWebVitals(): void {
  const isProd = import.meta.env.PROD;
  const report = (metric: { name: string; value: number; id: string; navigationType?: string }) => {
    if (isProd) {
      void api.postVital(metric);
    } else {
      console.info('[vitals]', metric.name, Math.round(metric.value), metric);
    }
  };
  try {
    onCLS(report);
    onINP(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  } catch (err) {
    console.warn('[vitals] failed to register', err);
  }
}
