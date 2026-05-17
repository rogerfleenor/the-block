/**
 * Compute "fact chips" + the recommendMaxBid number from already-fetched
 * vehicle intel. Kept pure so the router, tools and the GET /api/agent/facts
 * endpoint all share one source of truth.
 */

import {
  AgentFactSchema,
  CACHE_TTL_MS,
  type AgentFact,
  type HistoryCarfax,
  type MarketComps,
  type ProviderResult,
  type SafetyRecalls,
  type ValuationKbb,
  type ValuationManheim,
  type Vehicle,
} from '@block/shared';

import { cacheGet, cacheSet } from '../lib/cache.js';
import { makeId } from '../lib/ids.js';
import { aggregateIntel } from '../services/intelAggregator.js';
import { getVehicle } from '../services/vehicleStore.js';

function findOk<T>(results: ProviderResult[], name: string): T | undefined {
  const hit = results.find((r) => r.provider === name && r.status === 'ok');
  return hit && hit.status === 'ok' ? (hit.data as T) : undefined;
}

export interface RecommendedBid {
  value: number;
  low: number;
  high: number;
  rationale: string;
  sources: string[];
}

export interface ComputedFacts {
  facts: AgentFact[];
  recommended?: RecommendedBid;
  vehicle: Vehicle;
}

const ROUND = 50;
function round(n: number): number {
  return Math.round(n / ROUND) * ROUND;
}

/** Pull cached facts (and compute when missing). */
export async function getFacts(vehicleId: string): Promise<ComputedFacts | undefined> {
  const cacheKey = `facts:${vehicleId}`;
  const cached = cacheGet<ComputedFacts>(cacheKey);
  if (cached) return cached;
  const vehicle = getVehicle(vehicleId);
  if (!vehicle) return undefined;

  const intel = await aggregateIntel({
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

  const facts: AgentFact[] = [];
  const sourcesUsed: Set<string> = new Set();

  const kbb = findOk<ValuationKbb>(intel.results, 'kbb');
  const mmr = findOk<ValuationManheim>(intel.results, 'manheim');
  const market = findOk<MarketComps>(intel.results, 'marketcheck');
  const recalls = findOk<SafetyRecalls>(intel.results, 'nhtsaRecalls');
  const carfax = findOk<HistoryCarfax>(intel.results, 'carfax');

  if (mmr) {
    sourcesUsed.add('manheim');
    const delta = mmr.mmrValue - vehicle.current_bid;
    if (delta > 0) {
      facts.push(
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId,
          kind: 'valuation_delta',
          text: `Below MMR by $${Math.abs(delta).toLocaleString()}`,
          severity: 'low',
          sources: ['manheim'],
          detail: `MMR $${mmr.mmrValue.toLocaleString()} vs current bid $${vehicle.current_bid.toLocaleString()}`,
          ts: new Date().toISOString(),
        }),
      );
    } else if (delta < 0) {
      facts.push(
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId,
          kind: 'valuation_delta',
          text: `Above MMR by $${Math.abs(delta).toLocaleString()}`,
          severity: 'medium',
          sources: ['manheim'],
          detail: `MMR $${mmr.mmrValue.toLocaleString()} vs current bid $${vehicle.current_bid.toLocaleString()}`,
          ts: new Date().toISOString(),
        }),
      );
    }
  }

  if (vehicle.reserve_price !== null) {
    const met = vehicle.current_bid >= vehicle.reserve_price;
    facts.push(
      AgentFactSchema.parse({
        id: makeId('fact'),
        vehicleId,
        kind: 'reserve_likelihood',
        text: met ? 'Reserve met' : 'Reserve not yet met',
        severity: met ? 'low' : 'medium',
        sources: ['internal'],
        ts: new Date().toISOString(),
      }),
    );
  }

  if (market && market.comps.length) {
    sourcesUsed.add('marketcheck');
    const top = market.comps.slice(0, 2);
    facts.push(
      AgentFactSchema.parse({
        id: makeId('fact'),
        vehicleId,
        kind: 'comps_summary',
        text: `${top.length} comps sold ${top
          .map((c) => `$${c.price.toLocaleString()}`)
          .join(' · ')}`,
        severity: 'low',
        sources: ['marketcheck'],
        detail: `Median $${market.medianPrice.toLocaleString()} across ${market.comps.length} listings.`,
        ts: new Date().toISOString(),
      }),
    );
  }

  if (recalls && recalls.openRecalls.length) {
    sourcesUsed.add('nhtsaRecalls');
    facts.push(
      AgentFactSchema.parse({
        id: makeId('fact'),
        vehicleId,
        kind: 'risk',
        text: `Open recall: ${recalls.openRecalls[0]?.component ?? 'unknown'}`,
        severity: 'high',
        sources: ['nhtsaRecalls'],
        detail: recalls.openRecalls[0]?.summary,
        ts: new Date().toISOString(),
      }),
    );
  }

  if (carfax) {
    sourcesUsed.add('carfax');
    if (carfax.titleBrand !== 'clean') {
      facts.push(
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId,
          kind: 'risk',
          text: `Title brand: ${carfax.titleBrand}`,
          severity: 'high',
          sources: ['carfax'],
          ts: new Date().toISOString(),
        }),
      );
    }
    if (carfax.accidents > 0) {
      facts.push(
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId,
          kind: 'risk',
          text: `${carfax.accidents} accident${carfax.accidents > 1 ? 's' : ''} on history`,
          severity: 'medium',
          sources: ['carfax'],
          ts: new Date().toISOString(),
        }),
      );
    }
  }

  let recommended: RecommendedBid | undefined;
  if (kbb && mmr) {
    sourcesUsed.add('kbb');
    sourcesUsed.add('manheim');
    const retailMid = kbb.retail.mid;
    const wholesale = mmr.mmrValue;
    const condition = vehicle.condition_grade;
    const conditionAdj = Math.min(1, Math.max(0.85, 0.85 + condition * 0.03));
    const pressure = Math.min(0.05, vehicle.bid_count * 0.002);
    const cap = 0.95 * retailMid * conditionAdj - pressure * retailMid;
    const value = round(Math.max(wholesale, Math.min(retailMid * conditionAdj, cap)));
    const low = round(Math.max(value * 0.95, mmr.mmrValue * 0.97));
    const high = round(Math.max(value, cap));
    recommended = {
      value,
      low,
      high,
      rationale: `Cap = 0.95 × KBB retail mid × condition adj (${conditionAdj.toFixed(2)}) − bidder pressure (${pressure.toFixed(3)} × retail). Floor honors MMR $${wholesale.toLocaleString()}.`,
      sources: ['kbb', 'manheim'],
    };
    facts.push(
      AgentFactSchema.parse({
        id: makeId('fact'),
        vehicleId,
        kind: 'recommendation',
        text: `AI Max Bid $${value.toLocaleString()}`,
        severity: 'low',
        sources: ['kbb', 'manheim'],
        detail: recommended.rationale,
        ts: new Date().toISOString(),
      }),
    );
  }

  const result: ComputedFacts = { facts, recommended, vehicle };
  cacheSet(cacheKey, result, CACHE_TTL_MS.intelComposite);
  return result;
}

export function clearFactsCache(): void {
  // exported for tests
}
