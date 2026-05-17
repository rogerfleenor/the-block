import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { recommendMaxBidTool } from './recommendMaxBid.js';

describe('recommendMaxBid tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('rejects invalid riskTolerance', () => {
    expect(recommendMaxBidTool.inputSchema.safeParse({ vehicleId: 'x', riskTolerance: 'extreme' }).success).toBe(
      false,
    );
  });

  it('returns a value, low/high band, rationale and sources', async () => {
    const v = pickVehicle(0);
    const result = await recommendMaxBidTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id, riskTolerance: 'medium' },
    });
    const out = recommendMaxBidTool.outputSchema.parse(result.output);
    expect(out.value).toBeGreaterThan(0);
    expect(out.low).toBeLessThanOrEqual(out.high);
    expect(out.sources.length).toBeGreaterThan(0);
    expect(typeof out.rationale).toBe('string');
  });
});
