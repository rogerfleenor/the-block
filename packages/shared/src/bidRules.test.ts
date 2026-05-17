import { describe, expect, it } from 'vitest';

import { minIncrement, minNextBid, reserveMet, validateBidAmount } from './bidRules.js';

describe('minIncrement', () => {
  it('is the floor for low bids', () => {
    expect(minIncrement(0)).toBe(100);
    expect(minIncrement(5_000)).toBe(100);
  });
  it('is 1% for larger bids', () => {
    expect(minIncrement(20_000)).toBe(200);
    expect(minIncrement(100_000)).toBe(1_000);
  });
});

describe('minNextBid', () => {
  it('uses starting_bid when there is no current bid', () => {
    expect(minNextBid({ current_bid: 0, starting_bid: 14_500 })).toBe(14_500);
  });
  it('uses current_bid + increment when active', () => {
    expect(minNextBid({ current_bid: 22_800, starting_bid: 14_500 })).toBe(23_028);
  });
});

describe('validateBidAmount', () => {
  it('accepts opening bid at exactly starting_bid', () => {
    const res = validateBidAmount({ current_bid: 0, starting_bid: 14_500 }, 14_500);
    expect(res.ok).toBe(true);
  });
  it('rejects opening bid below starting_bid', () => {
    const res = validateBidAmount({ current_bid: 0, starting_bid: 14_500 }, 14_000);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BELOW_STARTING_BID');
  });
  it('rejects bid below min next', () => {
    const res = validateBidAmount({ current_bid: 22_800, starting_bid: 14_500 }, 22_900);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BELOW_MINIMUM');
  });
  it('accepts bid at exactly min next', () => {
    const res = validateBidAmount({ current_bid: 22_800, starting_bid: 14_500 }, 23_028);
    expect(res.ok).toBe(true);
  });
});

describe('reserveMet', () => {
  it('is true when no reserve', () => {
    expect(reserveMet({ reserve_price: null }, 1)).toBe(true);
  });
  it('is true when current >= reserve', () => {
    expect(reserveMet({ reserve_price: 25_000 }, 25_000)).toBe(true);
    expect(reserveMet({ reserve_price: 25_000 }, 26_000)).toBe(true);
  });
  it('is false when current < reserve', () => {
    expect(reserveMet({ reserve_price: 25_000 }, 24_999)).toBe(false);
  });
});
