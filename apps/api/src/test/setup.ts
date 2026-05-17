/**
 * Shared test bootstrap: load the in-memory vehicle store + bid engine once
 * (skipping bot bidders so tests aren't time-dependent).
 */

import { __resetForTests, initBidEngine } from '../services/bidEngine.js';
import { initVehicleStore, allVehicles } from '../services/vehicleStore.js';

let booted = false;

export async function bootForTests(): Promise<void> {
  if (booted) {
    __resetForTests();
    return;
  }
  await initVehicleStore();
  await initBidEngine({ startBots: false });
  booted = true;
}

export function pickVehicle(idx = 0) {
  return allVehicles()[idx]!;
}
