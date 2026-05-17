import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { flagRisksTool } from './flagRisks.js';

describe('flagRisks tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('rejects payload without vehicleId', () => {
    expect(flagRisksTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it('returns a list (possibly empty) of risks shaped correctly', async () => {
    const v = pickVehicle(0);
    const result = await flagRisksTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id },
    });
    const parsed = flagRisksTool.outputSchema.parse(result.output);
    expect(Array.isArray(parsed.risks)).toBe(true);
    for (const risk of parsed.risks) {
      expect(['low', 'medium', 'high']).toContain(risk.severity);
    }
  });
});
