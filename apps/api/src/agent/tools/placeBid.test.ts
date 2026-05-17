import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../../test/setup.js';

import { placeBidTool } from './placeBid.js';

describe('placeBid tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('input schema rejects missing amount', () => {
    expect(placeBidTool.inputSchema.safeParse({ vehicleId: 'x' }).success).toBe(false);
  });

  it('input schema accepts valid payload', () => {
    expect(placeBidTool.inputSchema.safeParse({ vehicleId: 'x', amount: 100 }).success).toBe(true);
  });

  it('returns a placeBid suggestion (never executes)', async () => {
    const v = pickVehicle(0);
    const result = await placeBidTool.run({
      traceId: 't',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id, amount: v.starting_bid + 100 },
    });
    const out = placeBidTool.outputSchema.parse(result.output) as {
      suggestion: { vehicleId: string; amount: number; kind: string };
    };
    expect(out.suggestion.kind).toBe('placeBid');
    expect(out.suggestion.amount).toBe(v.starting_bid + 100);
    expect(out.suggestion.vehicleId).toBe(v.id);
    expect(result.suggestions?.length).toBe(1);
  });
});
