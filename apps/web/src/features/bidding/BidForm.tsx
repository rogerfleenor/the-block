import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

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

interface FormValues {
  amount: number;
}

/**
 * Uses the shared `validateBidAmount` helper directly inside react-hook-form
 * so the client + server reject identical inputs.
 */
export function BidForm({ vehicle, prefilledAmount, onPlaced }: BidFormProps) {
  const validateFn = useBidStore((s) => s.validate);
  const beginOptimistic = useBidStore((s) => s.beginOptimistic);
  const rollback = useBidStore((s) => s.rollback);
  const confirm = useBidStore((s) => s.confirm);
  const qc = useQueryClient();

  const defaultAmount = prefilledAmount ?? Math.max(
    vehicle.starting_bid,
    vehicle.current_bid + Math.max(100, Math.ceil(vehicle.current_bid * 0.01)),
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
    watch,
    reset,
  } = useForm<FormValues>({
    defaultValues: { amount: defaultAmount },
    mode: 'onBlur',
  });

  useEffect(() => {
    if (prefilledAmount && prefilledAmount > 0) {
      setValue('amount', prefilledAmount, { shouldDirty: true, shouldValidate: true });
    }
  }, [prefilledAmount, setValue]);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => api.placeBid(vehicle.id, { amount: values.amount }),
    onMutate: (values) => {
      const optimisticId = beginOptimistic(vehicle.id, values.amount);
      return { optimisticId };
    },
    onError: (err, _vars, ctx) => {
      const message = err instanceof Error ? err.message : 'Bid failed';
      if (ctx?.optimisticId) rollback(vehicle.id, ctx.optimisticId, message);
    },
    onSuccess: (result, _vars, ctx) => {
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
      reset({ amount: result.currentBid + Math.max(100, Math.ceil(result.currentBid * 0.01)) });
    },
  });

  const onSubmit = handleSubmit((values) => mutation.mutate(values));

  const amount = watch('amount');
  const validation = validateFn(vehicle, Number(amount) || 0);

  return (
    <form className="space-y-2" onSubmit={onSubmit} noValidate>
      <label htmlFor={`bid-amount-${vehicle.id}`} className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
        Your bid
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30 dark:border-neutral-700 dark:bg-neutral-900">
        <span aria-hidden="true" className="text-neutral-500">
          $
        </span>
        <input
          id={`bid-amount-${vehicle.id}`}
          type="number"
          inputMode="decimal"
          step={100}
          min={validation.minNextBid}
          className="flex-1 bg-transparent py-2 text-base outline-none"
          aria-invalid={!validation.ok}
          aria-describedby={`bid-help-${vehicle.id}`}
          {...register('amount', {
            valueAsNumber: true,
            validate: (val) => {
              const v = validateFn(vehicle, Number(val) || 0);
              return v.ok ? true : v.message;
            },
          })}
        />
      </div>
      <p id={`bid-help-${vehicle.id}`} className="text-[11px] text-neutral-500">
        Min next bid: <strong>{formatCurrency(validation.minNextBid)}</strong>
      </p>
      {errors.amount ? (
        <p role="alert" className="text-xs text-red-600">
          {errors.amount.message}
        </p>
      ) : null}
      <Button type="submit" variant="primary" size="lg" full disabled={isSubmitting || mutation.isPending}>
        {mutation.isPending ? 'Placing…' : 'Place Bid'}
      </Button>
      {vehicle.buy_now_price ? (
        <Button
          type="button"
          variant="secondary"
          size="md"
          full
          onClick={() => mutation.mutate({ amount: vehicle.buy_now_price! })}
        >
          Buy Now {formatCurrency(vehicle.buy_now_price)}
        </Button>
      ) : null}
    </form>
  );
}
