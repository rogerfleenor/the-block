import { CACHE_TTL_MS, ValuationKbbSchema, type ValuationKbb } from '@block/shared';

import { baseValue, priceBand } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'kbb';

function mock(input: ProviderInput): ValuationKbb {
  const rng = rngFor(input, NAME);
  const base = baseValue(input.vin, input.year ?? 2020);
  const tradeIn = priceBand(base * (0.78 + rng.range(-0.02, 0.02)));
  const privateParty = priceBand(base * (0.88 + rng.range(-0.02, 0.02)));
  const retail = priceBand(base * (1.04 + rng.range(-0.03, 0.04)));
  return {
    vin: input.vin,
    tradeIn,
    privateParty,
    retail,
    asOf: new Date().toISOString(),
  };
}

export const kbbProvider: Provider<ValuationKbb> = {
  name: NAME,
  category: 'valuation',
  ttlMs: CACHE_TTL_MS.valuation,
  timeoutMs: 400,
  mode: process.env.KBB_LIVE === '1' ? 'live' : 'mock',
  schema: ValuationKbbSchema,
  mock,
};
