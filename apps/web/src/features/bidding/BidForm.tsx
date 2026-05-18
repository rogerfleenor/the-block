import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { PlaceBidResult, Vehicle } from '@block/shared';

import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { getWsClient } from '@/lib/ws';
import { useBidStore } from '@/state/bidStore';
import { Button } from '@/ui/Button';

interface BidFormProps {
  vehicle: Vehicle;
  /** Used by SmartBidBar to prefill amount. */
  prefilledAmount?: number;
  onPlaced?: (result: PlaceBidResult) => void;
}

/**
 * Hand-rolled state + shared `validateBidAmount` (no react-hook-form, no
 * @hookform/resolvers). Saves ~12 KB gz from the bundle vs. the original
 * RHF wiring. Server is still authoritative: this rejects the same inputs
 * as `apps/api/src/services/bidEngine.ts` because both call the same helper
 * from `@block/shared`.
 */
export function BidForm({ vehicle, prefilledAmount, onPlaced }: BidFormProps) {
  const validateFn = useBidStore((s) => s.validate);
  const beginOptimistic = useBidStore((s) => s.beginOptimistic);
  const rollback = useBidStore((s) => s.rollback);
  const confirm = useBidStore((s) => s.confirm);
  const qc = useQueryClient();

  const defaultAmount =
    prefilledAmount ??
    Math.max(
      vehicle.starting_bid,
      vehicle.current_bid + Math.max(100, Math.ceil(vehicle.current_bid * 0.01)),
    );

  const [amountStr, setAmountStr] = useState<string>(String(defaultAmount));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (prefilledAmount && prefilledAmount > 0) {
      setAmountStr(String(prefilledAmount));
      setTouched(true);
    }
  }, [prefilledAmount]);

  const amountNum = Number(amountStr) || 0;
  const validation = validateFn(vehicle, amountNum);
  const showError = touched && !validation.ok;

  const mutation = useMutation({
    mutationFn: async (amount: number) => api.placeBid(vehicle.id, { amount }),
    onMutate: (amount: number) => {
      const optimisticId = beginOptimistic(vehicle.id, amount);
      return { optimisticId };
    },
    onError: (err, _amount, ctx) => {
      const message = err instanceof Error ? err.message : 'Bid failed';
      if (ctx?.optimisticId) rollback(vehicle.id, ctx.optimisticId, message);
    },
    onSuccess: (result, _amount, ctx) => {
      if (ctx?.optimisticId) confirm(vehicle.id, ctx.optimisticId, result);
      qc.invalidateQueries({ queryKey: queryKeys.vehicle(vehicle.id) });
      qc.invalidateQueries({ queryKey: queryKeys.bids(vehicle.id) });
      qc.invalidateQueries({ queryKey: ['vehicles'] });
      getWsClient().broadcastLocal({
        type: 'bid:updated',
        vehicleId: vehicle.id,
        currentBid: result.currentBid,
        bidCount: result.bidCount,
        reserveMet: result.reserveMet,
        source: 'user',
        ts: result.bid.ts,
      });
      onPlaced?.(result);
      const nextMin = result.currentBid + Math.max(100, Math.ceil(result.currentBid * 0.01));
      setAmountStr(String(nextMin));
      setTouched(false);
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!validation.ok) return;
    mutation.mutate(amountNum);
  };

  return (
    <form className="space-y-2" onSubmit={onSubmit} noValidate>
      <label
        htmlFor={`bid-amount-${vehicle.id}`}
        className="block text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        Your bid
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 dark:border-slate-700 dark:bg-slate-900">
        <span aria-hidden="true" className="text-slate-500">
          $
        </span>
        <input
          id={`bid-amount-${vehicle.id}`}
          name="amount"
          type="number"
          inputMode="decimal"
          step={100}
          min={validation.minNextBid}
          value={amountStr}
          onChange={(e) => setAmountStr(e.target.value)}
          onBlur={() => setTouched(true)}
          className="flex-1 bg-transparent py-2 text-base outline-none"
          aria-invalid={showError}
          aria-describedby={`bid-help-${vehicle.id}`}
        />
      </div>
      <p id={`bid-help-${vehicle.id}`} className="text-[11px] text-slate-500">
        Min next bid: <strong>{formatCurrency(validation.minNextBid)}</strong>
      </p>
      {showError && !validation.ok ? (
        <p role="alert" className="text-xs text-red-600">
          {validation.message}
        </p>
      ) : null}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        full
        disabled={mutation.isPending || !validation.ok}
      >
        {mutation.isPending ? 'Placing…' : 'Place Bid'}
      </Button>
      {vehicle.buy_now_price ? (
        <Button
          type="button"
          variant="secondary"
          size="md"
          full
          onClick={() => mutation.mutate(vehicle.buy_now_price!)}
        >
          Buy Now {formatCurrency(vehicle.buy_now_price)}
        </Button>
      ) : null}
    </form>
  );
}
