import {
  CACHE_TTL_MS,
  MarketCompsSchema,
  type MarketComps,
} from '@block/shared';

import { baseValue, daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const LOCATIONS = [
  'Toronto, ON',
  'Calgary, AB',
  'Vancouver, BC',
  'Detroit, MI',
  'Atlanta, GA',
  'Dallas, TX',
];

export function makeMarketCompsProvider(opts: {
  name: string;
  envFlag: string;
  sourceLabel: string;
  priceBias?: number;
}): Provider<MarketComps> {
  function mock(input: ProviderInput): MarketComps {
    const rng = rngFor(input, opts.name);
    const base = baseValue(input.vin, input.year ?? 2020);
    const center = base * (opts.priceBias ?? 1);
    const count = rng.int(3, 6);
    const comps = Array.from({ length: count }, (_, i) => {
      const price = Math.round((center * (0.92 + rng.range(0, 0.18))) / 50) * 50;
      return {
        source: opts.sourceLabel,
        vin: i === 0 ? input.vin : null,
        year: (input.year ?? 2020) + rng.int(-1, 1),
        make: input.make ?? 'Unknown',
        model: input.model ?? 'Unknown',
        trim: input.trim ?? null,
        odometerKm: rng.int(10_000, 220_000),
        price,
        soldAt: fmtDate(daysAgo(rng, 7, 180)),
        location: rng.pick(LOCATIONS),
      };
    });
    const median = [...comps].map((c) => c.price).sort((a, b) => a - b)[Math.floor(count / 2)];
    return {
      comps,
      medianPrice: median ?? center,
      avgDaysOnMarket: rng.int(14, 60),
    };
  }
  return {
    name: opts.name,
    category: 'market',
    ttlMs: CACHE_TTL_MS.valuation,
    timeoutMs: 500,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: MarketCompsSchema,
    mock,
  };
}
