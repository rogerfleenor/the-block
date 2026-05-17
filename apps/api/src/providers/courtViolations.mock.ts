import { CACHE_TTL_MS, ViolationsSchema, type Violations } from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'courtViolations';
const CODES = ['HTA-128', 'HTA-130', 'HTA-172', 'HTA-200', 'MVA-44'];
const DESCRIPTIONS = [
  'Speeding 20 km/h over limit',
  'Improper lane change',
  'Stunt driving',
  'Failure to obey stop sign',
  'Driving with expired permit',
];

function mock(input: ProviderInput): Violations {
  const rng = rngFor(input, NAME);
  const count = rng.chance(0.35) ? rng.int(1, 4) : 0;
  const records = Array.from({ length: count }, () => ({
    date: fmtDate(daysAgo(rng, 30, 1500)),
    code: rng.pick(CODES),
    description: rng.pick(DESCRIPTIONS),
  }));
  return { count, records };
}

export const courtViolationsProvider: Provider<Violations> = {
  name: NAME,
  category: 'liens',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.COURT_VIOLATIONS_LIVE === '1' ? 'live' : 'mock',
  schema: ViolationsSchema,
  mock,
};
