import { useQuery } from '@tanstack/react-query';
import { useMatch } from 'react-router-dom';

import { CommandBar } from './CommandBar';
import { AGENT_DOCK_MAX_H, VEHICLE_DOCK_MAX_H } from './dockLayout';

import { BidPanel } from '@/features/bidding/BidPanel';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';

/**
 * Fixed bottom dock — listing bid strip (narrow viewports) + AuctionAgent.
 * Bid sits flush above the agent shell. Resolves listing id from `/v/:id`.
 */
export function AuctionAgentDock() {
  const match = useMatch('/v/:id');
  const id = match?.params.id ?? '';

  const { data: vehicle, isLoading } = useQuery({
    queryKey: queryKeys.vehicle(id),
    queryFn: () => api.getVehicle(id),
    enabled: id.length > 0,
  });

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 flex flex-col border-t border-slate-200 bg-surface-card shadow-dock dark:border-slate-800 dark:bg-slate-950 ${VEHICLE_DOCK_MAX_H}`}
    >
      {id ? (
        <div className="xl:hidden shrink-0 border-b border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900">
          {vehicle ? (
            <BidPanel vehicle={vehicle} compact dock />
          ) : isLoading ? (
            <div className="h-12 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800" />
          ) : null}
        </div>
      ) : null}

      <div
        className={`mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 ${AGENT_DOCK_MAX_H}`}
      >
        <CommandBar vehicleId={id || undefined} />
      </div>
    </div>
  );
}
