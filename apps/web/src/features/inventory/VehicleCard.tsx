import { ArrowUpRight } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
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
  const photo = vehicle.images[0] ?? `https://placehold.co/600x400/1a1a2e/eaeaea?text=${encodeURIComponent(`${vehicle.year} ${vehicle.make}`)}`;

  return (
    <Link
      to={`/v/${vehicle.id}`}
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white text-left shadow-sm transition hover:border-accent/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:border-neutral-800 dark:bg-neutral-900',
        flash && 'animate-flash',
      )}
      style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
        <img
          src={photo}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          loading="lazy"
          decoding="async"
          width={600}
          height={450}
          className="h-full w-full object-cover transition group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <div className="flex items-baseline justify-between gap-2">
          <p className="line-clamp-1 text-sm font-semibold">
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
          </p>
          <ArrowUpRight
            size={14}
            aria-hidden="true"
            className="text-neutral-400 transition group-hover:text-accent"
          />
        </div>
        <p className="text-xs text-neutral-500">
          {formatKm(vehicle.odometer_km)} ·{' '}
          <span aria-label={`Condition grade ${vehicle.condition_grade.toFixed(1)} out of 5`}>
            {gradeDots(vehicle.condition_grade)} {vehicle.condition_grade.toFixed(1)}
          </span>
        </p>
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-semibold tabular-nums">
              {formatCompactCurrency(vehicle.current_bid)}
            </span>
            {flash ? (
              <span className="text-accent" aria-hidden="true">
                ▲
              </span>
            ) : null}
          </div>
          <span className="text-[11px] text-neutral-500">
            {vehicle.bid_count} {vehicle.bid_count === 1 ? 'bid' : 'bids'}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Tag tone="neutral">{vehicle.title_status}</Tag>
          <span className="text-[11px] text-neutral-500">Ends in {formatCountdown(endsAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export const VehicleCard = memo(VehicleCardImpl);
