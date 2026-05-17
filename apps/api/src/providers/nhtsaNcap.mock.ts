import { CACHE_TTL_MS, SafetyNcapSchema, type SafetyNcap } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'nhtsaNcap';

function star(rng: ReturnType<typeof rngFor>, low = 3, high = 5): number {
  return rng.int(low, high);
}

function mock(input: ProviderInput): SafetyNcap {
  const rng = rngFor(input, NAME);
  return {
    year: input.year ?? 2020,
    make: input.make ?? 'Unknown',
    model: input.model ?? 'Unknown',
    overallRating: star(rng),
    frontalRating: star(rng),
    sideRating: star(rng),
    rolloverRating: star(rng, 3, 4),
  };
}

export const nhtsaNcapProvider: Provider<SafetyNcap> = {
  name: NAME,
  category: 'safety',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.NHTSA_NCAP_LIVE === '1' ? 'live' : 'mock',
  schema: SafetyNcapSchema,
  mock,
};
