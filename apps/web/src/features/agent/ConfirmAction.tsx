import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { AgentSuggestion } from '@block/shared';

import { formatCurrency } from '@/lib/format';
import { getWsClient } from '@/lib/ws';
import { useAgentStore } from '@/state/agentStore';
import { useBidStore } from '@/state/bidStore';
import { Button } from '@/ui/Button';

interface ConfirmActionProps {
  onPlaceBid?: (suggestion: AgentSuggestion) => Promise<void>;
  testTickMs?: number;
}

/**
 * 5-second confirm card. Defaults to **Cancel** on Esc or timeout.
 * Enter / clicking Confirm POSTs the suggestion. The agent NEVER
 * auto-executes — this card is the only way `placeBid` becomes real.
 */
export function ConfirmAction({ onPlaceBid, testTickMs = 100 }: ConfirmActionProps) {
  const active = useAgentStore((s) => s.active);
  const clearSuggestion = useAgentStore((s) => s.clearSuggestion);
  const beginOptimistic = useBidStore((s) => s.beginOptimistic);
  const rollback = useBidStore((s) => s.rollback);
  const confirmBid = useBidStore((s) => s.confirm);

  const [now, setNow] = useState<number>(() => Date.now());
  const submittedRef = useRef(false);

  useEffect(() => {
    submittedRef.current = false;
    if (!active) return undefined;
    setNow(Date.now());
    const t = window.setInterval(() => setNow(Date.now()), testTickMs);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        clearSuggestion();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        void doConfirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.suggestion.id, testTickMs]);

  const remainingMs = useMemo(() => {
    if (!active) return 0;
    return Math.max(0, active.deadlineMs - now);
  }, [active, now]);

  useEffect(() => {
    if (!active) return;
    if (remainingMs <= 0 && !submittedRef.current) {
      clearSuggestion();
    }
  }, [remainingMs, active, clearSuggestion]);

  const doConfirm = async () => {
    if (!active || submittedRef.current) return;
    submittedRef.current = true;
    const suggestion = active.suggestion;
    clearSuggestion();
    const optimisticId = beginOptimistic(suggestion.vehicleId, suggestion.amount);
    try {
      if (onPlaceBid) {
        await onPlaceBid(suggestion);
      } else {
        const { api } = await import('@/lib/api');
        const result = await api.placeBid(suggestion.vehicleId, { amount: suggestion.amount });
        confirmBid(suggestion.vehicleId, optimisticId, result);
        getWsClient().broadcastLocal({
          type: 'bid:updated',
          vehicleId: suggestion.vehicleId,
          currentBid: result.currentBid,
          bidCount: result.bidCount,
          reserveMet: result.reserveMet,
          source: 'agent',
          ts: result.bid.ts,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bid failed';
      rollback(suggestion.vehicleId, optimisticId, message);
    }
  };

  if (!active) return null;

  const progress = Math.min(1, remainingMs / active.suggestion.confirmWindowMs);
  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(min(42vh,260px)+0.75rem)] z-50 mx-auto w-full max-w-md px-4"
      role="alertdialog"
      aria-live="assertive"
    >
      <div className="overflow-hidden rounded-2xl border border-accent/40 bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold text-accent">
          <Sparkles size={14} aria-hidden="true" />
          AuctionAgent suggestion
        </div>
        <div className="space-y-2 p-4">
          <p className="text-sm font-medium">
            Place bid {formatCurrency(active.suggestion.amount)} on this lot
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {active.suggestion.rationale}
          </p>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div
              className="h-full bg-accent transition-[width] duration-100 ease-linear"
              style={{ width: `${progress * 100}%` }}
              aria-hidden="true"
            />
          </div>
          <p className="text-[11px] text-slate-500">Auto-cancels in {secondsLeft}s</p>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-3 dark:border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => clearSuggestion()}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={doConfirm}>
            Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
