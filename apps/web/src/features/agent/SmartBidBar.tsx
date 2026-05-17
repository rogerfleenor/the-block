import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { agentClient } from './agentClient';

import type { AgentFact } from '@block/shared';

import { formatCurrency } from '@/lib/format';
import { useAgentStore } from '@/state/agentStore';
import { Tooltip } from '@/ui/Tooltip';



interface SmartBidBarProps {
  vehicleId: string;
  onPrefill?: (amount: number) => void;
}

const RECOMMENDATION_RE = /\$([\d,]+)/;

/**
 * `✦ AI Max Bid $X` pill. Pulls from cached agent facts; clicking prefills
 * the bid input. Tooltip shows rationale + sources.
 */
export function SmartBidBar({ vehicleId, onPrefill }: SmartBidBarProps) {
  const facts = useAgentStore((s) => s.factsByVehicle[vehicleId]);
  const setFacts = useAgentStore((s) => s.setFacts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (facts && facts.length > 0) return;
    let cancelled = false;
    setLoading(true);
    agentClient
      .getFacts(vehicleId)
      .then((res) => {
        if (!cancelled) setFacts(vehicleId, res.facts);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vehicleId, facts, setFacts]);

  const rec: AgentFact | undefined = facts?.find((f) => f.kind === 'recommendation');
  const amount = rec ? extractAmount(rec.text) : null;

  return (
    <Tooltip
      content={
        rec ? (
          <div className="space-y-1">
            <p className="font-medium">Why this amount?</p>
            {rec.detail ? <p>{rec.detail}</p> : <p>{rec.text}</p>}
            {rec.sources.length > 0 ? (
              <p className="text-[10px] uppercase tracking-wide text-neutral-500">
                {rec.sources.join(' · ')}
              </p>
            ) : null}
          </div>
        ) : (
          <p>Recommendation hydrating…</p>
        )
      }
    >
      <button
        type="button"
        onClick={() => {
          if (amount && onPrefill) onPrefill(amount);
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/20"
      >
        <Sparkles size={12} aria-hidden="true" />
        {amount
          ? `AI Max Bid ${formatCurrency(amount)}`
          : loading
            ? 'AI Max Bid …'
            : 'AI Max Bid'}
      </button>
    </Tooltip>
  );
}

function extractAmount(text: string): number | null {
  const match = RECOMMENDATION_RE.exec(text);
  if (!match) return null;
  const n = Number(match[1]?.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}
