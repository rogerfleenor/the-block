import { z } from 'zod';

/**
 * Vehicle as it lives in data/vehicles.json.
 * Snake_case is preserved because the dataset uses snake_case;
 * we keep parity with the source rather than transforming.
 */
export const VehicleSchema = z.object({
  id: z.string(),
  vin: z.string().min(11).max(17),
  year: z.number().int().min(1900).max(2100),
  make: z.string(),
  model: z.string(),
  trim: z.string(),
  body_style: z.string(),
  exterior_color: z.string(),
  interior_color: z.string(),
  engine: z.string(),
  transmission: z.string(),
  drivetrain: z.string(),
  odometer_km: z.number().int().nonnegative(),
  fuel_type: z.string(),
  condition_grade: z.number().min(0).max(5),
  condition_report: z.string(),
  damage_notes: z.array(z.string()),
  title_status: z.string(),
  province: z.string(),
  city: z.string(),
  auction_start: z.string(),
  starting_bid: z.number().nonnegative(),
  reserve_price: z.number().nonnegative().nullable(),
  buy_now_price: z.number().nonnegative().nullable(),
  images: z.array(z.string().url()),
  selling_dealership: z.string(),
  lot: z.string(),
  current_bid: z.number().nonnegative(),
  bid_count: z.number().int().nonnegative(),
});
export type Vehicle = z.infer<typeof VehicleSchema>;

/** Lightweight vehicle row for grid views. */
export const VehicleListItemSchema = VehicleSchema.pick({
  id: true,
  vin: true,
  year: true,
  make: true,
  model: true,
  trim: true,
  body_style: true,
  exterior_color: true,
  odometer_km: true,
  condition_grade: true,
  title_status: true,
  province: true,
  city: true,
  auction_start: true,
  starting_bid: true,
  current_bid: true,
  bid_count: true,
  buy_now_price: true,
  lot: true,
  selling_dealership: true,
  images: true,
});
export type VehicleListItem = z.infer<typeof VehicleListItemSchema>;

const sortEnum = z.enum(['ending_soon', 'price_asc', 'price_desc', 'newest', 'most_bids']);

/**
 * URL / tool filter fields (camelCase query params). Used by inventory search,
 * Filter rail, and AuctionAgent `setFilters` / `searchInventory`.
 */
export const VehicleFiltersSchema = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  trim: z.string().optional(),
  body: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  title: z.string().optional(),
  vin: z.string().optional(),
  lot: z.string().optional(),
  sellingDealership: z.string().optional(),
  transmission: z.string().optional(),
  drivetrain: z.string().optional(),
  fuelType: z.string().optional(),
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  engine: z.string().optional(),
  minYear: z.coerce.number().int().min(1900).max(2100).optional(),
  maxYear: z.coerce.number().int().min(1900).max(2100).optional(),
  minOdometer: z.coerce.number().int().nonnegative().optional(),
  maxOdometer: z.coerce.number().int().nonnegative().optional(),
  minBidCount: z.coerce.number().int().nonnegative().optional(),
  maxBidCount: z.coerce.number().int().nonnegative().optional(),
  minStartingBid: z.coerce.number().nonnegative().optional(),
  maxStartingBid: z.coerce.number().nonnegative().optional(),
  /** Filter lots that have (or lack) a buy-now price. */
  buyNow: z.enum(['any', 'yes', 'no']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minGrade: z.coerce.number().min(0).max(5).optional(),
});
export type VehicleFilters = z.infer<typeof VehicleFiltersSchema>;

