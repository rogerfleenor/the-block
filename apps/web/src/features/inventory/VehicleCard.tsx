import { ArrowUpRight } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { VehicleListItem } from '@block/shared';

import { formatCompactCurrency, formatCountdown, formatKm, gradeDots } from '@/lib/format';
import { cn } from '@/ui/cn';
import { Tag } from '@/ui/Tag';

interface VehicleCardProps {
  vehicle: VehicleListItem;
  /** Flash class triggered when a WS `bid:updated` event lands. */
  flashTick?: number;
}

function VehicleCardImpl({ vehicle, flashTick = 0 }: VehicleCardProps) {
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (flashTick === 0) return undefined;
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 600);
    return () => window.clearTimeout(t);
  }, [flashTick]);

  const endsAt = new Date(new Date(vehicle.auction_start).getTime() + 4 * 60 * 60 * 1000);
  const chain = useMemo(() => {
    const ph = `https://placehold.co/600x400/1a1a2e/eaeaea?text=${encodeURIComponent(`${vehicle.year} ${vehicle.make}`)}`;
    return vehicle.images.length > 0 ? [...new Set(vehicle.images), ph] : [ph];
  }, [vehicle.images, vehicle.year, vehicle.make]);
  const [photoIdx, setPhotoIdx] = useState(0);
  const photo = chain[Math.min(photoIdx, chain.length - 1)]!;

  useEffect(() => {
    setPhotoIdx(0);
  }, [vehicle.id]);

  return (
    <Link
      to={`/v/${vehicle.id}`}
      className={cn(
        'group flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-market transition hover:border-accent/45 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-slate-800 dark:bg-slate-900',
        flash && 'animate-flash',
      )}
    >
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden bg-slate-100 dark:bg-slate-800">
        <img
          src={photo}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          loading="lazy"
          decoding="async"
          width={480}
          height={360}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
          onError={() => setPhotoIdx((i) => (i < chain.length - 1 ? i + 1 : i))}
        />
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 p-2">
        <div className="flex items-baseline justify-between gap-1.5">
          <p className="line-clamp-2 text-[12px] font-semibold leading-snug sm:line-clamp-1 sm:text-[13px]">
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </p>
          <ArrowUpRight
            size={12}
            aria-hidden="true"
            className="text-slate-400 transition group-hover:text-accent"
          />
        </div>
        <p className="text-[10px] text-slate-500 sm:text-[11px]">
          {formatKm(vehicle.odometer_km)} ·{' '}
          <span aria-label={`Condition grade ${vehicle.condition_grade.toFixed(1)} out of 5`}>
            {gradeDots(vehicle.condition_grade)} {vehicle.condition_grade.toFixed(1)}
          </span>
        </p>
        <div className="flex items-baseline justify-between pt-0.5">
          <div className="flex min-w-0 items-baseline gap-0.5">
            <span className="truncate text-base font-semibold tabular-nums sm:text-lg">
              {formatCompactCurrency(vehicle.current_bid)}
            </span>
            {flash ? (
              <span className="text-accent" aria-hidden="true">
                ▲
              </span>
            ) : null}
          </div>
          <span className="shrink-0 text-[10px] text-slate-500 sm:text-[11px]">
            {vehicle.bid_count} {vehicle.bid_count === 1 ? 'bid' : 'bids'}
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-1 pt-0.5">
          <Tag tone="neutral" className="px-1.5 py-0 text-[10px] sm:text-[11px]">
            {vehicle.title_status}
          </Tag>
          <span className="shrink-0 text-right text-[10px] text-slate-500 sm:text-[11px]">
            Ends in {formatCountdown(endsAt)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export const VehicleCard = memo(VehicleCardImpl);
