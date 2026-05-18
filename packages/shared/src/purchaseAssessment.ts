import { z } from 'zod';

import type { AgentFact } from './agent.js';
import type { Vehicle } from './vehicle.js';

export const PurchaseAssessmentTiltSchema = z.enum(['positive', 'negative', 'neutral']);
export type PurchaseAssessmentTilt = z.infer<typeof PurchaseAssessmentTiltSchema>;

export const PurchaseAssessmentFactorSchema = z.object({
  label: z.string(),
  tilt: PurchaseAssessmentTiltSchema,
  detail: z.string(),
});
export type PurchaseAssessmentFactor = z.infer<typeof PurchaseAssessmentFactorSchema>;

export const PurchaseAssessmentVerdictSchema = z.enum(['good_buy', 'caution', 'bad_buy']);
export type PurchaseAssessmentVerdict = z.infer<typeof PurchaseAssessmentVerdictSchema>;

export const PurchaseAssessmentSentimentSchema = z.enum(['positive', 'mixed', 'negative']);
export type PurchaseAssessmentSentiment = z.infer<typeof PurchaseAssessmentSentimentSchema>;

export const PurchaseAssessmentResponseSchema = z.object({
  vehicleId: z.string(),
  verdict: PurchaseAssessmentVerdictSchema,
  sentiment: PurchaseAssessmentSentimentSchema,
  /** 0–100: model certainty from breadth of signals (not a price guarantee). */
  confidence: z.number().int().min(0).max(100),
  headline: z.string(),
  summary: z.string(),
  factors: z.array(PurchaseAssessmentFactorSchema),
  fetchedAt: z.string(),
});
export type PurchaseAssessmentResponse = z.infer<typeof PurchaseAssessmentResponseSchema>;

export interface BuildPurchaseAssessmentInput {
  vehicleId: string;
  vehicle: Vehicle;
  facts: AgentFact[];
  /** AI cap from valuation stack; omit if unavailable. */
  recommendedValue?: number;
}

function pushFactor(
  factors: PurchaseAssessmentFactor[],
  label: string,
  tilt: PurchaseAssessmentTilt,
  detail: string,
  dedupe: Set<string>,
) {
  const key = `${label}:${detail}`;
  if (dedupe.has(key)) return;
  dedupe.add(key);
  factors.push({ label, tilt, detail });
}

/**
 * Deterministic “AuctionAgent” buy tilt from vehicle row + the same fact chips
 * used elsewhere (valuation, risks, reserve, comps, recommendation).
 */
