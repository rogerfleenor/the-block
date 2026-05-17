import { seededRng, vinSeed, type SeededRng } from '@block/shared';

/**
 * Internal helpers shared across provider mocks. Kept tiny on purpose:
 * each mock is its own file, but date / pricing / picklist routines deserve
 * one home so we don't drift.
 */

export function fmtDate(d: Date): string {
  return d.toISOString();
}

/**
 * Reference epoch used by all deterministic "X days ago" mocks. Fixed so
 * the determinism test (and reviewer demos) get byte-equal results no
 * matter when the test suite is run.
 */
export const REFERENCE_EPOCH_MS = Date.UTC(2026, 5, 1, 12, 0, 0);

export function daysAgo(rng: SeededRng, minDays: number, maxDays: number): Date {
  const days = rng.int(minDays, maxDays);
  return new Date(REFERENCE_EPOCH_MS - days * 86_400_000);
}

/** Build a baseline market value (USD) deterministically from VIN + year. */
export function baseValue(vin: string, year: number): number {
  const rng = seededRng(vinSeed(vin, 'baseline'));
  const ageYears = Math.max(0, new Date().getFullYear() - year);
  const newPrice = rng.int(22_000, 65_000);
  const depreciated = newPrice * Math.pow(0.87, ageYears);
  return Math.max(2_500, Math.round(depreciated / 100) * 100);
}

export function priceBand(center: number, spread = 0.06): { low: number; mid: number; high: number } {
  return {
    low: Math.round((center * (1 - spread)) / 50) * 50,
    mid: Math.round(center / 50) * 50,
    high: Math.round((center * (1 + spread)) / 50) * 50,
  };
}

const MAKE_SOCIAL_HANDLES: Record<string, string> = {
  Toyota: 'Toyota USA',
  Ford: 'Ford Motor Company',
  Honda: 'Honda',
  Chevrolet: 'Chevy',
  BMW: 'BMW',
  Tesla: 'Tesla Motors',
  Mazda: 'Mazda USA',
  Volkswagen: 'Volkswagen',
  Subaru: 'Subaru of America',
};

export function brandChannel(make: string | undefined): string {
  if (!make) return 'AutoChannel';
  return MAKE_SOCIAL_HANDLES[make] ?? `${make} Owners Club`;
}

export function pickOne<T>(rng: SeededRng, arr: readonly T[]): T {
  return rng.pick(arr);
}