/** Search / filter params for GET /api/vehicles. */
export const VehicleQuerySchema = VehicleFiltersSchema.extend({
  sort: sortEnum.default('ending_soon'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type VehicleQuery = z.infer<typeof VehicleQuerySchema>;

/** Distinct field values for building filter UI (GET /api/vehicles/facets). */
export const VehicleFacetsSchema = z.object({
  makes: z.array(z.string()),
  models: z.array(z.string()),
  trims: z.array(z.string()),
  bodyStyles: z.array(z.string()),
  provinces: z.array(z.string()),
  cities: z.array(z.string()),
  titleStatuses: z.array(z.string()),
  transmissions: z.array(z.string()),
  drivetrains: z.array(z.string()),
  fuelTypes: z.array(z.string()),
  exteriorColors: z.array(z.string()),
  interiorColors: z.array(z.string()),
  dealerships: z.array(z.string()),
});
export type VehicleFacets = z.infer<typeof VehicleFacetsSchema>;

export const VehicleListResponseSchema = z.object({
  items: z.array(VehicleListItemSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});
export type VehicleListResponse = z.infer<typeof VehicleListResponseSchema>;

function strOpt(s: string | undefined): string | undefined {
  const t = s?.trim();
  return t ? t : undefined;
}

function includesInsensitive(haystack: string, needle: string | undefined): boolean {
  const n = strOpt(needle);
  if (!n) return true;
  return haystack.toLowerCase().includes(n.toLowerCase());
}

function includesAllTokens(haystack: string, q: string): boolean {
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((t) => haystack.includes(t));
}

/** Concatenated searchable text for a vehicle (used by `q` token search). */
export function buildVehicleSearchHaystack(v: Vehicle): string {
  const parts = [
    v.id,
    v.vin,
    String(v.year),
    v.make,
    v.model,
    v.trim,
    v.body_style,
    v.exterior_color,
    v.interior_color,
    v.engine,
    v.transmission,
    v.drivetrain,
    v.fuel_type,
    String(v.odometer_km),
    String(v.condition_grade),
    v.condition_report,
    ...v.damage_notes,
    v.title_status,
    v.province,
    v.city,
    v.auction_start,
    String(v.starting_bid),
    v.reserve_price != null ? String(v.reserve_price) : '',
    v.buy_now_price != null ? String(v.buy_now_price) : '',
    v.lot,
    v.selling_dealership,
    String(v.current_bid),
    String(v.bid_count),
  ];
  return parts.join(' ').toLowerCase();
}

/** True if a full vehicle row satisfies list filters + free-text `q` (all tokens must match). */
export function vehicleMatchesQuery(v: Vehicle, q: VehicleQuery): boolean {
  if (q.make && v.make.toLowerCase() !== q.make.toLowerCase()) return false;
  if (q.body && v.body_style.toLowerCase() !== q.body.toLowerCase()) return false;
  if (q.province && v.province.toLowerCase() !== q.province.toLowerCase()) return false;
  if (q.title && v.title_status.toLowerCase() !== q.title.toLowerCase()) return false;

  if (!includesInsensitive(v.model, q.model)) return false;
  if (!includesInsensitive(v.trim, q.trim)) return false;
  if (!includesInsensitive(v.city, q.city)) return false;
  if (!includesInsensitive(v.vin, q.vin)) return false;
  if (!includesInsensitive(v.lot, q.lot)) return false;
  if (!includesInsensitive(v.selling_dealership, q.sellingDealership)) return false;
  if (!includesInsensitive(v.transmission, q.transmission)) return false;
  if (!includesInsensitive(v.drivetrain, q.drivetrain)) return false;
  if (!includesInsensitive(v.fuel_type, q.fuelType)) return false;
  if (!includesInsensitive(v.exterior_color, q.exteriorColor)) return false;
  if (!includesInsensitive(v.interior_color, q.interiorColor)) return false;
  if (!includesInsensitive(v.engine, q.engine)) return false;

  if (q.minYear !== undefined && v.year < q.minYear) return false;
  if (q.maxYear !== undefined && v.year > q.maxYear) return false;
  if (q.minOdometer !== undefined && v.odometer_km < q.minOdometer) return false;
  if (q.maxOdometer !== undefined && v.odometer_km > q.maxOdometer) return false;
  if (q.minBidCount !== undefined && v.bid_count < q.minBidCount) return false;
  if (q.maxBidCount !== undefined && v.bid_count > q.maxBidCount) return false;
  if (q.minStartingBid !== undefined && v.starting_bid < q.minStartingBid) return false;
  if (q.maxStartingBid !== undefined && v.starting_bid > q.maxStartingBid) return false;

  if (q.buyNow === 'yes' && (v.buy_now_price == null || v.buy_now_price <= 0)) return false;
  if (q.buyNow === 'no' && v.buy_now_price != null && v.buy_now_price > 0) return false;

  if (q.minPrice !== undefined && v.current_bid < q.minPrice) return false;
  if (q.maxPrice !== undefined && v.current_bid > q.maxPrice) return false;
  if (q.minGrade !== undefined && v.condition_grade < q.minGrade) return false;

  const searchQ = strOpt(q.q);
  if (searchQ && !includesAllTokens(buildVehicleSearchHaystack(v), searchQ)) return false;

  return true;
}

// ─── Bids ─────────────────────────────────────────────────────────────────────

export const BidSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  amount: z.number().positive(),
  bidder: z.string().default('You'),
  source: z.enum(['user', 'bot', 'agent']).default('user'),
  ts: z.string(),
});
export type Bid = z.infer<typeof BidSchema>;

export const PlaceBidInputSchema = z.object({
  amount: z.number().positive(),
  bidder: z.string().optional(),
});
export type PlaceBidInput = z.infer<typeof PlaceBidInputSchema>;

export const PlaceBidResultSchema = z.object({
  bid: BidSchema,
  currentBid: z.number().nonnegative(),
  bidCount: z.number().int().nonnegative(),
  reserveMet: z.boolean(),
});
export type PlaceBidResult = z.infer<typeof PlaceBidResultSchema>;

export const BidErrorCodeSchema = z.enum([
  'BELOW_MINIMUM',
  'BELOW_STARTING_BID',
  'AUCTION_NOT_STARTED',
  'AUCTION_ENDED',
  'VEHICLE_NOT_FOUND',
  'RATE_LIMITED',
]);
export type BidErrorCode = z.infer<typeof BidErrorCodeSchema>;

export const BidHistoryResponseSchema = z.object({
  bids: z.array(BidSchema),
});
export type BidHistoryResponse = z.infer<typeof BidHistoryResponseSchema>;
