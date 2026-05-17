import { beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { bootForTests, pickVehicle } from '../test/setup.js';

import { aggregateIntel, runProvider } from './intelAggregator.js';

import type { Provider } from '../providers/types.js';

describe('intelAggregator', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('fans out across providers and returns one result per provider', async () => {
    const v = pickVehicle(0);
    const intel = await aggregateIntel({
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: {
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        bodyStyle: v.body_style,
      },
    });
    expect(intel.vehicleId).toBe(v.id);
    expect(intel.results.length).toBeGreaterThanOrEqual(30);
    const okCount = intel.results.filter((r) => r.status === 'ok').length;
    expect(okCount).toBeGreaterThan(intel.results.length * 0.7);
  });

  it('serves the second call from cache', async () => {
    const v = pickVehicle(1);
    const first = await aggregateIntel({
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: { year: v.year, make: v.make, model: v.model, trim: v.trim, bodyStyle: v.body_style },
    });
    expect(first.warmedFromCache).toBe(false);
    const second = await aggregateIntel({
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: { year: v.year, make: v.make, model: v.model, trim: v.trim, bodyStyle: v.body_style },
    });
    expect(second.warmedFromCache).toBe(true);
  });

  it('survives a single provider rejecting', async () => {
    const v = pickVehicle(2);
    const failing: Provider<unknown> = {
      name: 'flaky',
      category: 'specs',
      mode: 'mock',
      ttlMs: 1_000,
      timeoutMs: 100,
      schema: z.any(),
      mock: () => {
        throw new Error('boom');
      },
    };
    const result = await runProvider({
      provider: failing,
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: { year: v.year, make: v.make, model: v.model, trim: v.trim, bodyStyle: v.body_style },
    });
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error.code).toMatch(/EXCEPTION|TIMEOUT|PROVIDER_FAILURE/);
    }
  });

  it('respects category filtering', async () => {
    const v = pickVehicle(3);
    const intel = await aggregateIntel({
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: { year: v.year, make: v.make, model: v.model, trim: v.trim, bodyStyle: v.body_style },
      categories: ['valuation'],
    });
    for (const r of intel.results) {
      expect(r.category).toBe('valuation');
    }
  });
});
