import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../test/setup.js';

import { GuardrailError, isAllowedTool, runGuardedTool } from './guardrails.js';

describe('agent guardrails', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('isAllowedTool accepts allowlisted names only', () => {
    expect(isAllowedTool('placeBid')).toBe(true);
    expect(isAllowedTool('recommendMaxBid')).toBe(true);
    expect(isAllowedTool('rmRf')).toBe(false);
    expect(isAllowedTool('')).toBe(false);
  });

  it('rejects unknown tools with TOOL_NOT_ALLOWED', async () => {
    await expect(
      runGuardedTool({ traceId: 't1', name: 'evilTool', context: {}, input: {} }),
    ).rejects.toMatchObject({ code: 'TOOL_NOT_ALLOWED' });
  });

  it('rejects malformed input with INVALID_INPUT', async () => {
    await expect(
      runGuardedTool({
        traceId: 't1',
        name: 'placeBid',
        context: {},
        input: { vehicleId: 1234, amount: 'not-a-number' },
      }),
    ).rejects.toBeInstanceOf(GuardrailError);
  });

  it('rejects negative bid amounts', async () => {
    const v = pickVehicle(0);
    await expect(
      runGuardedTool({
        traceId: 't1',
        name: 'placeBid',
        context: {},
        input: { vehicleId: v.id, amount: -1 },
      }),
    ).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  });

  it('runs a valid placeBid and returns a suggestion (does not execute)', async () => {
    const v = pickVehicle(0);
    const { output } = await runGuardedTool({
      traceId: 't1',
      name: 'placeBid',
      context: { vehicleId: v.id },
      input: { vehicleId: v.id, amount: 50_000 },
    });
    const out = output as { suggestion: { kind: string; amount: number } };
    expect(out.suggestion.kind).toBe('placeBid');
    expect(out.suggestion.amount).toBe(50_000);
  });
});
