import { AlertTriangle, X } from 'lucide-react';

import type { AgentFact } from '@block/shared';

import { useAgentStore } from '@/state/agentStore';
import { useIntelStore } from '@/state/intelStore';


interface RiskBannerProps {
  vehicleId: string;
}

// Stable empty-array reference — required for Zustand selectors. Returning
// `[] ` inline would create a fresh reference every render and trigger an
// infinite re-render via React's bailout-equality check.
const EMPTY_FACTS: AgentFact[] = [];

export function RiskBanner({ vehicleId }: RiskBannerProps) {
  const facts = useAgentStore((s) => s.factsByVehicle[vehicleId] ?? EMPTY_FACTS);
  const dismissed = useIntelStore((s) => s.dismissedRiskBanners[vehicleId]);
  const dismiss = useIntelStore((s) => s.dismissRisk);

  if (dismissed) return null;
  const risk: AgentFact | undefined = facts.find((f) => f.kind === 'risk');
  if (!risk) return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
    >
      <AlertTriangle size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{risk.text}</p>
        {risk.detail ? <p className="mt-0.5 text-xs opacity-90">{risk.detail}</p> : null}
        {risk.sources.length > 0 ? (
          <p className="mt-0.5 text-[11px] opacity-75">Source: {risk.sources.join(', ')}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => dismiss(vehicleId)}
        aria-label="Dismiss"
        className="rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/40"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
