import { CACHE_TTL_MS, SpecsVpicSchema, type SpecsVpic } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

/**
 * Generic alt-specs builder. The Marti / Monroney / DataOne providers each
 * serve a slightly different real-world need (window-sticker reconstitution,
 * VIN decode etc.) but for the prototype they all surface the SpecsVpic
 * shape so downstream code only learns one schema.
 */
export function makeAltSpecsProvider(opts: {
  name: string;
  envFlag: string;
  driveBias?: 'FWD' | 'RWD' | 'AWD' | '4WD';
}): Provider<SpecsVpic> {
  function mock(input: ProviderInput): SpecsVpic {
    const rng = rngFor(input, opts.name);
    return {
      vin: input.vin,
      make: input.make ?? 'Unknown',
      model: input.model ?? 'Unknown',
      modelYear: input.year ?? 2020,
      bodyClass: input.bodyStyle ?? 'Passenger Car',
      vehicleType: 'PASSENGER CAR',
      engineCylinders: rng.pick([4, 6, 8]),
      displacementL: Math.round(rng.range(1.5, 5.7) * 10) / 10,
      fuelType: 'Gasoline',
      driveType: opts.driveBias ?? rng.pick(['FWD', 'RWD', 'AWD', '4WD']),
      plant: { country: 'United States', city: rng.pick(['Detroit', 'Kansas City', 'Spring Hill']) },
    };
  }
  return {
    name: opts.name,
    category: 'specs',
    ttlMs: CACHE_TTL_MS.default,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: SpecsVpicSchema,
    mock,
  };
}
