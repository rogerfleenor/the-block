import { z } from 'zod';

import { VehicleFiltersSchema } from './vehicle.js';

/**
 * AuctionAgent — AI assist surface (NOT a chatbot).
 *
 * Backend exposes a small set of typed tools the LLM may call.
 * `placeBid` NEVER auto-executes; it returns an AgentSuggestion that
 * the UI renders as a 5-second confirm card.
 */

export const ToolNameSchema = z.enum([
  'placeBid',
  'searchInventory',
  'getIntel',
  'recommendMaxBid',
  'findComps',
  'explainPrice',
  'flagRisks',
  'setFilters',
  'goto',
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

// ─── Tool input/output schemas ───────────────────────────────────────────────

export const PlaceBidToolInputSchema = z.object({
  vehicleId: z.string(),
  amount: z.number().positive(),
});
export type PlaceBidToolInput = z.infer<typeof PlaceBidToolInputSchema>;

export const SearchInventoryToolInputSchema = z.object({
  q: z.string().optional(),
  filters: VehicleFiltersSchema.optional(),
  sort: z.enum(['ending_soon', 'price_asc', 'price_desc', 'newest', 'most_bids']).optional(),
  limit: z.number().int().min(1).max(50).default(12),
});
export type SearchInventoryToolInput = z.infer<typeof SearchInventoryToolInputSchema>;

export const SearchInventoryToolOutputSchema = z.object({
  matchedIds: z.array(z.string()),
  total: z.number().int().nonnegative(),
});
export type SearchInventoryToolOutput = z.infer<typeof SearchInventoryToolOutputSchema>;

export const GetIntelToolInputSchema = z.object({
  vehicleId: z.string(),
  categories: z
    .array(
      z.enum([
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
      ]),
    )
    .optional(),
});
export type GetIntelToolInput = z.infer<typeof GetIntelToolInputSchema>;

export const RecommendMaxBidToolInputSchema = z.object({
  vehicleId: z.string(),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
});
export type RecommendMaxBidToolInput = z.infer<typeof RecommendMaxBidToolInputSchema>;

export const RecommendMaxBidToolOutputSchema = z.object({
  value: z.number().positive(),
  low: z.number().positive(),
  high: z.number().positive(),
  rationale: z.string(),
  sources: z.array(z.string()),
});
export type RecommendMaxBidToolOutput = z.infer<typeof RecommendMaxBidToolOutputSchema>;

export const FindCompsToolInputSchema = z.object({
  vehicleId: z.string(),
  limit: z.number().int().min(1).max(10).default(3),
});
export type FindCompsToolInput = z.infer<typeof FindCompsToolInputSchema>;

export const ExplainPriceToolInputSchema = z.object({ vehicleId: z.string() });
export type ExplainPriceToolInput = z.infer<typeof ExplainPriceToolInputSchema>;

export const FlagRisksToolInputSchema = z.object({ vehicleId: z.string() });
export type FlagRisksToolInput = z.infer<typeof FlagRisksToolInputSchema>;

export const SetFiltersToolInputSchema = z.object({
  filters: VehicleFiltersSchema,
});
export type SetFiltersToolInput = z.infer<typeof SetFiltersToolInputSchema>;

export const GotoToolInputSchema = z.object({ path: z.string() });
export type GotoToolInput = z.infer<typeof GotoToolInputSchema>;

// ─── Agent outputs ───────────────────────────────────────────────────────────

export const AgentFactKindSchema = z.enum([
  'valuation_delta',
  'reserve_likelihood',
  'comps_summary',
  'risk',
  'recommendation',
  'info',
]);
export type AgentFactKind = z.infer<typeof AgentFactKindSchema>;

export const AgentFactSchema = z.object({
  id: z.string(),
  vehicleId: z.string().optional(),
  kind: AgentFactKindSchema,
  text: z.string(),
  severity: z.enum(['low', 'medium', 'high']).default('low'),
  sources: z.array(z.string()),
  detail: z.string().optional(),
  ts: z.string(),
});
export type AgentFact = z.infer<typeof AgentFactSchema>;

export const AgentSuggestionSchema = z.object({
  id: z.string(),
  kind: z.literal('placeBid'),
  vehicleId: z.string(),
  amount: z.number().positive(),
  rationale: z.string(),
  sources: z.array(z.string()),
  /** Confirmation window in ms; client should default to Cancel after this. */
  confirmWindowMs: z.number().int().positive(),
  ts: z.string(),
});
export type AgentSuggestion = z.infer<typeof AgentSuggestionSchema>;

export const AgentActionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('setFilters'), filters: SetFiltersToolInputSchema.shape.filters }),
  z.object({ kind: z.literal('goto'), path: z.string() }),
]);
export type AgentAction = z.infer<typeof AgentActionSchema>;

export const ToolCallSchema = z.object({
  name: ToolNameSchema,
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  durationMs: z.number().int().nonnegative().optional(),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

// ─── REST contract ───────────────────────────────────────────────────────────

export const AgentInvokeRequestSchema = z.object({
  utterance: z.string().min(1).max(500),
  context: z
    .object({
      vehicleId: z.string().optional(),
      filters: SetFiltersToolInputSchema.shape.filters.optional(),
      page: z.string().optional(),
    })
    .optional(),
});
export type AgentInvokeRequest = z.infer<typeof AgentInvokeRequestSchema>;

export const AgentInvokeResponseSchema = z.object({
  traceId: z.string(),
  facts: z.array(AgentFactSchema),
  suggestions: z.array(AgentSuggestionSchema),
  actions: z.array(AgentActionSchema),
  reply: z.string().optional(),
  toolCalls: z.array(ToolCallSchema),
});
export type AgentInvokeResponse = z.infer<typeof AgentInvokeResponseSchema>;

export const AgentFactsResponseSchema = z.object({
  vehicleId: z.string(),
  facts: z.array(AgentFactSchema),
  fetchedAt: z.string(),
});
export type AgentFactsResponse = z.infer<typeof AgentFactsResponseSchema>;
