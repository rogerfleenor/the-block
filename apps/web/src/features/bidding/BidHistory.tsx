import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { formatCurrency, formatRelative } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { Skeleton } from '@/ui/Skeleton';

interface BidHistoryProps {
  vehicleId: string;
}

export function BidHistory({ vehicleId }: BidHistoryProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.bids(vehicleId),
    queryFn: () => api.getBids(vehicleId),
  });

  if (isLoading) {
    return (
      <div className="space-y-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    );
  }

  const bids = (data?.bids ?? []).slice().reverse();
  if (bids.length === 0) {
    return <p className="text-xs text-neutral-500">No bids yet — be the first.</p>;
  }

  return (
    <ul className="space-y-1 text-xs">
      {bids.slice(0, 6).map((b) => (
        <li key={b.id} className="flex justify-between text-neutral-600 dark:text-neutral-400">
          <span className="font-medium text-neutral-900 dark:text-neutral-100">
            {formatCurrency(b.amount)}
          </span>
          <span>
            {b.source === 'agent' ? '✦ ' : ''}
            {b.bidder} · {formatRelative(b.ts)}
          </span>
        </li>
      ))}
    </ul>
  );
}
