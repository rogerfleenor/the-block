import { seededRng, vinSeed } from '@block/shared';

import type {
  HistoryAutoCheck,
  HistoryCarfax,
  MarketComp,
  MarketComps,
  ProviderCategory,
  ProviderMeta,
  ProviderResult,
  SafetyIihs,
  SafetyNcap,
  SafetyRecalls,
  SocialBundle,
  ValuationGeneric,
  ValuationKbb,
  ValuationManheim,
  Vehicle,
} from '@block/shared';

/**
 * VIN-deterministic mock providers.
 *
 * Each function returns a successful `ProviderResult` (or rare error to
 * exercise graceful-degradation paths). The FE and BE both use these
 * seeded helpers so the FE app under MSW renders the same fake intel
 * the API would for the same VIN.
 */

export interface ProviderDefinition {
  meta: ProviderMeta;
  /** Produce a result for the given vehicle (called per `vinSeed(vin, name)`). */
  build(v: Vehicle): ProviderResult;
}

function ts(): string {
  return new Date().toISOString();
}

function bucket(value: number): { low: number; mid: number; high: number } {
  return {
    low: Math.round(value * 0.92),
    mid: Math.round(value),
    high: Math.round(value * 1.08),
  };
}

function buildKbb(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'kbb'));
  const base = Math.max(8000, v.starting_bid * (1.05 + rng.range(-0.05, 0.18)));
  const data: ValuationKbb = {
    vin: v.vin,
    tradeIn: bucket(base * 0.86),
    privateParty: bucket(base * 0.95),
    retail: bucket(base * 1.1),
    asOf: ts(),
  };
  return { status: 'ok', provider: 'kbb', category: 'valuation', fetchedAt: ts(), data };
}

function buildManheim(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'manheim'));
  const base = Math.max(7500, v.starting_bid * (1.0 + rng.range(-0.03, 0.12)));
  const data: ValuationManheim = {
    vin: v.vin,
    mmrValue: Math.round(base),
    adjustedWholesale: Math.round(base * 0.97),
    averageGrade: Number(v.condition_grade.toFixed(1)),
    averageEVBH: /electric|hybrid/i.test(v.fuel_type) ? Math.round(base * 0.92) : null,
    region: v.province,
    asOf: ts(),
  };
  return { status: 'ok', provider: 'manheim', category: 'valuation', fetchedAt: ts(), data };
}

function buildBlackBook(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'blackbook'));
  const wholesale = Math.round(v.starting_bid * (0.95 + rng.range(-0.05, 0.12)));
  const data: ValuationGeneric = {
    vin: v.vin,
    wholesale,
    retail: Math.round(wholesale * 1.18),
    asOf: ts(),
  };
  return { status: 'ok', provider: 'blackbook', category: 'valuation', fetchedAt: ts(), data };
}

function buildCarfax(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'carfax'));
  const accidents = rng.int(0, 2);
  const owners = rng.int(1, 3);
  const titleBrand = (
    ['clean', 'clean', 'clean', 'rebuilt', 'salvage'] as const
  )[rng.int(0, 4)] ?? 'clean';
  const damageEvents = v.damage_notes.slice(0, 2).map((d, i) => ({
    date: new Date(Date.now() - (i + 1) * 31_536_000_000).toISOString().slice(0, 10),
    severity: i === 0 ? 'minor' : 'moderate',
    description: d,
  }));
  const data: HistoryCarfax = {
    vin: v.vin,
    accidents,
    owners,
    serviceRecords: Array.from({ length: rng.int(2, 6) }, (_, i) => ({
      date: new Date(Date.now() - (i + 1) * 5_184_000_000).toISOString().slice(0, 10),
      odometerKm: Math.max(0, v.odometer_km - rng.int(1000, 8000) * (i + 1)),
      type: rng.pick(['Oil change', 'Brake service', 'Tire rotation', 'Inspection']),
      vendor: rng.pick(['Mr. Lube', 'Canadian Tire', 'Dealer service', 'Independent']),
    })),
    titleBrand,
    damageEvents,
    odometerReadings: [
      { date: ts().slice(0, 10), km: v.odometer_km },
      {
        date: new Date(Date.now() - 31_536_000_000).toISOString().slice(0, 10),
        km: Math.max(0, v.odometer_km - rng.int(12_000, 22_000)),
      },
    ],
    buybackGuarantee: rng.chance(0.6),
  };
  return { status: 'ok', provider: 'carfax', category: 'history', fetchedAt: ts(), data };
}

