import { CACHE_TTL_MS, RepoHistorySchema, type RepoHistory } from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'rdnRepo';
const AGENCIES = ['Allied Recovery', 'Renovo Recovery', 'Rapid Recovery Services'];
const REASONS = [
  'Loan default — bank ordered repossession',
  'Court order',
  'Voluntary surrender',
];

function mock(input: ProviderInput): RepoHistory {
  const rng = rngFor(input, NAME);
  const count = rng.chance(0.12) ? rng.int(1, 2) : 0;
  const events = Array.from({ length: count }, () => ({
    date: fmtDate(daysAgo(rng, 60, 1500)),
    agency: rng.pick(AGENCIES),
    reason: rng.pick(REASONS),
  }));
  return { events };
}

export const rdnRepoProvider: Provider<RepoHistory> = {
  name: NAME,
  category: 'liens',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.RDN_REPO_LIVE === '1' ? 'live' : 'mock',
  schema: RepoHistorySchema,
  mock,
};
