import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { bootForTests, pickVehicle } from '../test/setup.js';

import { __resetForTests, getBidHistory, placeBid } from './bidEngine.js';
import { updateVehicle } from './vehicleStore.js';

describe('bidEngine.placeBid', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  beforeEach(() => {
    __resetForTests();
  });

  it('rejects bids below the starting bid on an opening auction', () => {
    const v = pickVehicle(0);
    // Force the vehicle into "no opening bid yet" state.
    updateVehicle(v.id, { current_bid: 0, bid_count: 0 });
    const result = placeBid({ vehicleId: v.id, amount: v.starting_bid - 1, source: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('BELOW_STARTING_BID');
    }
  });

  it('accepts opening bid at exactly starting_bid', () => {
    const v = pickVehicle(0);
    updateVehicle(v.id, { current_bid: 0, bid_count: 0 });
    const result = placeBid({ vehicleId: v.id, amount: v.starting_bid, source: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.currentBid).toBe(v.starting_bid);
      expect(result.bidCount).toBe(1);
    }
  });

  it('enforces the max($100, 1% of current) minimum increment', () => {
    const v = pickVehicle(1);
    updateVehicle(v.id, { current_bid: 20_000, bid_count: 4 });
    const tooLow = placeBid({ vehicleId: v.id, amount: 20_050, source: 'user' });
    expect(tooLow.ok).toBe(false);
    if (!tooLow.ok) {
      expect(tooLow.code).toBe('BELOW_MINIMUM');
      expect(tooLow.minNextBid).toBe(20_200);
    }
    const justRight = placeBid({ vehicleId: v.id, amount: 20_200, source: 'user' });
    expect(justRight.ok).toBe(true);
  });

  it('uses $100 floor when 1% of current would be smaller', () => {
    const v = pickVehicle(2);
    updateVehicle(v.id, { current_bid: 1_000, bid_count: 1 });
    const result = placeBid({ vehicleId: v.id, amount: 1_100, source: 'user' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.currentBid).toBe(1_100);
    }
  });

  it('appends bids to history and reports reserve status', () => {
    const v = pickVehicle(3);
    updateVehicle(v.id, {
      current_bid: 0,
      bid_count: 0,
      starting_bid: 20_000,
      reserve_price: 25_000,
    });
    const opening = placeBid({ vehicleId: v.id, amount: 25_000, source: 'user' });
    expect(opening.ok).toBe(true);
    if (opening.ok) {
      expect(opening.reserveMet).toBe(true);
    }
    const history = getBidHistory(v.id);
    expect(history).toHaveLength(1);
    expect(history[0]?.source).toBe('user');
  });

  it('returns VEHICLE_NOT_FOUND for unknown ids', () => {
    const result = placeBid({ vehicleId: 'unknown-id', amount: 1_000, source: 'user' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('does not auto-execute on bot source unless rules pass', () => {
    const v = pickVehicle(4);
    updateVehicle(v.id, { current_bid: 10_000, bid_count: 2 });
    const bad = placeBid({ vehicleId: v.id, amount: 10_050, source: 'bot' });
    expect(bad.ok).toBe(false);
  });
});
