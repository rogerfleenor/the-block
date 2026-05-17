import { z } from 'zod';

import { AgentFactSchema, AgentSuggestionSchema } from './agent.js';

/**
 * WebSocket protocol shared by web + api.
 * Client subscribes to topics; server pushes typed events.
 */

export const WsTopicSchema = z.union([
  z.literal('inventory'),
  z.string().regex(/^vehicle:[\w-]+$/, 'vehicle:<id>'),
  z.string().regex(/^agent:[\w-]+$/, 'agent:<traceId>'),
]);
export type WsTopic = z.infer<typeof WsTopicSchema>;

export const WsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('subscribe'), topic: WsTopicSchema }),
  z.object({ type: z.literal('unsubscribe'), topic: WsTopicSchema }),
  z.object({ type: z.literal('ping'), ts: z.number().int() }),
]);
export type WsClientMessage = z.infer<typeof WsClientMessageSchema>;

export const WsServerMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bid:updated'),
    vehicleId: z.string(),
    currentBid: z.number().nonnegative(),
    bidCount: z.number().int().nonnegative(),
    reserveMet: z.boolean(),
    source: z.enum(['user', 'bot', 'agent']),
    ts: z.string(),
  }),
  z.object({
    type: z.literal('auction:ending'),
    vehicleId: z.string(),
    endsAt: z.string(),
  }),
  z.object({
    type: z.literal('intel:patch'),
    vehicleId: z.string(),
    provider: z.string(),
    data: z.unknown(),
    ts: z.string(),
  }),
  z.object({
    type: z.literal('agent:fact'),
    vehicleId: z.string().optional(),
    fact: AgentFactSchema,
  }),
  z.object({
    type: z.literal('agent:suggestion'),
    vehicleId: z.string(),
    suggestion: AgentSuggestionSchema,
  }),
  z.object({
    type: z.literal('agent:trace'),
    traceId: z.string(),
    delta: z.string(),
    done: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('pong'),
    ts: z.number().int(),
  }),
  z.object({
    type: z.literal('error'),
    code: z.string(),
    message: z.string(),
  }),
]);
export type WsServerMessage = z.infer<typeof WsServerMessageSchema>;

/** Convenience type for the inventory live-bid badge. */
export type BidUpdatedEvent = Extract<WsServerMessage, { type: 'bid:updated' }>;
