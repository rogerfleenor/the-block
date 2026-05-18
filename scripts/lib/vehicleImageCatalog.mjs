import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = resolve(scriptDir, '../../data/vehicleImageCatalog.json');

/** @type {Record<string, { images: Array<string | { url: string; refYear: number | null; filePage?: string }> }> | null} */
let cache = null;

export function vehicleImageCatalogPath() {
  return CATALOG_PATH;
}

export function catalogKey(make, model) {
  return `${make}|${model}`;
}

export function loadVehicleImageCatalog() {
  if (cache) return cache;
  if (!existsSync(CATALOG_PATH)) {
    cache = {};
    return cache;
  }
  cache = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));
  return cache;
}
