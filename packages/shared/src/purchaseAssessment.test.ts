import { describe, expect, it } from 'vitest';

import { AgentFactSchema } from './agent.js';
import { buildPurchaseAssessment } from './purchaseAssessment.js';
import { VehicleSchema } from './vehicle.js';

describe('buildPurchaseAssessment', () => {
  it('returns a parsed response for a clean high-grade vehicle with room under cap', () => {
    const vehicle = VehicleSchema.parse({
      id: 'v_test',
      vin: '1HGBH41JXMN109186',
      year: 2020,
      make: 'Honda',
      model: 'Civic',
      trim: 'EX',
      body_style: 'Sedan',
      exterior_color: 'Black',
      interior_color: 'Gray',
      engine: '1.5T',
      transmission: 'CVT',
      drivetrain: 'FWD',
      odometer_km: 45000,
      fuel_type: 'gasoline',
      condition_grade: 4.2,
      condition_report: 'Clean',
      damage_notes: [],
      title_status: 'clean',
      province: 'Ontario',
      city: 'Toronto',
      auction_start: new Date().toISOString(),
      starting_bid: 5000,
      reserve_price: 12000,
      buy_now_price: null,
      images: ['https://example.com/a.jpg'],
      selling_dealership: 'Dealer',
      lot: 'L1',
      current_bid: 8000,
      bid_count: 2,
    });
    const facts = [
      AgentFactSchema.parse({
        id: 'f1',
        vehicleId: 'v_test',
        kind: 'valuation_delta',
        text: 'Below MMR by $2,000',
        severity: 'low',
        sources: ['manheim'],
        ts: new Date().toISOString(),
      }),
    ];
    const out = buildPurchaseAssessment({
      vehicleId: 'v_test',
      vehicle,
      facts,
      recommendedValue: 14_000,
    });
    expect(out.verdict).toBe('good_buy');
    expect(out.sentiment).toBe('positive');
    expect(out.confidence).toBeGreaterThanOrEqual(40);
    expect(out.factors.length).toBeGreaterThan(0);
  });
});
