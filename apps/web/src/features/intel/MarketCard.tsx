import type { MarketComps, ProviderResult } from '@block/shared';

import { formatCompactCurrency, formatKm } from '@/lib/format';
import { Card, CardBody, CardHeader } from '@/ui/Card';


interface MarketCardProps {
  results: ProviderResult[];
}

export function MarketCard({ results }: MarketCardProps) {
  const market = pickOk<MarketComps>(results, 'marketcheck');
  if (!market) {
    return (
      <Card>
        <CardHeader>Market comps</CardHeader>
        <CardBody className="text-sm text-neutral-500">No comps available.</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>Market comps</CardHeader>
      <CardBody className="space-y-2 text-sm">
        <p className="text-xs text-neutral-500">
          Median {formatCompactCurrency(market.medianPrice)} · avg {market.avgDaysOnMarket} days on market
        </p>
        <ul className="space-y-1">
          {market.comps.slice(0, 5).map((c, idx) => (
            <li key={idx} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-neutral-700 dark:text-neutral-300">
                {c.year} {c.make} {c.model} {c.trim ?? ''}
              </span>
              <span className="tabular-nums text-neutral-500">{formatKm(c.odometerKm ?? 0)}</span>
              <span className="font-semibold tabular-nums">{formatCompactCurrency(c.price)}</span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function pickOk<T>(results: ProviderResult[], name: string): T | null {
  const r = results.find((res) => res.provider === name);
  if (!r || r.status !== 'ok') return null;
  return r.data as T;
}
