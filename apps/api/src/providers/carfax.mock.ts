import { CACHE_TTL_MS, HistoryCarfaxSchema, type HistoryCarfax } from '@block/shared';

import { daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'carfax';

const TITLE_BRANDS = ['clean', 'clean', 'clean', 'clean', 'clean', 'rebuilt', 'salvage'] as const;
const SERVICE_TYPES = [
  'Oil change',
  'Tire rotation',
  'Brake service',
  'State inspection',
  'Transmission fluid',
  'Coolant flush',
  '60k mile service',
];
const SERVICE_VENDORS = [
  'Pep Boys',
  'Firestone',
  'Dealer service',
  'Goodyear',
  'Jiffy Lube',
];

function mock(input: ProviderInput): HistoryCarfax {
  const rng = rngFor(input, NAME);
  const accidents = rng.chance(0.25) ? rng.int(1, 3) : 0;
  const owners = rng.int(1, 4);
  const serviceCount = rng.int(2, 9);
  const serviceRecords = Array.from({ length: serviceCount }, () => {
    const date = daysAgo(rng, 30, 1500);
    return {
      date: fmtDate(date),
      odometerKm: rng.int(5_000, 220_000),
      type: rng.pick(SERVICE_TYPES),
      vendor: rng.pick(SERVICE_VENDORS),
    };
  }).sort((a, b) => a.date.localeCompare(b.date));

  const damageEvents = accidents
    ? Array.from({ length: accidents }, () => ({
        date: fmtDate(daysAgo(rng, 60, 1800)),
        severity: rng.pick(['Minor', 'Moderate', 'Severe']),
        description: rng.pick([
          'Front-end collision',
          'Rear bumper damage',
          'Side panel dent',
          'Hail damage',
        ]),
      }))
    : [];

  return {
    vin: input.vin,
    accidents,
    owners,
    serviceRecords,
    titleBrand: rng.pick(TITLE_BRANDS),
    damageEvents,
    odometerReadings: serviceRecords.map((s) => ({ date: s.date, km: s.odometerKm })),
    buybackGuarantee: rng.chance(0.7),
  };
}

export const carfaxProvider: Provider<HistoryCarfax> = {
  name: NAME,
  category: 'history',
  ttlMs: CACHE_TTL_MS.history,
  timeoutMs: 400,
  mode: process.env.CARFAX_LIVE === '1' ? 'live' : 'mock',
  schema: HistoryCarfaxSchema,
  mock,
};
