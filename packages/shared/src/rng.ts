/**
 * Deterministic PRNG used by both api provider mocks and web MSW mocks.
 * Same seed → same sequence. Same VIN → same fake report.
 */

/** mulberry32 — small, fast, good-enough determinism for fixtures. */
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a 32-bit hash — turns a string into a seed. */
export function hashSeed(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded helpers built on top of a `next` function. */
export interface SeededRng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  range(min: number, max: number): number;
  /** Pick one element. Throws on empty array. */
  pick<T>(arr: readonly T[]): T;
  /** Bernoulli trial. */
  chance(probability: number): boolean;
}

export function seededRng(seed: string | number): SeededRng {
  const numeric = typeof seed === 'number' ? seed : hashSeed(seed);
  const next = mulberry32(numeric);
  return {
    next,
    int(min, max) {
      return Math.floor(next() * (max - min + 1)) + min;
    },
    range(min, max) {
      return next() * (max - min) + min;
    },
    pick(arr) {
      if (arr.length === 0) throw new Error('seededRng.pick: empty array');
      const idx = Math.floor(next() * arr.length);

      return arr[idx]!;
    },
    chance(probability) {
      return next() < probability;
    },
  };
}

/** Combine a VIN with a provider name into a stable seed. */
export function vinSeed(vin: string, providerName: string): number {
  return hashSeed(`${vin}::${providerName}`);
}
