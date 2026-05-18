import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { SmartBidBar } from '../agent/SmartBidBar';

import { ReserveBadge } from './ReserveBadge';

import type { PlaceBidResult, Vehicle } from '@block/shared';

import { api } from '@/lib/api';
import { formatCompactCurrency, formatCurrency } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { getWsClient } from '@/lib/ws';
import { useBidStore } from '@/state/bidStore';
import { Button } from '@/ui/Button';

export interface BidFormDockSummary {
  displayedCurrent: number;
  bidCount: number;
  endsMeta: string;
  optimisticPending?: boolean;
}

interface BidFormProps {
  vehicle: Vehicle;
  /** Used by SmartBidBar to prefill amount. */
  prefilledAmount?: number;
  onPlaced?: (result: PlaceBidResult) => void;
  /** Tighter layout for the mobile fixed bid bar. */
  dense?: boolean;
  /** Single-row toolbar used inside `AuctionAgentDock`. */
  dock?: boolean;
  dockSummary?: BidFormDockSummary;
  onSmartBidPrefill?: (amount: number) => void;
}

/**
 * Hand-rolled state + shared `validateBidAmount` (no react-hook-form, no
 * @hookform/resolvers). Saves ~12 KB gz from the bundle vs. the original
 * RHF wiring. Server is still authoritative: this rejects the same inputs
 * as `apps/api/src/services/bidEngine.ts` because both call the same helper
 * from `@block/shared`.
 */
export function BidForm({
  vehicle,
  prefilledAmount,
  onPlaced,
  dense = false,
  dock = false,
  dockSummary,
  onSmartBidPrefill,
}: BidFormProps) {
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

  const effectiveDense = dense || dock;
  const inputWrapClass = effectiveDense
    ? 'flex min-h-[2.25rem] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30 dark:border-slate-700 dark:bg-slate-900'
    : 'flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 dark:border-slate-700 dark:bg-slate-900';

  const inputClass = effectiveDense
    ? 'min-h-0 min-w-0 flex-1 bg-transparent py-1 text-sm outline-none'
    : 'flex-1 bg-transparent py-2 text-base outline-none';

  if (dock && dockSummary) {
    const ds = dockSummary;
    const dockInputWrap =
      'flex min-h-[2.75rem] min-w-0 flex-1 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25 dark:border-slate-600 dark:bg-slate-900';

    return (
      <form className="flex flex-col gap-1.5" onSubmit={onSubmit} noValidate>
        <p id={`bid-panel-${vehicle.id}`} className="sr-only">
          Current bid {formatCurrency(ds.displayedCurrent)}. {ds.bidCount}{' '}
          {ds.bidCount === 1 ? 'bid' : 'bids'}. {ds.endsMeta}.
        </p>

        {/* Row 1: price (left) · activity (right) */}
        <div className="flex items-baseline justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <span
              className="truncate text-lg font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-50"
              title={formatCurrency(ds.displayedCurrent)}
            >
              {formatCurrency(ds.displayedCurrent)}
            </span>
            {ds.optimisticPending ? (
              <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                pending
              </span>
            ) : null}
          </div>
          <span
            className="shrink-0 text-right text-xs leading-snug text-slate-500"
            title={`${ds.bidCount} ${ds.bidCount === 1 ? 'bid' : 'bids'} · ${ds.endsMeta}`}
          >
            {ds.bidCount} {ds.bidCount === 1 ? 'bid' : 'bids'} · {ds.endsMeta}
          </span>
        </div>

        {/* Row 2: AI max · reserve · min bid */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-1">
          <div className="min-w-0 justify-self-start">
            <SmartBidBar
              compact
              vehicleId={vehicle.id}
              onPrefill={(amt) => {
                onSmartBidPrefill?.(amt);
              }}
            />
          </div>
          <div className="justify-self-center px-1">
            <ReserveBadge
              reserve={vehicle.reserve_price}
              currentBid={ds.displayedCurrent}
              className="text-[10px] leading-tight"
            />
          </div>
          <p
            id={`bid-help-${vehicle.id}`}
            className="justify-self-end text-right text-xs leading-snug text-slate-500"
          >
            Min:{' '}
            <strong className="font-medium tabular-nums text-slate-700 dark:text-slate-300">
              {formatCurrency(validation.minNextBid)}
            </strong>
          </p>
        </div>

        {/* Row 3: amount · Bid · Buy */}
        <div className="flex min-w-0 items-center gap-2">
          <label htmlFor={`bid-amount-${vehicle.id}`} className="sr-only">
            Your bid
          </label>
          <div className={dockInputWrap}>
            <span aria-hidden="true" className="shrink-0 text-slate-500">
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
              className={`${inputClass} min-w-0`}
              aria-invalid={showError}
              aria-describedby={`bid-help-${vehicle.id}`}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 px-5"
            disabled={mutation.isPending || !validation.ok}
          >
            {mutation.isPending ? '…' : 'Bid'}
          </Button>
          {vehicle.buy_now_price ? (
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="shrink-0 px-3 text-xs"
              onClick={() => mutation.mutate(vehicle.buy_now_price!)}
            >
              Buy {formatCompactCurrency(vehicle.buy_now_price)}
            </Button>
          ) : null}
        </div>

        {showError && !validation.ok ? (
          <p role="alert" className="text-[11px] leading-snug text-red-600">
            {validation.message}
          </p>
        ) : null}
      </form>
    );
  }

  if (dense) {
    return (
      <form className="space-y-1" onSubmit={onSubmit} noValidate>
        <div className="flex items-stretch gap-2">
          <div className="min-w-0 flex-1">
            <label htmlFor={`bid-amount-${vehicle.id}`} className="sr-only">
              Your bid
            </label>
            <div className={inputWrapClass}>
              <span aria-hidden="true" className="shrink-0 text-slate-500">
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
                className={inputClass}
                aria-invalid={showError}
                aria-describedby={`bid-help-${vehicle.id}`}
              />
            </div>
          </div>
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="shrink-0 self-center px-4"
            disabled={mutation.isPending || !validation.ok}
          >
            {mutation.isPending ? '…' : 'Bid'}
          </Button>
        </div>
        <div className="flex items-start justify-between gap-2">
          <p
            id={`bid-help-${vehicle.id}`}
            className="min-w-0 text-[10px] leading-snug text-slate-500"
          >
            Min: <strong className="tabular-nums">{formatCurrency(validation.minNextBid)}</strong>
          </p>
          {vehicle.buy_now_price ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 px-2.5 text-[10px] font-semibold leading-tight"
              onClick={() => mutation.mutate(vehicle.buy_now_price!)}
            >
              Buy {formatCompactCurrency(vehicle.buy_now_price)}
            </Button>
          ) : null}
        </div>
        {showError && !validation.ok ? (
          <p role="alert" className="text-[11px] text-red-600">
            {validation.message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form className="space-y-2" onSubmit={onSubmit} noValidate>
      <label
        htmlFor={`bid-amount-${vehicle.id}`}
        className="block text-xs font-medium text-slate-600 dark:text-slate-400"
      >
        Your bid
      </label>
      <div className={inputWrapClass}>
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
          className={inputClass}
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