function buildAutoCheck(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'autocheck'));
  const data: HistoryAutoCheck = {
    vin: v.vin,
    score: rng.int(60, 98),
    accidents: rng.int(0, 2),
    auctionAnnouncements: rng.chance(0.4)
      ? [rng.pick(['Frame damage', 'Hail damage', 'Rebuilt title', 'Lease return'])]
      : [],
  };
  return { status: 'ok', provider: 'autocheck', category: 'history', fetchedAt: ts(), data };
}

function buildRecalls(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'nhtsa_recalls'));
  const openRecalls = rng.chance(0.3)
    ? Array.from({ length: rng.int(1, 2) }, (_, i) => ({
        campaignNumber: `${22 + rng.int(0, 4)}V${rng.int(100, 999)}`,
        reportReceivedDate: new Date(Date.now() - rng.int(30, 720) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        component: rng.pick(['Airbag inflator', 'Fuel pump', 'Brake hose', 'Backup camera']),
        summary: `Issue ${i + 1} affecting ${rng.pick(['certain', 'a subset of', 'select'])} units of the ${v.year} ${v.make} ${v.model}.`,
        remedy: 'Dealers will inspect and replace the affected component free of charge.',
      }))
    : [];
  const data: SafetyRecalls = { vin: v.vin, openRecalls };
  return { status: 'ok', provider: 'nhtsa_recalls', category: 'safety', fetchedAt: ts(), data };
}

function buildNcap(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'nhtsa_ncap'));
  const data: SafetyNcap = {
    year: v.year,
    make: v.make,
    model: v.model,
    overallRating: rng.int(3, 5),
    frontalRating: rng.int(3, 5),
    sideRating: rng.int(3, 5),
    rolloverRating: rng.int(3, 5),
  };
  return { status: 'ok', provider: 'nhtsa_ncap', category: 'safety', fetchedAt: ts(), data };
}

function buildIihs(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'iihs'));
  const pick = () => rng.pick(['Good', 'Acceptable', 'Marginal', 'Poor'] as const);
  const data: SafetyIihs = {
    year: v.year,
    make: v.make,
    model: v.model,
    ratings: {
      smallOverlapFront: pick(),
      moderateOverlapFront: pick(),
      sideImpact: pick(),
      roofStrength: pick(),
      headRestraints: pick(),
    },
    topSafetyPick: rng.chance(0.35),
  };
  return { status: 'ok', provider: 'iihs', category: 'safety', fetchedAt: ts(), data };
}

function buildMarketComps(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'marketcheck'));
  const comps: MarketComp[] = Array.from({ length: rng.int(3, 5) }, (_, i) => {
    const price = Math.round(v.starting_bid * (1.02 + rng.range(-0.08, 0.18)));
    return {
      source: rng.pick(['cars.com', 'autotrader.ca', 'kijiji', 'CarGurus']),
      vin: null,
      year: v.year + rng.int(-1, 1),
      make: v.make,
      model: v.model,
      trim: v.trim,
      odometerKm: Math.max(0, v.odometer_km + rng.int(-12_000, 18_000)),
      price,
      soldAt: new Date(Date.now() - (i + 1) * rng.int(7, 22) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      location: rng.pick([v.province, 'Ontario', 'Quebec', 'British Columbia']),
    };
  });
  const prices = comps.map((c) => c.price).sort((a, b) => a - b);
  const data: MarketComps = {
    comps,
    medianPrice: prices[Math.floor(prices.length / 2)] ?? 0,
    avgDaysOnMarket: rng.int(12, 60),
  };
  return { status: 'ok', provider: 'marketcheck', category: 'market', fetchedAt: ts(), data };
}

