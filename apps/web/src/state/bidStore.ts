import { validateBidAmount } from '@block/shared';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { BidValidation, PlaceBidResult, Vehicle } from '@block/shared';

interface OptimisticBid {
  vehicleId: string;
  amount: number;
  ts: string;
  /** Random id so we can roll back on rejection. */
  optimisticId: string;
}

interface BidState {
  /** Per-vehicle optimistic state — temporarily reflected before server confirms. */
  optimistic: Record<string, OptimisticBid | undefined>;
  /** Last toast message — drives a banner the page can render. */
  lastToast: { kind: 'success' | 'error'; message: string } | null;
}

interface BidActions {
  validate(vehicle: Pick<Vehicle, 'current_bid' | 'starting_bid'>, amount: number): BidValidation;
  beginOptimistic(vehicleId: string, amount: number): string;
  rollback(vehicleId: string, optimisticId: string, message: string): void;
  confirm(vehicleId: string, optimisticId: string, result: PlaceBidResult): void;
  clearToast(): void;
}

export const useBidStore = create<BidState & BidActions>()(
  persist(
    (set) => ({
      optimistic: {},
      lastToast: null,
      validate(vehicle, amount) {
        return validateBidAmount(vehicle, amount);
      },
      beginOptimistic(vehicleId, amount) {
        const optimisticId = `optim_${Math.random().toString(36).slice(2, 10)}`;
        set((state) => ({
          optimistic: {
            ...state.optimistic,
            [vehicleId]: { vehicleId, amount, ts: new Date().toISOString(), optimisticId },
          },
          lastToast: null,
        }));
        return optimisticId;
      },
      rollback(vehicleId, optimisticId, message) {
        set((state) => {
          const current = state.optimistic[vehicleId];
          if (!current || current.optimisticId !== optimisticId) return {};
          const next = { ...state.optimistic };
          delete next[vehicleId];
          return { optimistic: next, lastToast: { kind: 'error', message } };
        });
      },
      confirm(vehicleId, optimisticId, result) {
        set((state) => {
          const current = state.optimistic[vehicleId];
          if (!current || current.optimisticId !== optimisticId) return {};
          const next = { ...state.optimistic };
          delete next[vehicleId];
          return {
            optimistic: next,
            lastToast: {
              kind: 'success',
              message: `Bid accepted at $${result.currentBid.toLocaleString()}.`,
            },
          };
        });
      },
      clearToast() {
        set({ lastToast: null });
      },
    }),
    {
      name: 'block.bid',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ optimistic: state.optimistic }),
      version: 1,
    },
  ),
);
