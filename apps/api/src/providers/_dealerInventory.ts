import {
  CACHE_TTL_MS,
  DealerInventorySchema,
  type DealerInventory,
} from '@block/shared';

import { baseValue, fmtDate, REFERENCE_EPOCH_MS } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

export function makeDealerInventoryProvider(opts: {
  name: string;
  envFlag: string;
  dealerNamePrefix: string;
}): Provider<DealerInventory> {
  function mock(input: ProviderInput): DealerInventory {
    const rng = rngFor(input, opts.name);
    const base = baseValue(input.vin, input.year ?? 2020);
    const dealerCode = `${opts.name.toUpperCase().slice(0, 3)}${rng.int(1000, 9999)}`;
    return {
      dealerName: `${opts.dealerNamePrefix} #${rng.int(1, 99)}`,
      dealerCode,
      inventoryCount: rng.int(20, 220),
      avgListPrice: Math.round((base * (1 + rng.range(-0.05, 0.08))) / 100) * 100,
      lvi: {
        lastSyncedAt: fmtDate(new Date(REFERENCE_EPOCH_MS - rng.int(0, 30) * 60_000)),
        photos: rng.int(8, 36),
      },
    };
  }
  return {
    name: opts.name,
    category: 'dealer',
    ttlMs: CACHE_TTL_MS.default,
    timeoutMs: 400,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: DealerInventorySchema,
    mock,
  };
}