export function buildPurchaseAssessment(
  input: BuildPurchaseAssessmentInput,
): PurchaseAssessmentResponse {
  const { vehicleId, vehicle, facts } = input;
  let recommendedValue = input.recommendedValue;
  if (recommendedValue === undefined) {
    const rec = facts.find((f) => f.kind === 'recommendation');
    if (rec) {
      const m = /\$([\d,]+)/.exec(rec.text);
      if (m) recommendedValue = Number(m[1]!.replace(/,/g, ''));
    }
  }

  let score = 56;
  const factors: PurchaseAssessmentFactor[] = [];
  const dedupe = new Set<string>();

  const title = vehicle.title_status.toLowerCase();
  if (title.includes('clean') || title.includes('clear')) {
    score += 4;
    pushFactor(
      factors,
      'Title',
      'positive',
      `${vehicle.title_status} — no branded-title flag in our stack.`,
      dedupe,
    );
  } else {
    score -= 24;
    pushFactor(
      factors,
      'Title',
      'negative',
      `Title reads “${vehicle.title_status}” — wholesale caution.`,
      dedupe,
    );
  }

  if (vehicle.condition_grade >= 3.6) {
    score += 10;
    pushFactor(
      factors,
      'Condition',
      'positive',
      `Grade ${vehicle.condition_grade.toFixed(1)} / 5 supports retail-quality expectations.`,
      dedupe,
    );
  } else if (vehicle.condition_grade <= 2.4) {
    score -= 12;
    pushFactor(
      factors,
      'Condition',
      'negative',
      `Grade ${vehicle.condition_grade.toFixed(1)} / 5 — expect reconditioning cost.`,
      dedupe,
    );
  } else {
    pushFactor(
      factors,
      'Condition',
      'neutral',
      `Grade ${vehicle.condition_grade.toFixed(1)} / 5 is middle of the lane.`,
      dedupe,
    );
  }

  if (vehicle.damage_notes.length >= 4) {
    score -= 8;
    pushFactor(
      factors,
      'Damage notes',
      'negative',
      `${vehicle.damage_notes.length} notes on file — verify in person or CR.`,
      dedupe,
    );
  } else if (vehicle.damage_notes.length === 0) {
    score += 3;
    pushFactor(
      factors,
      'Damage notes',
      'positive',
      'No structured damage callouts in the feed.',
      dedupe,
    );
  }

  if (vehicle.bid_count >= 18) {
    score -= 6;
    pushFactor(
      factors,
      'Auction heat',
      'negative',
      `${vehicle.bid_count} bids — thin margin for late entrants.`,
      dedupe,
    );
  } else if (vehicle.bid_count <= 3) {
    score += 4;
    pushFactor(
      factors,
      'Auction heat',
      'positive',
      `Only ${vehicle.bid_count} bids so far — room to negotiate the stack.`,
      dedupe,
    );
  }

  for (const f of facts) {
    if (f.kind === 'risk') {
      if (f.severity === 'high') {
        score -= 20;
        pushFactor(factors, 'Risk signal', 'negative', f.text, dedupe);
      } else if (f.severity === 'medium') {
        score -= 10;
        pushFactor(factors, 'Risk signal', 'negative', f.text, dedupe);
      } else {
        score -= 4;
        pushFactor(factors, 'Risk signal', 'neutral', f.text, dedupe);
      }
    } else if (f.kind === 'valuation_delta') {
      if (f.text.includes('Below MMR')) {
        score += 12;
        pushFactor(factors, 'Valuation', 'positive', f.text, dedupe);
      } else if (f.text.includes('Above MMR')) {
        score -= 10;
        pushFactor(factors, 'Valuation', 'negative', f.text, dedupe);
      } else {
        pushFactor(factors, 'Valuation', 'neutral', f.text, dedupe);
      }
    } else if (f.kind === 'reserve_likelihood') {
      if (f.text.includes('not') && f.text.toLowerCase().includes('reserve')) {
        score -= 3;
        pushFactor(factors, 'Reserve', 'neutral', f.text, dedupe);
      } else {
        score += 2;
        pushFactor(factors, 'Reserve', 'positive', f.text, dedupe);
      }
    } else if (f.kind === 'comps_summary') {
      score += 2;
      pushFactor(factors, 'Market comps', 'positive', f.text, dedupe);
    }
  }

  if (recommendedValue !== undefined && recommendedValue > 0) {
    const ratio = vehicle.current_bid / recommendedValue;
    if (ratio < 0.88) {
      score += 9;
      pushFactor(
        factors,
        'Bid vs AI cap',
        'positive',
        `Current bid is below modeled cap ($${recommendedValue.toLocaleString()}).`,
        dedupe,
      );
    } else if (ratio > 1.02) {
      score -= 14;
      pushFactor(
        factors,
        'Bid vs AI cap',
        'negative',
        `Current bid exceeds modeled wholesale cap ($${recommendedValue.toLocaleString()}).`,
        dedupe,
      );
    } else {
      pushFactor(
        factors,
        'Bid vs AI cap',
        'neutral',
        `Current bid is near modeled cap ($${recommendedValue.toLocaleString()}).`,
        dedupe,
      );
    }
  } else {
    pushFactor(
      factors,
      'Data coverage',
      'neutral',
      'No full KBB+MMR cap in this snapshot — confidence is capped.',
      dedupe,
    );
  }

  const s = Math.max(0, Math.min(100, Math.round(score)));
  let verdict: PurchaseAssessmentVerdict;
  if (s >= 64) verdict = 'good_buy';
  else if (s >= 43) verdict = 'caution';
  else verdict = 'bad_buy';

  const sentiment: PurchaseAssessmentSentiment =
    verdict === 'good_buy' ? 'positive' : verdict === 'caution' ? 'mixed' : 'negative';

  let confidence =
    40 +
    Math.min(26, facts.length * 3) +
    (recommendedValue !== undefined && recommendedValue > 0 ? 14 : 0) +
    (facts.some((f) => f.kind === 'valuation_delta') ? 8 : 0) +
    (facts.some((f) => f.kind === 'risk') ? 6 : 0);
  confidence = Math.min(96, Math.max(41, Math.round(confidence)));

  const headline =
    verdict === 'good_buy'
      ? 'Leans favorable at this price'
      : verdict === 'caution'
        ? 'Mixed signals — size your risk'
        : 'Elevated risk vs. the bid stack';

  const summary =
    verdict === 'good_buy'
      ? `AuctionAgent reads the lot as a better-than-average wholesale opportunity given title, condition, bids, and valuation telemetry. The ${confidence}% confidence score reflects how many independent signals agreed — not a guarantee of profit.`
      : verdict === 'caution'
        ? `Signals disagree in places (title, condition, MMR gap, or heat). Treat as a work-the-math lane: validate CR, transport, and recon before stretching. Model confidence ${confidence}%.`
        : `Multiple negative tilts (title, condition, valuation, or risks) outweigh positives. Unless you have a clear retail exit or recon margin, this skews toward avoid or a deep discount. Confidence ${confidence}%.`;

  const sortedFactors = factors
    .sort((a, b) => {
      const rank = (t: PurchaseAssessmentTilt) => (t === 'negative' ? 0 : t === 'neutral' ? 1 : 2);
      return rank(a.tilt) - rank(b.tilt);
    })
    .slice(0, 8);

  return PurchaseAssessmentResponseSchema.parse({
    vehicleId,
    verdict,
    sentiment,
    confidence,
    headline,
    summary,
    factors: sortedFactors,
    fetchedAt: new Date().toISOString(),
  });
}
