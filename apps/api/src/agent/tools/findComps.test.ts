import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { findCompsTool } from './findComps.js';

describe('findComps tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('caps limit at 10', () => {
    expect(findCompsTool.inputSchema.safeParse({ vehicleId: 'x', limit: 50 }).success).toBe(false);
  });

  it('returns comps, median, days-on-market', async () => {
    const v = pickVehicle(0);
    const out = await findCompsTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id, limit: 3 },
    });
    const parsed = findCompsTool.outputSchema.parse(out.output) as {
      comps: unknown[];
      medianPrice: number;
      avgDaysOnMarket: number;
    };
    expect(parsed.comps.length).toBeLessThanOrEqual(3);
    expect(parsed.medianPrice).toBeGreaterThan(0);
    expect(parsed.avgDaysOnMarket).toBeGreaterThan(0);
  });
});
