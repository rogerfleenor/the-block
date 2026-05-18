import {
  AgentFactsResponseSchema,
  AgentInvokeRequestSchema,
  AgentInvokeResponseSchema,
  BidHistoryResponseSchema,
  PlaceBidInputSchema,
  PlaceBidResultSchema,
  ProviderListResponseSchema,
  ROUTES,
  VehicleFacetsSchema,
  VehicleIntelSchema,
  VehicleListResponseSchema,
  VehicleQuerySchema,
  VehicleSchema,
  buildPurchaseAssessment,
  minNextBid,
  PurchaseAssessmentResponseSchema,
  reserveMet,
  seededRng,
  validateBidAmount,
  vehicleMatchesQuery,
  vinSeed,
} from '@block/shared';
import { http, HttpResponse } from 'msw';

import { allVehicles, getVehicleById } from './fixtures';
import { findProvider, providersByCategory, PROVIDERS } from './providers';

import type {
  AgentFact,
  AgentInvokeResponse,
  AgentSuggestion,
  Bid,
  BidErrorCode,
  ProviderResult,
  Vehicle,
} from '@block/shared';

import { withPublicPath } from '@/lib/publicPath';


interface BidLedgerEntry {
  bid: Bid;
}

/**
 * In-memory bid ledger that mirrors what the BE keeps. Allows multi-tab
 * BroadcastChannel + WS-style updates to converge to the same result.
 */
const bids = new Map<string, BidLedgerEntry[]>();
function getLedger(id: string): BidLedgerEntry[] {
  let entries = bids.get(id);
  if (!entries) {
    entries = [];
    bids.set(id, entries);
  }
  return entries;
}

