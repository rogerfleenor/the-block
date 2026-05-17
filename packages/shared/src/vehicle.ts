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

/** Search / filter params for GET /api/vehicles. */
export const VehicleQuerySchema = z.object({
  q: z.string().optional(),
  make: z.string().optional(),
  body: z.string().optional(),
  province: z.string().optional(),
  title: z.string().optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  minGrade: z.coerce.number().min(0).max(5).optional(),
  sort: z
    .enum(['ending_soon', 'price_asc', 'price_desc', 'newest', 'most_bids'])
    .default('ending_soon'),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});
export type VehicleQuery = z.infer<typeof VehicleQuerySchema>;

export const VehicleListResponseSchema = z.object({
  items: z.array(VehicleListItemSchema),
  total: z.number().int().nonnegative(),
  nextCursor: z.string().nullable(),
});
export type VehicleListResponse = z.infer<typeof VehicleListResponseSchema>;

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
