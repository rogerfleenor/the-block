/**
 * Tiny TTL cache backed by an in-memory Map.
 * Single-process only — matches the "no database" stance.
 */

interface Entry<V> {
  value: V;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<V>(key: string): V | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return undefined;
  }
  return entry.value as V;
}

export function cacheSet<V>(key: string, value: V, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheHas(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    store.delete(key);
    return false;
  }
  return true;
}

export function cacheDelete(key: string): void {
  store.delete(key);
}

export function cacheClear(): void {
  store.clear();
}

/**
 * Convenience wrapper: stale-on-miss, fresh-on-hit.
 * The `loader` only runs when the key is absent / expired.
 */
export async function withCache<V>(
  key: string,
  ttlMs: number,
  loader: () => Promise<V>,
): Promise<{ value: V; hit: boolean }> {
  const cached = cacheGet<V>(key);
  if (cached !== undefined) {
    return { value: cached, hit: true };
  }
  const value = await loader();
  cacheSet(key, value, ttlMs);
  return { value, hit: false };
}
