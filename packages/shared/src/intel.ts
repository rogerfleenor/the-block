import { z } from 'zod';

/**
 * Aggregated Vehicle Intelligence: composite payload returned by
 * GET /api/vehicles/:id/intel, fanned out across ~30 mock providers.
 *
 * Per-provider response shapes intentionally mirror the real-world
 * provider so swapping a mock for a live impl is a one-line change.
 */

export const ProviderCategorySchema = z.enum([
  'valuation',
  'history',
  'specs',
  'safety',
  'market',
  'dealer',
  'registration',
  'liens',
  'fuel',
  'social',
  'photography',
  'llm',
]);
export type ProviderCategory = z.infer<typeof ProviderCategorySchema>;

export const ProviderMetaSchema = z.object({
  name: z.string(),
  category: ProviderCategorySchema,
  mode: z.enum(['mock', 'live']),
  ttlMs: z.number().int().nonnegative(),
});
export type ProviderMeta = z.infer<typeof ProviderMetaSchema>;

export const ProviderListResponseSchema = z.object({
  providers: z.array(ProviderMetaSchema),
});
export type ProviderListResponse = z.infer<typeof ProviderListResponseSchema>;

/** Result wrapper around any provider call: success, error, or timeout. */
export const ProviderResultSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('ok'),
    provider: z.string(),
    category: ProviderCategorySchema,
    fetchedAt: z.string(),
    data: z.unknown(),
  }),
  z.object({
    status: z.literal('error'),
    provider: z.string(),
    category: ProviderCategorySchema,
    fetchedAt: z.string(),
    error: z.object({ code: z.string(), message: z.string() }),
  }),
]);
export type ProviderResult = z.infer<typeof ProviderResultSchema>;

// ─── Per-provider response shapes (mock-friendly, live-shaped) ───────────────

export const ValuationKbbSchema = z.object({
  vin: z.string(),
  tradeIn: z.object({ low: z.number(), mid: z.number(), high: z.number() }),
  privateParty: z.object({ low: z.number(), mid: z.number(), high: z.number() }),
  retail: z.object({ low: z.number(), mid: z.number(), high: z.number() }),
  asOf: z.string(),
});
export type ValuationKbb = z.infer<typeof ValuationKbbSchema>;

export const ValuationManheimSchema = z.object({
  vin: z.string(),
  mmrValue: z.number(),
  adjustedWholesale: z.number(),
  averageGrade: z.number(),
  averageEVBH: z.number().nullable().optional(),
  region: z.string(),
  asOf: z.string(),
});
export type ValuationManheim = z.infer<typeof ValuationManheimSchema>;

export const ValuationGenericSchema = z.object({
  vin: z.string(),
  wholesale: z.number().nullable(),
  retail: z.number().nullable(),
  asOf: z.string(),
});
export type ValuationGeneric = z.infer<typeof ValuationGenericSchema>;

export const HistoryCarfaxSchema = z.object({
  vin: z.string(),
  accidents: z.number().int().nonnegative(),
  owners: z.number().int().nonnegative(),
  serviceRecords: z.array(
    z.object({
      date: z.string(),
      odometerKm: z.number().int().nonnegative(),
      type: z.string(),
      vendor: z.string().optional(),
    }),
  ),
  titleBrand: z.enum(['clean', 'salvage', 'rebuilt', 'flood', 'junk', 'lemon']),
  damageEvents: z.array(
    z.object({ date: z.string(), severity: z.string(), description: z.string() }),
  ),
  odometerReadings: z.array(z.object({ date: z.string(), km: z.number().int().nonnegative() })),
  buybackGuarantee: z.boolean(),
});
export type HistoryCarfax = z.infer<typeof HistoryCarfaxSchema>;

export const HistoryAutoCheckSchema = z.object({
  vin: z.string(),
  score: z.number().int().min(1).max(100),
  accidents: z.number().int().nonnegative(),
  auctionAnnouncements: z.array(z.string()),
});
export type HistoryAutoCheck = z.infer<typeof HistoryAutoCheckSchema>;

export const TitleBrandsSchema = z.object({
  vin: z.string(),
  brands: z.array(z.string()),
  source: z.string(),
});
export type TitleBrands = z.infer<typeof TitleBrandsSchema>;

export const SpecsVpicSchema = z.object({
  vin: z.string(),
  make: z.string(),
  model: z.string(),
  modelYear: z.number().int(),
  bodyClass: z.string(),
  vehicleType: z.string(),
  engineCylinders: z.number().int().nullable(),
  displacementL: z.number().nullable(),
  fuelType: z.string().nullable(),
  driveType: z.string().nullable(),
  plant: z.object({ country: z.string().nullable(), city: z.string().nullable() }),
});
export type SpecsVpic = z.infer<typeof SpecsVpicSchema>;

