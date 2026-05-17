import { CACHE_TTL_MS, HistoryAutoCheckSchema, type HistoryAutoCheck } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'autocheck';

const ANNOUNCEMENTS = [
  'Frame damage announced',
  'Odometer rollback announced',
  'Salvage title announced',
  'Flood damage announced',
  'Manufacturer buyback announced',
];

function mock(input: ProviderInput): HistoryAutoCheck {
  const rng = rngFor(input, NAME);
  const score = rng.int(35, 99);
  const accidents = rng.chance(0.25) ? rng.int(1, 3) : 0;
  const announcementCount = rng.chance(0.18) ? rng.int(1, 2) : 0;
  const auctionAnnouncements = Array.from({ length: announcementCount }, () => rng.pick(ANNOUNCEMENTS));
  return { vin: input.vin, score, accidents, auctionAnnouncements };
}

export const autocheckProvider: Provider<HistoryAutoCheck> = {
  name: NAME,
  category: 'history',
  ttlMs: CACHE_TTL_MS.history,
  timeoutMs: 400,
  mode: process.env.AUTOCHECK_LIVE === '1' ? 'live' : 'mock',
  schema: HistoryAutoCheckSchema,
  mock,
};
