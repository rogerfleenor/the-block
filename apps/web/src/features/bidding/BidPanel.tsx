import { useEffect, useState } from 'react';


import { SmartBidBar } from '../agent/SmartBidBar';

import { BidForm } from './BidForm';
import { BidHistory } from './BidHistory';
import { ReserveBadge } from './ReserveBadge';

import type { Vehicle } from '@block/shared';

import { formatCountdown, formatCurrency } from '@/lib/format';
import { useBidStore } from '@/state/bidStore';

interface BidPanelProps {
  vehicle: Vehicle;
  compact?: boolean;
}

export function BidPanel({ vehicle, compact = false }: BidPanelProps) {
  const optimistic = useBidStore((s) => s.optimistic[vehicle.id]);
  const lastToast = useBidStore((s) => s.lastToast);
  const clearToast = useBidStore((s) => s.clearToast);
  const [prefill, setPrefill] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!lastToast) return;
    const t = window.setTimeout(() => clearToast(), 4000);
    return () => window.clearTimeout(t);
  }, [lastToast, clearToast]);

  const optimisticBid = optimistic?.amount;
  const displayedCurrent = optimisticBid && optimisticBid > vehicle.current_bid ? optimisticBid : vehicle.current_bid;

  const endsAt = new Date(new Date(vehicle.auction_start).getTime() + 4 * 60 * 60 * 1000);
  const countdown = formatCountdown(endsAt, new Date(now));

  return (
    <aside
      className={
        compact
          ? 'space-y-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
          : 'sticky top-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900'
      }
      aria-labelledby={`bid-panel-${vehicle.id}`}
    >
      <header className="space-y-1">
        <p id={`bid-panel-${vehicle.id}`} className="text-xs uppercase tracking-wide text-neutral-500">
          Current bid
        </p>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tabular-nums">{formatCurrency(displayedCurrent)}</span>
          {optimisticBid ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
              pending
            </span>
          ) : null}
        </div>
        <p className="text-xs text-neutral-500">
          {vehicle.bid_count} {vehicle.bid_count === 1 ? 'bid' : 'bids'} · Ends in {countdown}
        </p>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <ReserveBadge reserve={vehicle.reserve_price} currentBid={displayedCurrent} />
          <SmartBidBar
            vehicleId={vehicle.id}
            onPrefill={(amt) => setPrefill(amt)}
          />
        </div>
      </header>

      {lastToast ? (
        <div
          role="status"
          className={
            lastToast.kind === 'success'
              ? 'rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300'
          }
        >
          {lastToast.message}
        </div>
      ) : null}

      <BidForm vehicle={vehicle} prefilledAmount={prefill} />

      {!compact ? (
        <section className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-neutral-500">Recent bids</p>
          <BidHistory vehicleId={vehicle.id} />
        </section>
      ) : null}
    </aside>
  );
}
