import { useQuery } from '@tanstack/react-query';

import type { MarketComp, ProviderResult } from '@block/shared';

import { api } from '@/lib/api';
import { formatCompactCurrency, formatKm } from '@/lib/format';
import { queryKeys } from '@/lib/query';
import { Card, CardBody } from '@/ui/Card';
import { Skeleton } from '@/ui/Skeleton';

interface CompareStripProps {
  vehicleId: string;
  currentBid: number;
}

/** 2–3 inline comps from the market provider, with Δ vs current bid. */
export function CompareStrip({ vehicleId, currentBid }: CompareStripProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.intel(vehicleId),
    queryFn: () => api.getIntel(vehicleId, ['market']),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  const comps = pickComps(data?.results);
  if (comps.length === 0) {
    return <p className="text-sm text-slate-500">No comparable sales available.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {comps.slice(0, 3).map((c, idx) => {
        const delta = c.price - currentBid;
        const deltaLabel =
          delta === 0 ? '—' : `${delta > 0 ? '+' : '−'}${formatCompactCurrency(Math.abs(delta))}`;
        return (
          <Card key={idx} className="border-slate-200">
            <CardBody className="space-y-1">
              <p className="text-sm font-semibold">
                {c.year} {c.make} {c.model}
              </p>
              <p className="text-xs text-slate-500">
                {c.trim ?? '—'} · {formatKm(c.odometerKm ?? 0)}
              </p>
              <p className="text-sm">
                {formatCompactCurrency(c.price)}{' '}
                <span
                  className={
                    delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-amber-600' : 'text-slate-500'
                  }
                >
                  ({deltaLabel})
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                {c.source} · {c.soldAt}
              </p>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

function pickComps(results: ProviderResult[] | undefined): MarketComp[] {
  if (!results) return [];
  const market = results.find((r) => r.status === 'ok' && r.category === 'market');
  if (!market || market.status !== 'ok') return [];
  const data = market.data as { comps?: MarketComp[] };
  return data.comps ?? [];
}
