import { useQuery } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { agentClient } from '../agent/agentClient';
import { RiskBanner } from '../agent/RiskBanner';
import { BidPanel } from '../bidding/BidPanel';

import { ConditionReport } from './ConditionReport';
import { DamageNotes } from './DamageNotes';
import { Gallery } from './Gallery';
import { IntelTabs } from './IntelTabs';
import { Specs } from './Specs';

import type { WsServerMessage } from '@block/shared';

import { api } from '@/lib/api';
import { queryClient, queryKeys } from '@/lib/query';
import { getWsClient } from '@/lib/ws';
import { useAgentStore } from '@/state/agentStore';
import { Skeleton } from '@/ui/Skeleton';

export function VehiclePage() {
  const params = useParams<{ id: string }>();
  const id = params.id ?? '';
  const navigate = useNavigate();

  const {
    data: vehicle,
    isLoading,
    isError,
  } = useQuery({
    queryKey: queryKeys.vehicle(id),
    queryFn: () => api.getVehicle(id),
    enabled: id.length > 0,
  });

  const setFacts = useAgentStore((s) => s.setFacts);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    agentClient
      .getFacts(id)
      .then((res) => {
        if (!cancelled) setFacts(id, res.facts);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [id, setFacts]);

  useEffect(() => {
    if (!id) return undefined;
    const ws = getWsClient();
    ws.subscribe(`vehicle:${id}`);
    const off = ws.on((msg: WsServerMessage) => {
      if (msg.type === 'bid:updated' && msg.vehicleId === id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.vehicle(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.bids(id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.purchaseAssessment(id) });
      }
    });
    return () => {
      off();
      ws.unsubscribe(`vehicle:${id}`);
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Skeleton className="aspect-[4/3] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError || !vehicle) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-medium">Vehicle not found.</p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mt-2 text-sm text-accent underline"
        >
          Back to inventory
        </button>
      </div>
    );
  }

  const title = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`;

  return (
    <div className="space-y-4 max-xl:pb-[min(60vh,28rem)] xl:pb-0">
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Back to inventory
      </Link>

      <RiskBanner vehicleId={vehicle.id} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <header>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Lot {vehicle.lot} · {vehicle.city}, {vehicle.province}
            </p>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-xs text-slate-500">VIN {vehicle.vin}</p>
          </header>
          <Gallery images={vehicle.images} alt={title} />

          <section aria-labelledby="intel-heading" className="space-y-2">
            <h2 id="intel-heading" className="sr-only">
              Vehicle intelligence
            </h2>
            <IntelTabs vehicleId={vehicle.id} currentBid={vehicle.current_bid} />
          </section>

          <section aria-labelledby="specs-heading" className="space-y-2">
            <h2 id="specs-heading" className="text-base font-semibold">
              Specifications
            </h2>
            <Specs vehicle={vehicle} />
          </section>

          <section aria-labelledby="condition-heading" className="space-y-2">
            <h2 id="condition-heading" className="text-base font-semibold">
              Condition
            </h2>
            <ConditionReport vehicle={vehicle} />
          </section>

          <section aria-labelledby="damage-heading" className="space-y-2">
            <h2 id="damage-heading" className="text-base font-semibold">
              Damage notes
            </h2>
            <DamageNotes notes={vehicle.damage_notes} />
          </section>

          <section aria-labelledby="dealer-heading" className="space-y-1">
            <h2 id="dealer-heading" className="text-base font-semibold">
              Selling dealership
            </h2>
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {vehicle.selling_dealership} · {vehicle.city}, {vehicle.province}
            </p>
          </section>
        </div>

        <div className="hidden xl:block">
          <BidPanel vehicle={vehicle} />
        </div>
      </div>
    </div>
  );
}
