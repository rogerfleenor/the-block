import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useMemo, useState } from 'react';

import { CompareStrip } from '../agent/CompareStrip';
import { FactChip } from '../agent/FactChip';
import { SourcesSheet } from '../intel/SourcesSheet';

import type { AgentFact, ProviderResult } from '@block/shared';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useAgentStore } from '@/state/agentStore';
import { Button } from '@/ui/Button';
import { Skeleton } from '@/ui/Skeleton';
import { Tabs } from '@/ui/Tabs';

// See RiskBanner: returning `[] ` inline from a Zustand selector causes an
// infinite re-render loop because each render produces a fresh array reference.
const EMPTY_FACTS: AgentFact[] = [];

const ValuationCard = lazy(() => import('../intel/ValuationCard').then((m) => ({ default: m.ValuationCard })));
const HistoryCard = lazy(() => import('../intel/HistoryCard').then((m) => ({ default: m.HistoryCard })));
const SafetyCard = lazy(() => import('../intel/SafetyCard').then((m) => ({ default: m.SafetyCard })));
const MarketCard = lazy(() => import('../intel/MarketCard').then((m) => ({ default: m.MarketCard })));
const BuzzCard = lazy(() => import('../intel/BuzzCard').then((m) => ({ default: m.BuzzCard })));

interface IntelTabsProps {
  vehicleId: string;
  currentBid: number;
}

export function IntelTabs({ vehicleId, currentBid }: IntelTabsProps) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.intel(vehicleId),
    queryFn: () => api.getIntel(vehicleId),
    staleTime: 60_000,
  });

  const facts = useAgentStore((s) => s.factsByVehicle[vehicleId] ?? EMPTY_FACTS);
  const visibleFacts = facts.filter((f) => f.kind !== 'risk').slice(0, 4);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const tabs = useMemo(() => {
    const results: ProviderResult[] = data?.results ?? [];
    return [
      {
        id: 'overview',
        label: 'Overview',
        content: (
          <div className="space-y-3">
            {visibleFacts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {visibleFacts.map((f) => (
                  <FactChip key={f.id} fact={f} />
                ))}
              </div>
            ) : null}
            <CompareStrip vehicleId={vehicleId} currentBid={currentBid} />
            <Suspense fallback={<Skeleton className="h-24 w-full" />}>
              <ValuationCard results={results} />
            </Suspense>
          </div>
        ),
      },
      {
        id: 'valuation',
        label: 'Valuation',
        content: (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <ValuationCard results={results} />
          </Suspense>
        ),
      },
      {
        id: 'history',
        label: 'History',
        content: (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <HistoryCard results={results} />
          </Suspense>
        ),
      },
      {
        id: 'safety',
        label: 'Safety',
        content: (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <SafetyCard results={results} />
          </Suspense>
        ),
      },
      {
        id: 'market',
        label: 'Market',
        content: (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <MarketCard results={results} />
          </Suspense>
        ),
      },
      {
        id: 'buzz',
        label: 'Buzz',
        content: (
          <Suspense fallback={<Skeleton className="h-32 w-full" />}>
            <BuzzCard results={results} />
          </Suspense>
        ),
      },
    ];
  }, [data, currentBid, vehicleId, visibleFacts]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Tabs tabs={tabs} />
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setSourcesOpen(true)}>
          Sources ({data?.results.length ?? 0}) ▸
        </Button>
      </div>
      <SourcesSheet open={sourcesOpen} onClose={() => setSourcesOpen(false)} results={data?.results ?? []} />
    </div>
  );
}
