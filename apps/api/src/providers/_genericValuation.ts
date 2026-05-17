import { CACHE_TTL_MS, ValuationGenericSchema, type ValuationGeneric } from '@block/shared';

import { baseValue } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

interface GenericValuationOpts {
  name: string;
  envFlag: string;
  wholesaleMultiplier: number;
  retailMultiplier: number;
}

export function makeGenericValuationProvider(
  opts: GenericValuationOpts,
): Provider<ValuationGeneric> {
  function mock(input: ProviderInput): ValuationGeneric {
    const rng = rngFor(input, opts.name);
    const base = baseValue(input.vin, input.year ?? 2020);
    const wholesale = Math.round((base * opts.wholesaleMultiplier * (1 + rng.range(-0.04, 0.04))) / 50) * 50;
    const retail = Math.round((base * opts.retailMultiplier * (1 + rng.range(-0.04, 0.04))) / 50) * 50;
    return {
      vin: input.vin,
      wholesale,
      retail,
      asOf: new Date().toISOString(),
    };
  }

  return {
    name: opts.name,
    category: 'valuation',
    ttlMs: CACHE_TTL_MS.valuation,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: ValuationGenericSchema,
    mock,
  };
}
