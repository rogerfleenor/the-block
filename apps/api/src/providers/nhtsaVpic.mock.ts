import { CACHE_TTL_MS, SpecsVpicSchema, type SpecsVpic } from '@block/shared';

import { rngFor, type Provider, type ProviderInput } from './types.js';

const NAME = 'nhtsaVpic';
const PLANT_COUNTRIES = ['United States', 'Canada', 'Mexico', 'Japan', 'Germany'];
const PLANT_CITIES = ['Detroit', 'Oshawa', 'Hermosillo', 'Toyota City', 'Stuttgart'];

function mock(input: ProviderInput): SpecsVpic {
  const rng = rngFor(input, NAME);
  return {
    vin: input.vin,
    make: input.make ?? 'Unknown',
    model: input.model ?? 'Unknown',
    modelYear: input.year ?? 2020,
    bodyClass: input.bodyStyle ?? 'Passenger Car',
    vehicleType: 'PASSENGER CAR',
    engineCylinders: rng.pick([3, 4, 6, 8]),
    displacementL: Math.round(rng.range(1.4, 6.2) * 10) / 10,
    fuelType: 'Gasoline',
    driveType: rng.pick(['FWD', 'RWD', 'AWD', '4WD']),
    plant: {
      country: rng.pick(PLANT_COUNTRIES),
      city: rng.pick(PLANT_CITIES),
    },
  };
}

export const nhtsaVpicProvider: Provider<SpecsVpic> = {
  name: NAME,
  category: 'specs',
  ttlMs: CACHE_TTL_MS.default,
  timeoutMs: 400,
  mode: process.env.NHTSA_VPIC_LIVE === '1' ? 'live' : 'mock',
  schema: SpecsVpicSchema,
  mock,
};
