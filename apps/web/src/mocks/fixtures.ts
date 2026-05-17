import vehiclesJson from '../../../../data/vehicles.json';

import type { Vehicle } from '@block/shared';

/**
 * The full 200-vehicle dataset. Imported as JSON so the MSW handlers
 * (and the static `build:web-static` bundle) ship with the data.
 *
 * Data normalization: the source `vehicles.json` has `current_bid: null` on
 * lots that have not received any bid yet. The shared Vehicle schema (read-
 * only contract) requires a non-negative number, so we coerce null → 0 here.
 * That matches the bidRules helper semantics: `current_bid <= 0` is treated
 * as "no bids yet, opening bid must be >= starting_bid".
 */
type RawVehicle = Omit<Vehicle, 'current_bid'> & { current_bid: number | null };

export const VEHICLES: Vehicle[] = (vehiclesJson as RawVehicle[]).map((v) => ({
  ...v,
  current_bid: v.current_bid ?? 0,
}));

const byId = new Map<string, Vehicle>();
for (const v of VEHICLES) {
  byId.set(v.id, v);
}

export function getVehicleById(id: string): Vehicle | undefined {
  return byId.get(id);
}

export function allVehicles(): Vehicle[] {
  return VEHICLES;
}
