import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { explainPriceTool } from './explainPrice.js';

describe('explainPrice tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('input requires vehicleId', () => {
    expect(explainPriceTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it('returns a verdict, delta and human text', async () => {
    const v = pickVehicle(0);
    const out = await explainPriceTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id },
    });
    const parsed = explainPriceTool.outputSchema.parse(out.output);
    expect(['underpriced', 'fair', 'overpriced']).toContain(parsed.verdict);
    expect(typeof parsed.delta).toBe('number');
    expect(parsed.text.length).toBeGreaterThan(0);
  });
});
