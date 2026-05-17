import { readFile } from 'node:fs/promises';

import {
  VehicleListItemSchema,
  VehicleSchema,
  type Vehicle,
  type VehicleListItem,
  type VehicleQuery,
} from '@block/shared';

import { baseLogger } from '../lib/logger.js';
import { VEHICLES_JSON } from '../lib/paths.js';

const byId = new Map<string, Vehicle>();
const byVin = new Map<string, Vehicle>();

let initialised = false;

/** Load + validate vehicles.json into memory. Idempotent. */
export async function initVehicleStore(): Promise<void> {
  if (initialised) return;
  const raw = await readFile(VEHICLES_JSON, 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(`vehicles.json must be an array, got ${typeof parsed}`);
  }
  let rejected = 0;
  for (const candidate of parsed) {
    // Coerce well-known dataset quirks before validating:
    // - current_bid arrives as `null` when no bids placed; the contract
    //   schema requires a non-negative number, so we treat that as 0.
    // - bid_count arrives as `null` in the same rows.
    const normalised: Record<string, unknown> = { ...candidate };
    if (normalised.current_bid === null || normalised.current_bid === undefined) {
      normalised.current_bid = 0;
    }
    if (normalised.bid_count === null || normalised.bid_count === undefined) {
      normalised.bid_count = 0;
    }
    const v = VehicleSchema.safeParse(normalised);
    if (!v.success) {
      rejected += 1;
      baseLogger.warn(
        { id: (candidate as { id?: string })?.id, issues: v.error.issues.slice(0, 2) },
        'vehicleStore: rejected row',
      );
      continue;
    }
    byId.set(v.data.id, v.data);
    byVin.set(v.data.vin, v.data);
  }
  initialised = true;
  baseLogger.info(
    { count: byId.size, rejected, source: VEHICLES_JSON },
    'vehicleStore: loaded vehicles',
  );
}

export function getVehicle(id: string): Vehicle | undefined {
  return byId.get(id);
}

export function getVehicleByVin(vin: string): Vehicle | undefined {
  return byVin.get(vin);
}

export function allVehicles(): Vehicle[] {
  return [...byId.values()];
}

/** Mutate a vehicle in place (atomically). Returns the new value. */
export function updateVehicle(id: string, patch: Partial<Vehicle>): Vehicle | undefined {
  const current = byId.get(id);
  if (!current) return undefined;
  const next = { ...current, ...patch } satisfies Vehicle;
  byId.set(id, next);
  byVin.set(next.vin, next);
  return next;
}

/** Replace whole-vehicle (used by snapshot restore). */
export function setVehicle(v: Vehicle): void {
  byId.set(v.id, v);
  byVin.set(v.vin, v);
}

function toListItem(v: Vehicle): VehicleListItem {
  // pick: the contract uses VehicleListItemSchema; safeParse to enforce shape drift.
  const trimmed = {
    id: v.id,
    vin: v.vin,
    year: v.year,
    make: v.make,
    model: v.model,
    trim: v.trim,
    body_style: v.body_style,
    exterior_color: v.exterior_color,
    odometer_km: v.odometer_km,
    condition_grade: v.condition_grade,
    title_status: v.title_status,
    province: v.province,
    city: v.city,
    auction_start: v.auction_start,
    starting_bid: v.starting_bid,
    current_bid: v.current_bid,
    bid_count: v.bid_count,
    buy_now_price: v.buy_now_price,
    lot: v.lot,
    selling_dealership: v.selling_dealership,
    images: v.images,
  };
  return VehicleListItemSchema.parse(trimmed);
}

function matchesQuery(v: Vehicle, q: VehicleQuery): boolean {
  if (q.make && v.make.toLowerCase() !== q.make.toLowerCase()) return false;
  if (q.body && v.body_style.toLowerCase() !== q.body.toLowerCase()) return false;
  if (q.province && v.province.toLowerCase() !== q.province.toLowerCase()) return false;
  if (q.title && v.title_status.toLowerCase() !== q.title.toLowerCase()) return false;
  if (q.minPrice !== undefined && v.current_bid < q.minPrice) return false;
  if (q.maxPrice !== undefined && v.current_bid > q.maxPrice) return false;
  if (q.minGrade !== undefined && v.condition_grade < q.minGrade) return false;
  if (q.q) {
    const haystack = [
      v.vin,
      v.make,
      v.model,
      v.trim,
      v.body_style,
      v.exterior_color,
      v.city,
      v.province,
      v.lot,
      v.selling_dealership,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q.q.toLowerCase())) return false;
  }
  return true;
}

function sortFn(sort: VehicleQuery['sort']): (a: Vehicle, b: Vehicle) => number {
  switch (sort) {
    case 'price_asc':
      return (a, b) => a.current_bid - b.current_bid || a.id.localeCompare(b.id);
    case 'price_desc':
      return (a, b) => b.current_bid - a.current_bid || a.id.localeCompare(b.id);
    case 'newest':
      return (a, b) => b.year - a.year || a.id.localeCompare(b.id);
    case 'most_bids':
      return (a, b) => b.bid_count - a.bid_count || a.id.localeCompare(b.id);
    case 'ending_soon':
    default:
      return (a, b) =>
        a.auction_start.localeCompare(b.auction_start) || a.id.localeCompare(b.id);
  }
}

interface PageResult {
  items: VehicleListItem[];
  total: number;
  nextCursor: string | null;
}

/**
 * Filter + sort + cursor-paginate. Cursors are opaque base64-encoded ids of
 * the last item returned. We resolve the cursor by skipping rows until we
 * see that id again in the sorted set, then take `limit`.
 */
export function listVehicles(query: VehicleQuery): PageResult {
  const filtered = allVehicles().filter((v) => matchesQuery(v, query));
  const sorted = filtered.sort(sortFn(query.sort));
  const total = sorted.length;

  let startIdx = 0;
  if (query.cursor) {
    const decoded = decodeCursor(query.cursor);
    const idx = sorted.findIndex((v) => v.id === decoded);
    startIdx = idx >= 0 ? idx + 1 : 0;
  }

  const slice = sorted.slice(startIdx, startIdx + query.limit);
  const items = slice.map(toListItem);
  const last = slice.at(-1);
  const nextCursor =
    startIdx + query.limit < total && last ? encodeCursor(last.id) : null;

  return { items, total, nextCursor };
}

function encodeCursor(id: string): string {
  return Buffer.from(id, 'utf-8').toString('base64url');
}

function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf-8');
  } catch {
    return '';
  }
}

export const __internals = { encodeCursor, decodeCursor };
