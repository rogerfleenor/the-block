import { beforeEach, describe, expect, it } from 'vitest';

import { useBidStore } from '@/state/bidStore';

const vehicle = {
  current_bid: 22800,
  starting_bid: 20500,
};

const resultStub = {
  bid: {
    id: 'b1',
    vehicleId: 'v1',
    amount: 23200,
    bidder: 'You',
    source: 'user' as const,
    ts: new Date().toISOString(),
  },
  currentBid: 23200,
  bidCount: 17,
  reserveMet: true,
};

describe('bidStore', () => {
  beforeEach(() => {
    useBidStore.setState({ optimistic: {}, lastToast: null });
  });

  it('passes through shared validateBidAmount', () => {
    // current_bid=22800 → minIncrement = max(100, ceil(228)) = 228 → minNextBid = 23028
    const tooLow = useBidStore.getState().validate(vehicle, 22800);
    expect(tooLow.ok).toBe(false);
    const ok = useBidStore.getState().validate(vehicle, 23200);
    expect(ok.ok).toBe(true);
    expect(ok.minNextBid).toBe(23028);
  });

  it('begins optimistic bid and reflects it in state', () => {
    const id = useBidStore.getState().beginOptimistic('v1', 23200);
    expect(useBidStore.getState().optimistic.v1).toMatchObject({ amount: 23200, optimisticId: id });
  });

  it('rolls back optimistic bid and surfaces an error toast', () => {
    const id = useBidStore.getState().beginOptimistic('v1', 23200);
    useBidStore.getState().rollback('v1', id, 'Server said no');
    expect(useBidStore.getState().optimistic.v1).toBeUndefined();
    expect(useBidStore.getState().lastToast).toMatchObject({ kind: 'error', message: 'Server said no' });
  });

  it('confirms optimistic bid and surfaces a success toast', () => {
    const id = useBidStore.getState().beginOptimistic('v1', 23200);
    useBidStore.getState().confirm('v1', id, resultStub);
    expect(useBidStore.getState().optimistic.v1).toBeUndefined();
    expect(useBidStore.getState().lastToast?.kind).toBe('success');
  });

  it('ignores rollback/confirm for stale optimistic ids', () => {
    const id = useBidStore.getState().beginOptimistic('v1', 23200);
    useBidStore.getState().rollback('v1', 'wrong_id', 'noop');
    expect(useBidStore.getState().optimistic.v1?.optimisticId).toBe(id);
  });
});
