import { CACHE_TTL_MS, LiensSchema, type Liens } from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'lexisLiens';
const LIENHOLDERS = [
  'Toyota Financial Services',
  'Ford Motor Credit',
  'TD Auto Finance',
  'Royal Bank of Canada',
  'CIBC Auto Loans',
];

function mock(input: ProviderInput): Liens {
  const rng = rngFor(input, NAME);
  const hasLiens = rng.chance(0.22);
  const count = hasLiens ? rng.int(1, 2) : 0;
  const records = Array.from({ length: count }, () => ({
    lienholder: rng.pick(LIENHOLDERS),
    filedAt: fmtDate(daysAgo(rng, 30, 1500)),
    amount: rng.chance(0.7) ? rng.int(4_000, 35_000) : null,
  }));
  return { hasLiens, records };
}

export const lexisLiensProvider: Provider<Liens> = {
  name: NAME,
  category: 'liens',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.LEXIS_LIENS_LIVE === '1' ? 'live' : 'mock',
  schema: LiensSchema,
  mock,
};
