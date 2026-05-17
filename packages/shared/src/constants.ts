/**
 * Port and path constants shared by web + api.
 * Single source of truth. Both engineer agents import from here.
 */

export const API_PORT = 4000;
export const WEB_PORT = 5173;

export const API_BASE_PATH = '/api';
export const WS_PATH = '/ws';

export const ROUTES = {
  health: '/api/health',
  vitals: '/api/health/vitals',
  vehicles: '/api/vehicles',
  vehicleById: (id: string) => `/api/vehicles/${id}`,
  bids: (id: string) => `/api/vehicles/${id}/bids`,
  intel: (id: string) => `/api/vehicles/${id}/intel`,
  intelByProvider: (id: string, provider: string) => `/api/vehicles/${id}/intel/${provider}`,
  providers: '/api/providers',
  agentInvoke: '/api/agent/invoke',
  agentFacts: (id: string) => `/api/agent/facts/${id}`,
} as const;

export const BID_RULES = {
  /** Minimum increment = max(MIN_INCREMENT_FLOOR, MIN_INCREMENT_PERCENT * currentBid). */
  MIN_INCREMENT_FLOOR: 100,
  MIN_INCREMENT_PERCENT: 0.01,
} as const;

export const RATE_LIMITS = {
  bidsPerMinPerIp: 10,
  agentInvokesPerMinPerIp: 20,
} as const;

export const TIMINGS = {
  /** Agent confirm card auto-cancels after this. */
  agentConfirmMs: 5_000,
  /** Bot bidder ticks per active auction. */
  botMinIntervalMs: 10_000,
  botMaxIntervalMs: 45_000,
  /** State snapshot frequency. */
  snapshotIntervalMs: 30_000,
  /** Provider mock latency simulation. */
  providerMinLatencyMs: 20,
  providerMaxLatencyMs: 220,
  /** Provider mock synthetic failure rate (0..1). */
  providerFailureRate: 0.02,
} as const;

export const CACHE_TTL_MS = {
  intelComposite: 60_000,
  valuation: 5 * 60_000,
  history: 30 * 60_000,
  recalls: 60 * 60_000,
  social: 10 * 60_000,
  default: 5 * 60_000,
} as const;
