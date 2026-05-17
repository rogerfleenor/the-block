import { CACHE_TTL_MS, FuelEconomySchema, type FuelEconomy } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

export function makeFuelEconomyProvider(opts: {
  name: string;
  envFlag: string;
}): Provider<FuelEconomy> {
  function mock(input: ProviderInput): FuelEconomy {
    const rng = rngFor(input, opts.name);
    const cityMpg = Math.round(rng.range(16, 36) * 10) / 10;
    const highwayMpg = Math.round((cityMpg + rng.range(3, 12)) * 10) / 10;
    const combinedMpg = Math.round(((cityMpg + highwayMpg) / 2) * 10) / 10;
    return {
      cityMpg,
      highwayMpg,
      combinedMpg,
      annualFuelCostUsd: rng.int(1_200, 3_400),
      ghgScore: rng.int(4, 10),
    };
  }
  return {
    name: opts.name,
    category: 'fuel',
    ttlMs: CACHE_TTL_MS.default,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: FuelEconomySchema,
    mock,
  };
}
