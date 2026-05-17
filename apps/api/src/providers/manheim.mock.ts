import { CACHE_TTL_MS, ValuationManheimSchema, type ValuationManheim } from '@block/shared';

import { baseValue } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'manheim';

const REGIONS = ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West Coast', 'Canada-East'];

function mock(input: ProviderInput): ValuationManheim {
  const rng = rngFor(input, NAME);
  const base = baseValue(input.vin, input.year ?? 2020);
  const mmrValue = Math.round((base * (0.93 + rng.range(-0.02, 0.02))) / 50) * 50;
  const adjustedWholesale = Math.round((mmrValue * (1 + rng.range(-0.04, 0.04))) / 50) * 50;
  const averageGrade = Math.round((rng.range(2.4, 4.7) + Number.EPSILON) * 10) / 10;
  const isEv = (input.make ?? '').toLowerCase() === 'tesla' || (input.bodyStyle ?? '').toLowerCase().includes('ev');
  return {
    vin: input.vin,
    mmrValue,
    adjustedWholesale,
    averageGrade,
    averageEVBH: isEv ? Math.round(rng.range(82, 96)) : null,
    region: rng.pick(REGIONS),
    asOf: new Date().toISOString(),
  };
}

export const manheimProvider: Provider<ValuationManheim> = {
  name: NAME,
  category: 'valuation',
  ttlMs: CACHE_TTL_MS.valuation,
  timeoutMs: 400,
  mode: process.env.MANHEIM_LIVE === '1' ? 'live' : 'mock',
  schema: ValuationManheimSchema,
  mock,
};
