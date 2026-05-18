import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../test/setup.js';

import { invokeMockAgent, planUtterance } from './router.js';

describe('agent router (mockLLM intent grammar)', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  const cases = [
    { utterance: 'bid 24800', vehicleId: true, expects: ['placeBid'] },
    { utterance: 'BID $30,000', vehicleId: true, expects: ['placeBid'] },
    {
      utterance: 'is this overpriced?',
      vehicleId: true,
      expects: ['recommendMaxBid', 'explainPrice'],
    },
    { utterance: 'good deal?', vehicleId: true, expects: ['recommendMaxBid', 'explainPrice'] },
    { utterance: 'any recalls?', vehicleId: true, expects: ['flagRisks'] },
    { utterance: 'title issues?', vehicleId: true, expects: ['flagRisks'] },
    { utterance: 'show me comps', vehicleId: true, expects: ['findComps'] },
    {
      utterance: 'show low-mileage AWD trucks under 25k in ontario',
      vehicleId: false,
      expects: ['searchInventory', 'setFilters'],
    },
    {
      utterance: 'find sedans over 10k',
      vehicleId: false,
      expects: ['searchInventory', 'setFilters'],
    },
    {
      utterance: 'vin EZ73RMG76X31G4JN4',
      vehicleId: false,
      expects: ['searchInventory', 'setFilters'],
    },
    {
      utterance: 'EZ73RMG76X31G4JN4',
      vehicleId: false,
      expects: ['searchInventory', 'setFilters'],
    },
    { utterance: 'EZ73RMG76X31G4JN4', vehicleId: true, expects: ['searchInventory', 'setFilters'] },
    { utterance: 'tell me about it', vehicleId: true, expects: ['getIntel'] },
    { utterance: 'hello there', vehicleId: false, expects: [] },
  ];

  for (const c of cases) {
    it(`plans "${c.utterance}" → [${c.expects.join(', ')}]`, () => {
      const v = pickVehicle(0);
      const plan = planUtterance({
        utterance: c.utterance,
        context: c.vehicleId ? { vehicleId: v.id } : {},
      });
      const tools = plan.plan.map((p) => p.tool);
      expect(tools).toEqual(c.expects);
    });
  }

  it('invokeMockAgent runs the plan and returns a stable response shape', async () => {
    const v = pickVehicle(0);
    const out = await invokeMockAgent({
      utterance: 'bid 30000',
      context: { vehicleId: v.id },
    });
    expect(out.traceId).toMatch(/^trace_/);
    expect(out.toolCalls.length).toBeGreaterThan(0);
    expect(out.suggestions[0]?.kind).toBe('placeBid');
    expect(out.suggestions[0]?.amount).toBe(30_000);
  });

  it('runs price-explainer end-to-end and yields fact chips', async () => {
    const v = pickVehicle(1);
    const out = await invokeMockAgent({
      utterance: 'is this overpriced?',
      context: { vehicleId: v.id },
    });
    expect(out.toolCalls.find((t) => t.name === 'recommendMaxBid')).toBeDefined();
    expect(out.facts.length).toBeGreaterThan(0);
  });
});
