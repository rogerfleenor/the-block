import { useMatch } from 'react-router-dom';

import { CommandBar } from './CommandBar';
import { AGENT_DOCK_MAX_H } from './dockLayout';

/**
 * Fixed bottom dock — always visible on every route. Resolves listing id
 * from the URL when the active route is `/v/:id`.
 */
export function AuctionAgentDock() {
  const match = useMatch('/v/:id');
  const id = match?.params.id;
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-surface-card shadow-dock dark:border-slate-800 dark:bg-slate-950 ${AGENT_DOCK_MAX_H} flex flex-col`}
    >
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <CommandBar vehicleId={id} />
      </div>
    </div>
  );
}
