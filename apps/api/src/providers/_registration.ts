import {
  CACHE_TTL_MS,
  RegistrationSchema,
  type Registration,
} from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const PROVINCES = ['Ontario', 'Alberta', 'British Columbia', 'Quebec', 'Manitoba', 'Nova Scotia'];

export function makeRegistrationProvider(opts: {
  name: string;
  envFlag: string;
}): Provider<Registration> {
  function mock(input: ProviderInput): Registration {
    const rng = rngFor(input, opts.name);
    return {
      province: rng.pick(PROVINCES),
      status: rng.pick(['active', 'active', 'lapsed', 'plates surrendered']),
      registeredOwners: rng.int(1, 4),
      lastRegisteredAt: fmtDate(daysAgo(rng, 30, 1000)),
    };
  }
  return {
    name: opts.name,
    category: 'registration',
    ttlMs: CACHE_TTL_MS.default,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: RegistrationSchema,
    mock,
  };
}