export const SafetyRecallsSchema = z.object({
  vin: z.string(),
  openRecalls: z.array(
    z.object({
      campaignNumber: z.string(),
      reportReceivedDate: z.string(),
      component: z.string(),
      summary: z.string(),
      remedy: z.string(),
    }),
  ),
});
export type SafetyRecalls = z.infer<typeof SafetyRecallsSchema>;

export const SafetyNcapSchema = z.object({
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  overallRating: z.number().min(0).max(5),
  frontalRating: z.number().min(0).max(5),
  sideRating: z.number().min(0).max(5),
  rolloverRating: z.number().min(0).max(5),
});
export type SafetyNcap = z.infer<typeof SafetyNcapSchema>;

export const SafetyIihsSchema = z.object({
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  ratings: z.record(z.string(), z.enum(['Good', 'Acceptable', 'Marginal', 'Poor'])),
  topSafetyPick: z.boolean(),
});
export type SafetyIihs = z.infer<typeof SafetyIihsSchema>;

export const MarketCompSchema = z.object({
  source: z.string(),
  vin: z.string().nullable(),
  year: z.number().int(),
  make: z.string(),
  model: z.string(),
  trim: z.string().nullable(),
  odometerKm: z.number().int().nullable(),
  price: z.number(),
  soldAt: z.string(),
  location: z.string().nullable(),
});
export type MarketComp = z.infer<typeof MarketCompSchema>;

export const MarketCompsSchema = z.object({
  comps: z.array(MarketCompSchema),
  medianPrice: z.number(),
  avgDaysOnMarket: z.number().int(),
});
export type MarketComps = z.infer<typeof MarketCompsSchema>;

export const DealerInventorySchema = z.object({
  dealerName: z.string(),
  dealerCode: z.string(),
  inventoryCount: z.number().int().nonnegative(),
  avgListPrice: z.number(),
  lvi: z.object({ lastSyncedAt: z.string(), photos: z.number().int().nonnegative() }),
});
export type DealerInventory = z.infer<typeof DealerInventorySchema>;

export const RegistrationSchema = z.object({
  province: z.string(),
  status: z.string(),
  registeredOwners: z.number().int().nonnegative(),
  lastRegisteredAt: z.string().nullable(),
});
export type Registration = z.infer<typeof RegistrationSchema>;

export const LiensSchema = z.object({
  hasLiens: z.boolean(),
  records: z.array(
    z.object({ lienholder: z.string(), filedAt: z.string(), amount: z.number().nullable() }),
  ),
});
export type Liens = z.infer<typeof LiensSchema>;

export const RepoHistorySchema = z.object({
  events: z.array(z.object({ date: z.string(), agency: z.string(), reason: z.string() })),
});
export type RepoHistory = z.infer<typeof RepoHistorySchema>;

export const ViolationsSchema = z.object({
  count: z.number().int().nonnegative(),
  records: z.array(z.object({ date: z.string(), code: z.string(), description: z.string() })),
});
export type Violations = z.infer<typeof ViolationsSchema>;

export const FuelEconomySchema = z.object({
  cityMpg: z.number(),
  highwayMpg: z.number(),
  combinedMpg: z.number(),
  annualFuelCostUsd: z.number(),
  ghgScore: z.number().int().min(1).max(10),
});
export type FuelEconomy = z.infer<typeof FuelEconomySchema>;

export const SocialVideoSchema = z.object({
  platform: z.enum(['youtube', 'tiktok', 'instagram', 'x']),
  id: z.string(),
  title: z.string(),
  channel: z.string(),
  views: z.number().int().nonnegative(),
  publishedAt: z.string(),
  thumbnail: z.string().url(),
  url: z.string().url(),
});
export type SocialVideo = z.infer<typeof SocialVideoSchema>;

export const SocialPostSchema = z.object({
  platform: z.enum(['reddit', 'x', 'instagram']),
  id: z.string(),
  author: z.string(),
  excerpt: z.string(),
  url: z.string().url(),
  score: z.number().int(),
  publishedAt: z.string(),
});
export type SocialPost = z.infer<typeof SocialPostSchema>;

export const SocialBundleSchema = z.object({
  videos: z.array(SocialVideoSchema),
  posts: z.array(SocialPostSchema),
});
export type SocialBundle = z.infer<typeof SocialBundleSchema>;

export const PhotoSpinSchema = z.object({
  spinUrl: z.string().url(),
  hotspots: z.array(z.object({ angle: z.number(), label: z.string() })),
});
export type PhotoSpin = z.infer<typeof PhotoSpinSchema>;

// ─── Composite intel payload ─────────────────────────────────────────────────

export const VehicleIntelSchema = z.object({
  vehicleId: z.string(),
  vin: z.string(),
  fetchedAt: z.string(),
  results: z.array(ProviderResultSchema),
  warmedFromCache: z.boolean(),
});
export type VehicleIntel = z.infer<typeof VehicleIntelSchema>;
