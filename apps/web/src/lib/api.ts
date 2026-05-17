import { ROUTES } from '@block/shared';

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

/**
 * Network shape is enforced by `@block/shared` Zod schemas on the API side
 * (`fastify-type-provider-zod`). Re-validating in the browser doubles the
 * runtime cost (~10 KB gz of zod + per-response work) for no correctness
 * gain — the contract is already enforced server-side. We keep type-only
 * imports here so a contract break is caught at `tsc --noEmit` time, plus
 * one explicit `instanceof Response` + status check at runtime.
 *
 * If we ever need to defend against a hostile/proxy-rewriting upstream we
 * can swap `as` casts for `safeParse` again behind a dev-only branch.
 */
interface ErrorEnvelope {
  code?: string;
  message?: string;
  requestId?: string;
}

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

async function request<T>(input: RequestInfo, init: RequestInit): Promise<T> {
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
    const env = (json ?? {}) as ErrorEnvelope;
    throw new ApiError(
      env.message ?? `Request failed (${res.status})`,
      env.code ?? 'UNKNOWN',
      res.status,
      env.requestId,
    );
  }
  return json as T;
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
    return request<VehicleListResponse>(url, { method: 'GET' });
  },
  async getVehicle(id: string): Promise<Vehicle> {
    return request<Vehicle>(ROUTES.vehicleById(id), { method: 'GET' });
  },
  async getBids(id: string): Promise<BidHistoryResponse> {
    return request<BidHistoryResponse>(ROUTES.bids(id), { method: 'GET' });
  },
  async placeBid(id: string, input: PlaceBidInput): Promise<PlaceBidResult> {
    return request<PlaceBidResult>(ROUTES.bids(id), {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  async getIntel(id: string, categories?: string[]): Promise<VehicleIntel> {
    const url = `${ROUTES.intel(id)}${
      categories && categories.length > 0 ? `?categories=${categories.join(',')}` : ''
    }`;
    return request<VehicleIntel>(url, { method: 'GET' });
  },
  async listProviders(): Promise<ProviderListResponse> {
    return request<ProviderListResponse>(ROUTES.providers, { method: 'GET' });
  },
  async invokeAgent(req: AgentInvokeRequest): Promise<AgentInvokeResponse> {
    return request<AgentInvokeResponse>(ROUTES.agentInvoke, {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },
  async getAgentFacts(vehicleId: string): Promise<AgentFactsResponse> {
    return request<AgentFactsResponse>(ROUTES.agentFacts(vehicleId), { method: 'GET' });
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
