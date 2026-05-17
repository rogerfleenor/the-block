import { CACHE_TTL_MS, TitleBrandsSchema, type TitleBrands } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const BRANDS = ['Clean', 'Salvage', 'Rebuilt', 'Flood', 'Lemon', 'Hail', 'Police use'];

export function makeTitleBrandsProvider(opts: {
  name: string;
  envFlag: string;
  sourceLabel: string;
  brandChance?: number;
}): Provider<TitleBrands> {
  function mock(input: ProviderInput): TitleBrands {
    const rng = rngFor(input, opts.name);
    const chance = opts.brandChance ?? 0.18;
    const brands = rng.chance(chance) ? [rng.pick(BRANDS)] : [];
    return { vin: input.vin, brands, source: opts.sourceLabel };
  }
  return {
    name: opts.name,
    category: 'history',
    ttlMs: CACHE_TTL_MS.history,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: TitleBrandsSchema,
    mock,
  };
}
