#!/usr/bin/env node
/**
 * Rewrites only `images` on each vehicle in data/vehicles.json.
 * Prefers `data/vehicleImageCatalog.json` (Wikimedia Commons, keyed by
 * make|model, ordered by closeness to the lot year), then Unsplash fallbacks.
 * Preserves ids, bids, and all other fields.
 *
 *   node scripts/patch-vehicle-images.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildImageUrlsForVehicle } from './lib/carImagePool.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(scriptDir, '../data/vehicles.json');

const raw = readFileSync(dataPath, 'utf-8');
const vehicles = JSON.parse(raw);

let patched = 0;
for (const v of vehicles) {
  const prev = v.images?.length ?? 0;
  const count = Math.max(3, Math.min(6, prev || 4));
  v.images = buildImageUrlsForVehicle(v.id, count, { year: v.year, make: v.make, model: v.model });
  patched += 1;
}

writeFileSync(dataPath, `${JSON.stringify(vehicles, null, 2)}\n`);
console.info(`Patched images for ${patched} vehicles → ${dataPath}`);
