import { catalogKey, loadVehicleImageCatalog } from './vehicleImageCatalog.mjs';

/**
 * Curated Unsplash photo bases — fallback when no Commons match for Y/M/M.
 * License: https://unsplash.com/license — see docs/IMAGE_ATTRIBUTION.md
 *
 * Unsplash/imgix may retire assets; the UI skips broken URLs when possible.
 */
export const UNSPLASH_CAR_IMAGE_BASES = [
  'https://images.unsplash.com/photo-1544636331-e26879cd4d9b',
  'https://images.unsplash.com/photo-1583267746897-2cf415887172',
  'https://images.unsplash.com/photo-1502877338535-766e1452684a',
  'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6',
  'https://images.unsplash.com/photo-1489824904134-891ab64532f1',
  'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
  'https://images.unsplash.com/photo-1494976388531-d1058494cdd8',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7',
  'https://images.unsplash.com/photo-1493238792000-8113da705763',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf',
  'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8',
  'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
  'https://images.unsplash.com/photo-1511919884226-fd3cad34687c',
  'https://images.unsplash.com/photo-1580273916550-e323be2ae537',
  'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2',
  'https://images.unsplash.com/photo-1590362891991-f776e747a588',
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64',
  'https://images.unsplash.com/photo-1542282088-fe8426682b8f',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
  'https://images.unsplash.com/photo-1601362840469-51e4d8d58785',
  'https://images.unsplash.com/photo-1612874742237-6526221588e3',
  'https://images.unsplash.com/photo-1555215695-3004980ad54e',
  'https://images.unsplash.com/photo-1617531653332-bd46c24f2068',
];

const CROP = 'auto=format&fit=crop&w=1200&h=800&q=82';

export function uniqueCarImageUrls() {
  const seen = new Set();
  const out = [];
  for (const base of UNSPLASH_CAR_IMAGE_BASES) {
    const u = `${base}?${CROP}`;
    if (!seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

function dedupeUrls(urls) {
  const seen = new Set();
  const out = [];
  for (const u of urls) {
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/**
 * @param {string} vehicleId
 * @param {number} count
 * @param {{ year: number; make: string; model: string } | null} [ctx] When set, prefers
 *   `data/vehicleImageCatalog.json` (Wikimedia Commons) under key `make|model`, ordering
 *   entries by closest `refYear` to the lot year. Unsplash is only used to pad when the
 *   catalog does not have enough distinct URLs.
 * @param {string[]} [genericPool] Override fallback pool (tests).
 */
export function buildImageUrlsForVehicle(vehicleId, count, ctx = null, genericPool = null) {
  const generic = genericPool ?? uniqueCarImageUrls();
  if (generic.length === 0) throw new Error('car image pool empty');

  let preferred = [];
  if (ctx && Number.isFinite(ctx.year) && ctx.make && ctx.model) {
    const cat = loadVehicleImageCatalog();
    const key = catalogKey(ctx.make, ctx.model);
    const row = cat[key]?.images ?? [];
    const normalized = row.map((entry) =>
      typeof entry === 'string' ? { url: entry, refYear: null } : entry,
    );
    const sorted = [...normalized].sort((a, b) => {
      const da = a.refYear == null ? 9999 : Math.abs(a.refYear - ctx.year);
      const db = b.refYear == null ? 9999 : Math.abs(b.refYear - ctx.year);
      if (da !== db) return da - db;
      return a.url.localeCompare(b.url);
    });
    preferred = dedupeUrls(sorted.map((x) => x.url));
  }

  const out = [];
  const used = new Set();
  let h = djb2(vehicleId);

  const takeUniqueFrom = (pool, slotsNeeded) => {
    if (!pool.length || slotsNeeded <= 0) return;
    const cap = Math.min(pool.length * 8, Math.max(slotsNeeded * 12, 48));
    for (let attempt = 0; attempt < cap && out.length < count; attempt++) {
      const idx = (h + attempt * 13) % pool.length;
      const u = pool[idx];
      h = (h * 31 + attempt + 1) >>> 0;
      if (!used.has(u)) {
        used.add(u);
        out.push(u);
      }
    }
  };

  takeUniqueFrom(preferred, count);
  if (out.length < count) takeUniqueFrom(generic, count - out.length);

  let g = 0;
  while (out.length < count && generic.length) {
    out.push(generic[g % generic.length]);
    g += 1;
  }

  return out;
}
