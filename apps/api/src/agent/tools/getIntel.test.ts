import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { getIntelTool } from './getIntel.js';

describe('getIntel tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('input requires vehicleId', () => {
    expect(getIntelTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it('returns VehicleIntel with results when scoped to a category', async () => {
    const v = pickVehicle(0);
    const out = await getIntelTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id, categories: ['valuation'] },
    });
    const parsed = getIntelTool.outputSchema.parse(out.output) as { results: { category: string }[] };
    expect(parsed.results.every((r) => r.category === 'valuation')).toBe(true);
  });
});
