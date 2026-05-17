import { CACHE_TTL_MS, PhotoSpinSchema, type PhotoSpin } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'spincar';
const HOTSPOTS = [
  { angle: 0, label: 'Front grille' },
  { angle: 45, label: 'Driver headlight' },
  { angle: 90, label: 'Driver side panel' },
  { angle: 180, label: 'Rear bumper' },
  { angle: 270, label: 'Passenger side panel' },
  { angle: 315, label: 'Passenger headlight' },
];

function mock(input: ProviderInput): PhotoSpin {
  const rng = rngFor(input, NAME);
  const count = rng.int(3, HOTSPOTS.length);
  return {
    spinUrl: `https://example.com/spin/${input.vin}.spin360`,
    hotspots: HOTSPOTS.slice(0, count),
  };
}

export const spincarProvider: Provider<PhotoSpin> = {
  name: NAME,
  category: 'photography',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.SPINCAR_LIVE === '1' ? 'live' : 'mock',
  schema: PhotoSpinSchema,
  mock,
};
