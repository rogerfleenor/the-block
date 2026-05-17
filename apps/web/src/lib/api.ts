import {
  AgentFactsResponseSchema,
  AgentInvokeRequestSchema,
  AgentInvokeResponseSchema,
  BidHistoryResponseSchema,
  PlaceBidInputSchema,
  PlaceBidResultSchema,
  ProviderListResponseSchema,
  ROUTES,
  VehicleIntelSchema,
  VehicleListResponseSchema,
  VehicleSchema,
} from '@block/shared';
import { z } from 'zod';

import type {
  AgentFactsResponse,
  AgentInvokeRequest,
  AgentInvokeResponse,
  BidHistoryResponse,
  PlaceBidInput,
  PlaceBidResult,
  ProviderListResponse,
  Vehicle,
  VehicleIntel,
  VehicleListResponse,
  VehicleQuery,
} from '@block/shared';

const ErrorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
});

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<S extends z.ZodTypeAny>(
  input: RequestInfo,
  init: RequestInit,
  schema: S,
): Promise<z.infer<S>> {
  const res = await fetch(input, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch (_e) {
      throw new ApiError(`Invalid JSON from ${String(input)}`, 'INVALID_JSON', res.status);
    }
  }
  if (!res.ok) {
    const parsed = ErrorEnvelopeSchema.safeParse(json);
    if (parsed.success) {
      throw new ApiError(parsed.data.message, parsed.data.code, res.status, parsed.data.requestId);
    }
    throw new ApiError(`Request failed (${res.status})`, 'UNKNOWN', res.status);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(
      `Response failed shared-schema validation: ${result.error.issues[0]?.message ?? 'unknown'}`,
      'SCHEMA_MISMATCH',
      res.status,
    );
  }
  return result.data;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    sp.set(key, String(value));
  }
  const out = sp.toString();
  return out.length > 0 ? `?${out}` : '';
}

export const api = {
  async listVehicles(query: Partial<VehicleQuery> = {}): Promise<VehicleListResponse> {
    const url = `${ROUTES.vehicles}${qs(query as Record<string, string | number | undefined>)}`;
    return request(url, { method: 'GET' }, VehicleListResponseSchema);
  },
  async getVehicle(id: string): Promise<Vehicle> {
    return request(ROUTES.vehicleById(id), { method: 'GET' }, VehicleSchema);
  },
  async getBids(id: string): Promise<BidHistoryResponse> {
    return request(ROUTES.bids(id), { method: 'GET' }, BidHistoryResponseSchema);
  },
  async placeBid(id: string, input: PlaceBidInput): Promise<PlaceBidResult> {
    const validated = PlaceBidInputSchema.parse(input);
    return request(
      ROUTES.bids(id),
      { method: 'POST', body: JSON.stringify(validated) },
      PlaceBidResultSchema,
    );
  },
  async getIntel(id: string, categories?: string[]): Promise<VehicleIntel> {
    const url = `${ROUTES.intel(id)}${categories && categories.length > 0 ? `?categories=${categories.join(',')}` : ''}`;
    return request(url, { method: 'GET' }, VehicleIntelSchema);
  },
  async listProviders(): Promise<ProviderListResponse> {
    return request(ROUTES.providers, { method: 'GET' }, ProviderListResponseSchema);
  },
  async invokeAgent(req: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    const validated = AgentInvokeRequestSchema.parse(req);
    return request(
      ROUTES.agentInvoke,
      { method: 'POST', body: JSON.stringify(validated) },
      AgentInvokeResponseSchema,
    );
  },
  async getAgentFacts(vehicleId: string): Promise<AgentFactsResponse> {
    return request(ROUTES.agentFacts(vehicleId), { method: 'GET' }, AgentFactsResponseSchema);
  },
  async postVital(metric: {
    name: string;
    value: number;
    id: string;
    navigationType?: string;
  }): Promise<void> {
    await fetch(ROUTES.vitals, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
      keepalive: true,
    }).catch(() => undefined);
  },
};
