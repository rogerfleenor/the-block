import { CACHE_TTL_MS, SafetyRecallsSchema, type SafetyRecalls } from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'nhtsaRecalls';

const COMPONENTS = [
  'AIR BAGS',
  'FUEL SYSTEM, GASOLINE',
  'POWER TRAIN',
  'STEERING',
  'BRAKES',
  'ELECTRICAL SYSTEM',
  'SEAT BELTS',
];
const SUMMARIES = [
  'Driver airbag inflator may rupture upon deployment.',
  'Fuel pump may fail intermittently causing engine stall.',
  'Side curtain airbag may not deploy as designed.',
  'Brake light switch may be defective.',
  'Steering shaft may corrode under high-mileage conditions.',
];
const REMEDIES = [
  'Dealer will replace inflator free of charge.',
  'Dealer will replace fuel pump free of charge.',
  'Dealer will reprogram airbag control module.',
  'Dealer will inspect and replace as needed.',
];

function mock(input: ProviderInput): SafetyRecalls {
  const rng = rngFor(input, NAME);
  const count = rng.chance(0.4) ? rng.int(1, 2) : 0;
  const openRecalls = Array.from({ length: count }, () => ({
    campaignNumber: `${rng.int(20, 25)}V${rng.int(100, 999)}000`,
    reportReceivedDate: fmtDate(daysAgo(rng, 30, 900)),
    component: rng.pick(COMPONENTS),
    summary: rng.pick(SUMMARIES),
    remedy: rng.pick(REMEDIES),
  })).slice(0, count || 1).slice(0, count);
  return { vin: input.vin, openRecalls };
}

export const nhtsaRecallsProvider: Provider<SafetyRecalls> = {
  name: NAME,
  category: 'safety',
  ttlMs: CACHE_TTL_MS.recalls,
  timeoutMs: 400,
  mode: process.env.NHTSA_RECALLS_LIVE === '1' ? 'live' : 'mock',
  schema: SafetyRecallsSchema,
  mock,
};
