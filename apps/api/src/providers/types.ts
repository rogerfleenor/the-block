import { TIMINGS, vinSeed, seededRng, type ProviderCategory } from '@block/shared';

import type { z } from 'zod';

/** Inputs every provider mock gets. Most only read `vin`. */
export interface ProviderInput {
  vin: string;
  vehicleId: string;
  // Extra context the provider may want (year/make/model for human-friendly mocks).
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
}

export interface Provider<TOut> {
  name: string;
  category: ProviderCategory;
  /** Mock-mode cache TTL. Live-mode wrapper picks its own. */
  ttlMs: number;
  /** Per-provider call budget in ms — aggregator enforces this with Promise.race. */
  timeoutMs?: number;
  /** Currently active mode. Defaults to 'mock'. */
  mode: 'mock' | 'live';
  /** Validate the mock output against the shared schema (drift guard). */
  schema: z.ZodTypeAny;
  /** Mock implementation — VIN-deterministic. */
  mock: (input: ProviderInput) => TOut;
}

/** Build a deterministic latency in [TIMINGS.providerMinLatencyMs, TIMINGS.providerMaxLatencyMs]. */
export function pickLatencyMs(vin: string, providerName: string): number {
  const rng = seededRng(vinSeed(vin, `${providerName}::latency`));
  return rng.int(TIMINGS.providerMinLatencyMs, TIMINGS.providerMaxLatencyMs);
}

/** Returns `true` if the deterministic dice say this call should fail. */
export function shouldFail(vin: string, providerName: string): boolean {
  const rng = seededRng(vinSeed(vin, `${providerName}::failure`));
  return rng.chance(TIMINGS.providerFailureRate);
}

/** Promise that resolves after `ms` (used for simulated latency). */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convenience: build a seeded RNG scoped to a provider + VIN. */
export function rngFor(input: ProviderInput, providerName: string) {
  return seededRng(vinSeed(input.vin, providerName));
}