function bidIdSeed(): string {
  return `bid_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

function errorEnvelope(
  code: BidErrorCode | 'INVALID_INPUT' | 'NOT_FOUND',
  message: string,
  status: number,
) {
  return HttpResponse.json(
    { code, message, requestId: `mock_${Math.random().toString(36).slice(2, 8)}` },
    { status },
  );
}

function applySort(items: Vehicle[], sort: string): Vehicle[] {
  const copy = items.slice();
  switch (sort) {
    case 'price_asc':
      return copy.sort((a, b) => a.current_bid - b.current_bid);
    case 'price_desc':
      return copy.sort((a, b) => b.current_bid - a.current_bid);
    case 'newest':
      return copy.sort((a, b) => b.year - a.year);
    case 'most_bids':
      return copy.sort((a, b) => b.bid_count - a.bid_count);
    case 'ending_soon':
    default:
      return copy.sort(
        (a, b) => new Date(a.auction_start).getTime() - new Date(b.auction_start).getTime(),
      );
  }
}

function liveVehicle(v: Vehicle): Vehicle {
  const ledger = getLedger(v.id);
  if (ledger.length === 0) return v;
  const last = ledger[ledger.length - 1]!.bid;
  return { ...v, current_bid: last.amount, bid_count: v.bid_count + ledger.length };
}

function buildIntel(
  v: Vehicle,
  categories?: string[],
): ReturnType<typeof VehicleIntelSchema.parse> {
  const allowed = categories && categories.length > 0 ? new Set(categories) : null;
  const results: ProviderResult[] = PROVIDERS.filter(
    (p) => !allowed || allowed.has(p.meta.category),
  ).map((p) => p.build(v));
  return {
    vehicleId: v.id,
    vin: v.vin,
    fetchedAt: new Date().toISOString(),
    results,
    warmedFromCache: false,
  };
}

function factsFor(v: Vehicle): AgentFact[] {
  const rng = seededRng(vinSeed(v.vin, 'agent_facts'));
  const facts: AgentFact[] = [];
  // Valuation delta
  const mmr = PROVIDERS.find((p) => p.meta.name === 'manheim')!.build(v);
  const kbb = PROVIDERS.find((p) => p.meta.name === 'kbb')!.build(v);
  if (mmr.status === 'ok' && kbb.status === 'ok') {
    const mmrValue = (mmr.data as { mmrValue: number }).mmrValue;
    const delta = mmrValue - v.current_bid;
    if (Math.abs(delta) > 250) {
      facts.push({
        id: `fact_val_${v.id}`,
        vehicleId: v.id,
        kind: 'valuation_delta',
        text:
          delta > 0
            ? `Below MMR by $${Math.round(delta).toLocaleString()}`
            : `Above MMR by $${Math.round(-delta).toLocaleString()}`,
        severity: delta > 0 ? 'low' : 'medium',
        sources: ['Manheim MMR', 'KBB'],
        ts: new Date().toISOString(),
      });
    }
  }
  // Reserve likelihood
  if (v.reserve_price !== null) {
    const likely = v.current_bid >= v.reserve_price * 0.85;
    facts.push({
      id: `fact_reserve_${v.id}`,
      vehicleId: v.id,
      kind: 'reserve_likelihood',
      text: reserveMet(v, v.current_bid)
        ? 'Reserve met'
        : likely
          ? 'Reserve likely met soon'
          : 'Reserve not yet met',
      severity: 'low',
      sources: ['Auction telemetry'],
      ts: new Date().toISOString(),
    });
  }
  // Risk fact — title brand or damage cluster
  if (v.title_status !== 'clean' || v.damage_notes.length >= 3) {
    facts.push({
      id: `fact_risk_${v.id}`,
      vehicleId: v.id,
      kind: 'risk',
      text:
        v.title_status !== 'clean'
          ? `Title status: ${v.title_status}`
          : `${v.damage_notes.length} damage notes — inspect carefully`,
      severity: 'high',
      sources: ['CARFAX', 'AutoCheck'],
      detail: v.damage_notes.join('; ') || undefined,
      ts: new Date().toISOString(),
    });
  }
  // Comps summary
  const comps = PROVIDERS.find((p) => p.meta.name === 'marketcheck')!.build(v);
  if (comps.status === 'ok') {
    const data = comps.data as { comps: Array<{ price: number }>; medianPrice: number };
    const top = data.comps
      .slice(0, 2)
      .map((c) => `$${(c.price / 1000).toFixed(1)}k`)
      .join(' · ');
    facts.push({
      id: `fact_comps_${v.id}`,
      vehicleId: v.id,
      kind: 'comps_summary',
      text: `${data.comps.length} comps · median $${(data.medianPrice / 1000).toFixed(1)}k (${top})`,
      severity: 'low',
      sources: ['MarketCheck'],
      ts: new Date().toISOString(),
    });
  }
  // Recommendation
  const recommended = recommendMaxBidValue(v);
  facts.push({
    id: `fact_rec_${v.id}`,
    vehicleId: v.id,
    kind: 'recommendation',
    text: `AI Max Bid: $${recommended.toLocaleString()}`,
    severity: 'low',
    sources: ['KBB', 'MMR', 'Condition', 'Bidder pressure'],
    detail: `Based on KBB retail mid, MMR wholesale, condition grade ${v.condition_grade.toFixed(1)}, bidder pressure ${v.bid_count} bids.`,
    ts: new Date().toISOString(),
  });
  // Touch rng so the seed is realized — keeps shape deterministic when extended.
  rng.next();
  return facts;
}

function recommendMaxBidValue(v: Vehicle): number {
  const kbb = PROVIDERS.find((p) => p.meta.name === 'kbb')!.build(v);
  const mmr = PROVIDERS.find((p) => p.meta.name === 'manheim')!.build(v);
  const retailMid =
    kbb.status === 'ok'
      ? (kbb.data as { retail: { mid: number } }).retail.mid
      : v.starting_bid * 1.2;
  const mmrValue =
    mmr.status === 'ok' ? (mmr.data as { mmrValue: number }).mmrValue : v.starting_bid * 1.1;
  const conditionAdj = 0.85 + (v.condition_grade / 5) * 0.15;
  const bidderPressure = Math.min(0.08, v.bid_count * 0.005);
  const cap = Math.round(((retailMid * 0.95 + mmrValue) / 2) * (conditionAdj - bidderPressure));
  return Math.max(cap, minNextBid(v));
}

function makeSuggestion(v: Vehicle, amount: number): AgentSuggestion {
  return {
    id: `sug_${Math.random().toString(36).slice(2, 10)}`,
    kind: 'placeBid',
    vehicleId: v.id,
    amount,
    rationale: `Suggested based on current bid $${v.current_bid.toLocaleString()} (min next $${minNextBid(v).toLocaleString()}) and AI max $${recommendMaxBidValue(v).toLocaleString()}.`,
    sources: ['KBB', 'MMR', 'Auction telemetry'],
    confirmWindowMs: 5_000,
    ts: new Date().toISOString(),
  };
}

const BID_REGEX = /\bbid\s+\$?([\d,]+(?:\.\d+)?)/i;
const PRICE_REGEX = /\bunder\s+\$?(\d+)\s*k?/i;

function parseAmount(token: string): number {
  return Number(token.replace(/,/g, ''));
}

function routeAgentUtterance(
  utterance: string,
  contextVehicleId: string | undefined,
): AgentInvokeResponse {
  const traceId = `trace_${Math.random().toString(36).slice(2, 10)}`;
  const lower = utterance.toLowerCase();
  const v = contextVehicleId ? getVehicleById(contextVehicleId) : undefined;
  const lv = v ? liveVehicle(v) : undefined;

  const facts: AgentFact[] = lv ? factsFor(lv) : [];
  const suggestions: AgentSuggestion[] = [];
  const actions: AgentInvokeResponse['actions'] = [];
  const toolCalls: AgentInvokeResponse['toolCalls'] = [];
  let reply: string | undefined;

  const bidMatch = BID_REGEX.exec(utterance);
  if (bidMatch && lv) {
    const raw = parseAmount(bidMatch[1]!);
    const amount = raw < 1000 ? Math.round(raw * 1000) : Math.round(raw);
    const validation = validateBidAmount(lv, amount);
    if (validation.ok) {
      suggestions.push(makeSuggestion(lv, amount));
      toolCalls.push({ name: 'placeBid', input: { vehicleId: lv.id, amount } });
      reply = `Proposed bid $${amount.toLocaleString()} — confirm within 5s.`;
    } else {
      reply = validation.message;
      facts.push({
        id: `fact_bid_invalid_${Date.now()}`,
        vehicleId: lv.id,
        kind: 'info',
        text: validation.message,
        severity: 'medium',
        sources: ['Auction engine'],
        ts: new Date().toISOString(),
      });
    }
  } else if (lower.includes('overpriced') || lower.includes('worth')) {
    if (lv) {
      reply = 'Compared the current bid to KBB retail and MMR wholesale — see the chips below.';
    } else {
      reply = 'Open a vehicle to compare against KBB / MMR.';
    }
  } else if (lower.includes('risk') || lower.includes('recall') || lower.includes('title')) {
    if (lv) {
      const risk = facts.find((f) => f.kind === 'risk');
      reply = risk ? risk.text : 'No major risks flagged on this lot.';
    } else {
      reply = 'Open a vehicle and ask about risks.';
    }
  } else if (lower.includes('max bid') || lower.includes('recommend')) {
    if (lv) {
      reply = `AI Max Bid: $${recommendMaxBidValue(lv).toLocaleString()}.`;
    }
  } else if (lower.includes('find') || lower.includes('show') || lower.includes('search')) {
    const filters: Record<string, string | number | undefined> = {};
    const priceMatch = PRICE_REGEX.exec(utterance);
    if (priceMatch) {
      const max = Number(priceMatch[1]);
      filters.maxPrice = utterance.match(/k\b/i) ? max * 1000 : max;
    }
    for (const make of ['toyota', 'honda', 'ford', 'chevrolet', 'mazda', 'tesla', 'bmw', 'ram']) {
      if (lower.includes(make)) {
        filters.make = make.charAt(0).toUpperCase() + make.slice(1);
        break;
      }
    }
    for (const body of ['suv', 'truck', 'sedan', 'hatchback']) {
      if (lower.includes(body)) {
        filters.body = body;
        break;
      }
    }
    actions.push({ kind: 'setFilters', filters });
    toolCalls.push({ name: 'setFilters', input: { filters } });
    reply = 'Applied filters to the inventory.';
  } else {
    reply = 'Try: "bid 24800", "any recalls?", "AI max bid", "find SUVs under 25k".';
  }

  return { traceId, facts, suggestions, actions, toolCalls, reply };
}

export const handlers = [
  http.get(withPublicPath(ROUTES.health), () =>
    HttpResponse.json({ ok: true, ts: new Date().toISOString() }),
  ),
  http.post(withPublicPath(ROUTES.vitals), async ({ request }) => {
    await request.json().catch(() => null);
    return HttpResponse.json({ ok: true });
  }),

  http.get(withPublicPath(ROUTES.vehicleFacets), () => {
    const vs = allVehicles();
    const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
    return HttpResponse.json(
      VehicleFacetsSchema.parse({
        makes: uniq(vs.map((v) => v.make)),
        models: uniq(vs.map((v) => v.model)),
        trims: uniq(vs.map((v) => v.trim)),
        bodyStyles: uniq(vs.map((v) => v.body_style)),
        provinces: uniq(vs.map((v) => v.province)),
        cities: uniq(vs.map((v) => v.city)),
        titleStatuses: uniq(vs.map((v) => v.title_status)),
        transmissions: uniq(vs.map((v) => v.transmission)),
        drivetrains: uniq(vs.map((v) => v.drivetrain)),
        fuelTypes: uniq(vs.map((v) => v.fuel_type)),
        exteriorColors: uniq(vs.map((v) => v.exterior_color)),
        interiorColors: uniq(vs.map((v) => v.interior_color)),
        dealerships: uniq(vs.map((v) => v.selling_dealership)),
      }),
    );
  }),

  http.get(withPublicPath(ROUTES.vehicles), ({ request }) => {
    const url = new URL(request.url);
    const raw: Record<string, string> = {};
    for (const [k, v] of url.searchParams.entries()) {
      raw[k] = v;
    }
    const parsed = VehicleQuerySchema.safeParse(raw);
    if (!parsed.success) {
      return errorEnvelope('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'bad query', 400);
    }
    const q = parsed.data;
    const all = allVehicles().map(liveVehicle);
    const filtered = all.filter((v) => vehicleMatchesQuery(v, q));
    const sorted = applySort(filtered, q.sort);
    const cursorIdx = q.cursor ? Number(q.cursor) || 0 : 0;
    const slice = sorted.slice(cursorIdx, cursorIdx + q.limit);
    const nextIdx = cursorIdx + q.limit;
    const response = VehicleListResponseSchema.parse({
      items: slice,
      total: sorted.length,
      nextCursor: nextIdx < sorted.length ? String(nextIdx) : null,
    });
    return HttpResponse.json(response);
  }),

  http.get(withPublicPath(ROUTES.vehicleById(':id')), ({ params }) => {
    const v = getVehicleById(String(params.id));
    if (!v) return errorEnvelope('NOT_FOUND', 'Vehicle not found', 404);
    return HttpResponse.json(VehicleSchema.parse(liveVehicle(v)));
  }),

  http.get(withPublicPath(ROUTES.bids(':id')), ({ params }) => {
    const ledger = getLedger(String(params.id));
    const response = BidHistoryResponseSchema.parse({ bids: ledger.map((e) => e.bid) });
    return HttpResponse.json(response);
  }),

  http.post(withPublicPath(ROUTES.bids(':id')), async ({ params, request }) => {
    const id = String(params.id);
    const v = getVehicleById(id);
    if (!v) return errorEnvelope('VEHICLE_NOT_FOUND', 'Vehicle not found', 404);
    const live = liveVehicle(v);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorEnvelope('INVALID_INPUT', 'Body must be JSON', 400);
    }
    const parsed = PlaceBidInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorEnvelope('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'bad body', 400);
    }
    const validation = validateBidAmount(live, parsed.data.amount);
    if (!validation.ok) {
      return errorEnvelope(validation.code, validation.message, 400);
    }
    const bid: Bid = {
      id: bidIdSeed(),
      vehicleId: id,
      amount: parsed.data.amount,
      bidder: parsed.data.bidder ?? 'You',
      source: 'user',
      ts: new Date().toISOString(),
    };
    getLedger(id).push({ bid });
    const updated = liveVehicle(v);
    const result = PlaceBidResultSchema.parse({
      bid,
      currentBid: updated.current_bid,
      bidCount: updated.bid_count,
      reserveMet: reserveMet(v, updated.current_bid),
    });
    return HttpResponse.json(result);
  }),

  http.get(withPublicPath(ROUTES.intel(':id')), ({ params, request }) => {
    const v = getVehicleById(String(params.id));
    if (!v) return errorEnvelope('NOT_FOUND', 'Vehicle not found', 404);
    const cats = new URL(request.url).searchParams.get('categories');
    const list = cats
      ? cats
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean)
      : undefined;
    return HttpResponse.json(VehicleIntelSchema.parse(buildIntel(liveVehicle(v), list)));
  }),

  http.get(withPublicPath(ROUTES.intelByProvider(':id', ':provider')), ({ params }) => {
    const v = getVehicleById(String(params.id));
    if (!v) return errorEnvelope('NOT_FOUND', 'Vehicle not found', 404);
    const provider = findProvider(String(params.provider));
    if (!provider) return errorEnvelope('NOT_FOUND', 'Provider not found', 404);
    return HttpResponse.json(provider.build(liveVehicle(v)));
  }),

  http.get(withPublicPath(ROUTES.providers), () =>
    HttpResponse.json(
      ProviderListResponseSchema.parse({ providers: PROVIDERS.map((p) => p.meta) }),
    ),
  ),

  http.post(withPublicPath(ROUTES.agentInvoke), async ({ request }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorEnvelope('INVALID_INPUT', 'Body must be JSON', 400);
    }
    const parsed = AgentInvokeRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorEnvelope('INVALID_INPUT', parsed.error.issues[0]?.message ?? 'bad body', 400);
    }
    const out = routeAgentUtterance(parsed.data.utterance, parsed.data.context?.vehicleId);
    return HttpResponse.json(AgentInvokeResponseSchema.parse(out));
  }),

  http.get(withPublicPath(ROUTES.agentFacts(':id')), ({ params }) => {
    const v = getVehicleById(String(params.id));
    if (!v) return errorEnvelope('NOT_FOUND', 'Vehicle not found', 404);
    const facts = factsFor(liveVehicle(v));
    return HttpResponse.json(
      AgentFactsResponseSchema.parse({
        vehicleId: v.id,
        facts,
        fetchedAt: new Date().toISOString(),
      }),
    );
  }),

  http.get(withPublicPath(ROUTES.agentPurchaseAssessment(':id')), ({ params }) => {
    const v = getVehicleById(String(params.id));
    if (!v) return errorEnvelope('NOT_FOUND', 'Vehicle not found', 404);
    const lv = liveVehicle(v);
    const facts = factsFor(lv);
    const payload = buildPurchaseAssessment({
      vehicleId: lv.id,
      vehicle: lv,
      facts,
      recommendedValue: recommendMaxBidValue(lv),
    });
    return HttpResponse.json(PurchaseAssessmentResponseSchema.parse(payload));
  }),
];

export const __test = {
  resetBids() {
    bids.clear();
  },
  providersByCategory,
};
