import { lazy, Suspense, useEffect, useState } from 'react';

import { useAgentStore } from '@/state/agentStore';

const CommandBarReal = lazy(() => import('./CommandBar').then((m) => ({ default: m.CommandBar })));

/**
 * Lightweight wrapper that defers the AuctionAgent CommandBar bundle until
 * the user actually opens it (Cmd-K, "/" shortcut, or header button).
 *
 * The full CommandBar chunk pulls in the command-palette UI, several lucide
 * icons, react-router hooks, and the agentClient — none of which are needed
 * on the inventory page render path.
 */
interface LazyCommandBarProps {
  vehicleId?: string;
}

export function LazyCommandBar({ vehicleId }: LazyCommandBarProps) {
  const open = useAgentStore((s) => s.open);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);

  useEffect(() => {
    if (open && !hasOpenedOnce) setHasOpenedOnce(true);
  }, [open, hasOpenedOnce]);

  if (!hasOpenedOnce) return null;
  return (
    <Suspense fallback={null}>
      <CommandBarReal vehicleId={vehicleId} />
    </Suspense>
  );
}
