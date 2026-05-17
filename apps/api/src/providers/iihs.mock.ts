import { CACHE_TTL_MS, SafetyIihsSchema, type SafetyIihs } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'iihs';
const RATING_KEYS = [
  'moderateOverlapFront',
  'smallOverlapFront',
  'sideImpact',
  'roofStrength',
  'headRestraintsSeats',
  'headlights',
] as const;
const RATING_VALUES = ['Good', 'Good', 'Good', 'Acceptable', 'Marginal', 'Poor'] as const;

function mock(input: ProviderInput): SafetyIihs {
  const rng = rngFor(input, NAME);
  const ratings: Record<string, (typeof RATING_VALUES)[number]> = {};
  for (const key of RATING_KEYS) {
    ratings[key] = rng.pick(RATING_VALUES);
  }
  const goodCount = Object.values(ratings).filter((r) => r === 'Good').length;
  return {
    year: input.year ?? 2020,
    make: input.make ?? 'Unknown',
    model: input.model ?? 'Unknown',
    ratings,
    topSafetyPick: goodCount >= 5,
  };
}

export const iihsProvider: Provider<SafetyIihs> = {
  name: NAME,
  category: 'safety',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.IIHS_LIVE === '1' ? 'live' : 'mock',
  schema: SafetyIihsSchema,
  mock,
};