function buildSocial(v: Vehicle): ProviderResult {
  const rng = seededRng(vinSeed(v.vin, 'youtube'));
  const data: SocialBundle = {
    videos: Array.from({ length: 3 }, (_, i) => ({
      platform: 'youtube' as const,
      id: `vid${i}_${v.vin.slice(0, 4)}`,
      title: `${v.year} ${v.make} ${v.model} — ${rng.pick(['long-term review', 'common problems', 'buying guide', 'walkaround'])}`,
      channel: rng.pick(['Doug DeMuro', 'Savagegeese', 'The Car Care Nut', 'TFLcar']),
      views: rng.int(8_000, 1_800_000),
      publishedAt: new Date(Date.now() - rng.int(30, 900) * 86_400_000).toISOString(),
      thumbnail: `https://placehold.co/320x180/1a1a2e/eaeaea?text=${encodeURIComponent(`${v.make} ${v.model}`)}`,
      url: `https://example.com/yt/${v.vin.slice(0, 6)}_${i}`,
    })),
    posts: Array.from({ length: 2 }, (_, i) => ({
      platform: 'reddit' as const,
      id: `post${i}_${v.vin.slice(0, 4)}`,
      author: rng.pick(['u/wrenchmonkey', 'u/clutchpedal', 'u/oilchange', 'u/autobahn']),
      excerpt: `Owned a ${v.year} ${v.make} ${v.model} for 2 yrs — ${rng.pick(['reliable daily', 'a few quirks', 'great mileage', 'pricey to insure'])}.`,
      url: `https://example.com/reddit/${v.vin.slice(0, 6)}_${i}`,
      score: rng.int(2, 1200),
      publishedAt: new Date(Date.now() - rng.int(7, 540) * 86_400_000).toISOString(),
    })),
  };
  return { status: 'ok', provider: 'youtube', category: 'social', fetchedAt: ts(), data };
}

/** Registry — keep names + categories in sync with backend `registry.ts`. */
export const PROVIDERS: ProviderDefinition[] = [
  { meta: { name: 'kbb', category: 'valuation', mode: 'mock', ttlMs: 5 * 60_000 }, build: buildKbb },
  {
    meta: { name: 'manheim', category: 'valuation', mode: 'mock', ttlMs: 5 * 60_000 },
    build: buildManheim,
  },
  {
    meta: { name: 'blackbook', category: 'valuation', mode: 'mock', ttlMs: 5 * 60_000 },
    build: buildBlackBook,
  },
  {
    meta: { name: 'carfax', category: 'history', mode: 'mock', ttlMs: 30 * 60_000 },
    build: buildCarfax,
  },
  {
    meta: { name: 'autocheck', category: 'history', mode: 'mock', ttlMs: 30 * 60_000 },
    build: buildAutoCheck,
  },
  {
    meta: { name: 'nhtsa_recalls', category: 'safety', mode: 'mock', ttlMs: 60 * 60_000 },
    build: buildRecalls,
  },
  {
    meta: { name: 'nhtsa_ncap', category: 'safety', mode: 'mock', ttlMs: 60 * 60_000 },
    build: buildNcap,
  },
  { meta: { name: 'iihs', category: 'safety', mode: 'mock', ttlMs: 60 * 60_000 }, build: buildIihs },
  {
    meta: { name: 'marketcheck', category: 'market', mode: 'mock', ttlMs: 5 * 60_000 },
    build: buildMarketComps,
  },
  {
    meta: { name: 'youtube', category: 'social', mode: 'mock', ttlMs: 10 * 60_000 },
    build: buildSocial,
  },
];

export function providersByCategory(category: ProviderCategory): ProviderDefinition[] {
  return PROVIDERS.filter((p) => p.meta.category === category);
}

export function findProvider(name: string): ProviderDefinition | undefined {
  return PROVIDERS.find((p) => p.meta.name === name);
}
