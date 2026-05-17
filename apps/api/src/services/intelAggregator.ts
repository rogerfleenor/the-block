import {
  CACHE_TTL_MS,
  ProviderResultSchema,
  type ProviderCategory,
  type ProviderResult,
  type VehicleIntel,
} from '@block/shared';

import { cacheGet, cacheSet } from '../lib/cache.js';
import { logger } from '../lib/logger.js';
import { ALL_PROVIDERS, getProvider } from '../providers/registry.js';
import { pickLatencyMs, shouldFail, sleep, type Provider } from '../providers/types.js';

import { getVehicle } from './vehicleStore.js';

interface RunProviderArgs {
  provider: Provider<unknown>;
  vehicleId: string;
  vin: string;
  vehicleHints: Pick<ProviderInputLike, 'year' | 'make' | 'model' | 'trim' | 'bodyStyle'>;
}

interface ProviderInputLike {
  vehicleId: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  bodyStyle?: string;
}

/**
 * Run a single provider with simulated latency + synthetic failure rate +
 * per-provider timeout. Always returns a contract-shaped ProviderResult
 * (never throws). The timeout is enforced even in mock mode so the API
 * matches its real-mode behaviour byte-for-byte.
 */
export async function runProvider(args: RunProviderArgs): Promise<ProviderResult> {
  const { provider, vehicleId, vin, vehicleHints } = args;
  const fetchedAt = new Date().toISOString();
  const timeoutMs = provider.timeoutMs ?? 1_000;

  const work = (async (): Promise<ProviderResult> => {
    const latency = pickLatencyMs(vin, provider.name);
    await sleep(Math.min(latency, timeoutMs));
    if (shouldFail(vin, provider.name)) {
      return {
        status: 'error',
        provider: provider.name,
        category: provider.category,
        fetchedAt,
        error: { code: 'PROVIDER_FAILURE', message: 'Simulated upstream failure.' },
      } satisfies ProviderResult;
    }
    const input: ProviderInputLike = { vehicleId, vin, ...vehicleHints };
    const raw = provider.mock(input as never);
    const parsed = provider.schema.safeParse(raw);
    if (!parsed.success) {
      return {
        status: 'error',
        provider: provider.name,
        category: provider.category,
        fetchedAt,
        error: { code: 'SCHEMA_DRIFT', message: parsed.error.issues[0]?.message ?? 'schema drift' },
      } satisfies ProviderResult;
    }
    return {
      status: 'ok',
      provider: provider.name,
      category: provider.category,
      fetchedAt,
      data: parsed.data,
    } satisfies ProviderResult;
  })();

  const timeout = new Promise<ProviderResult>((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'error',
        provider: provider.name,
        category: provider.category,
        fetchedAt,
        error: { code: 'TIMEOUT', message: `Provider exceeded ${timeoutMs}ms.` },
      });
    }, timeoutMs);
  });

  let raceResult: ProviderResult;
  try {
    raceResult = await Promise.race([work, timeout]);
  } catch (err) {
    raceResult = {
      status: 'error',
      provider: provider.name,
      category: provider.category,
      fetchedAt,
      error: { code: 'EXCEPTION', message: err instanceof Error ? err.message : String(err) },
    };
  }
  const valid = ProviderResultSchema.safeParse(raceResult);
  return valid.success ? valid.data : raceResult;
}

export interface AggregateArgs {
  vehicleId: string;
  vin: string;
  vehicleHints: Pick<ProviderInputLike, 'year' | 'make' | 'model' | 'trim' | 'bodyStyle'>;
  categories?: ProviderCategory[];
}

/**
 * Fan out across providers with Promise.allSettled. Optionally scope to
 * categories. Wraps the composite result in a 60s TTL cache so warm calls
 * cost ~nothing.
 */
export async function aggregateIntel(args: AggregateArgs): Promise<VehicleIntel> {
  const cacheKey = `intel:${args.vehicleId}:${(args.categories ?? []).slice().sort().join(',')}`;
  const cached = cacheGet<VehicleIntel>(cacheKey);
  if (cached) {
    return { ...cached, warmedFromCache: true };
  }

  const providers = (args.categories
    ? ALL_PROVIDERS.filter((p) => args.categories?.includes(p.category))
    : ALL_PROVIDERS) as ReadonlyArray<Provider<unknown>>;

  logger().debug(
    { vehicleId: args.vehicleId, providerCount: providers.length, categories: args.categories },
    'intelAggregator: fan-out',
  );

  const settled = await Promise.allSettled(
    providers.map((p) =>
      runProvider({
        provider: p,
        vehicleId: args.vehicleId,
        vin: args.vin,
        vehicleHints: args.vehicleHints,
      }),
    ),
  );

  const results: ProviderResult[] = settled.map((entry, idx) => {
    const provider = providers[idx];
    if (!provider) {
      return {
        status: 'error',
        provider: 'unknown',
        category: 'specs',
        fetchedAt: new Date().toISOString(),
        error: { code: 'NO_PROVIDER', message: 'no provider record' },
      };
    }
    if (entry.status === 'fulfilled') return entry.value;
    return {
      status: 'error',
      provider: provider.name,
      category: provider.category,
      fetchedAt: new Date().toISOString(),
      error: { code: 'EXCEPTION', message: String(entry.reason) },
    };
  });

  const intel: VehicleIntel = {
    vehicleId: args.vehicleId,
    vin: args.vin,
    fetchedAt: new Date().toISOString(),
    results,
    warmedFromCache: false,
  };

  cacheSet(cacheKey, intel, CACHE_TTL_MS.intelComposite);
  return intel;
}

/** Run a single provider for the `:provider` route. */
export async function runOneProvider(
  vehicleId: string,
  providerName: string,
): Promise<ProviderResult | undefined> {
  const provider = getProvider(providerName);
  const vehicle = getVehicle(vehicleId);
  if (!provider || !vehicle) return undefined;
  return runProvider({
    provider,
    vehicleId,
    vin: vehicle.vin,
    vehicleHints: {
      year: vehicle.year,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      bodyStyle: vehicle.body_style,
    },
  });
}
