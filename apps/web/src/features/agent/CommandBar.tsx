import { ArrowRight, Filter, Loader2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { agentClient } from './agentClient';

import type { AgentAction, AgentInvokeResponse, AgentFact } from '@block/shared';

import { useAgentStore } from '@/state/agentStore';
import { CommandPalette } from '@/ui/CommandPalette';
import { Tag } from '@/ui/Tag';



interface CommandBarProps {
  vehicleId?: string;
}

const SUGGESTIONS = [
  'bid 24800',
  'is this overpriced?',
  'AI max bid',
  'find SUVs under 25k',
  'any recalls or title issues?',
];

export function CommandBar({ vehicleId }: CommandBarProps) {
  const open = useAgentStore((s) => s.open);
  const close = useAgentStore((s) => s.closeCommandBar);
  const pushSuggestion = useAgentStore((s) => s.pushSuggestion);

  const [utterance, setUtterance] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AgentInvokeResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!open) return;
    setUtterance('');
    setResponse(null);
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const submit = async (raw?: string) => {
    const text = (raw ?? utterance).trim();
    if (!text || loading) return;
    setLoading(true);
    try {
      const res = await agentClient.invoke({
        utterance: text,
        ...(vehicleId ? { context: { vehicleId } } : {}),
      });
      setResponse(res);
      for (const sug of res.suggestions) {
        pushSuggestion(sug);
      }
      for (const action of res.actions) {
        applyAction(action);
      }
    } catch (err) {
      console.warn('[agent] invoke failed', err);
      setResponse({
        traceId: 'err',
        facts: [
          {
            id: `err_${Date.now()}`,
            kind: 'info',
            text: err instanceof Error ? err.message : 'Agent unavailable.',
            severity: 'medium',
            sources: [],
            ts: new Date().toISOString(),
          },
        ],
        suggestions: [],
        actions: [],
        toolCalls: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const applyAction = (action: AgentAction) => {
    if (action.kind === 'goto') {
      navigate(action.path);
      close();
    } else if (action.kind === 'setFilters') {
      const next = new URLSearchParams();
      for (const [k, v] of Object.entries(action.filters)) {
        if (v === undefined || v === null || v === '') continue;
        next.set(k, String(v));
      }
      setSearchParams(next, { replace: false });
      navigate(`/?${next.toString()}`);
      close();
    }
  };

  const visibleFacts: AgentFact[] = useMemo(
    () => (response?.facts ?? []).slice(0, 6),
    [response],
  );

  return (
    <CommandPalette open={open} onClose={close}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-3 dark:border-neutral-800">
          <input
            ref={inputRef}
            value={utterance}
            onChange={(e) => setUtterance(e.target.value)}
            placeholder='Try "bid 24800" or "find SUVs under 25k"'
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
            aria-label="AuctionAgent input"
          />
          {loading ? (
            <Loader2 size={14} className="animate-spin text-neutral-400" aria-hidden="true" />
          ) : (
            <button
              type="submit"
              className="rounded-md p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              aria-label="Submit"
            >
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      {response ? (
        <div className="max-h-[60vh] space-y-3 overflow-auto p-3">
          {response.reply ? (
            <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
              {response.reply}
            </p>
          ) : null}

          {response.actions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {response.actions.map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyAction(a)}
                  className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent hover:bg-accent/20"
                >
                  <Filter size={12} aria-hidden="true" />
                  {a.kind === 'setFilters' ? 'Apply filters' : `Go to ${a.path}`}
                </button>
              ))}
            </div>
          ) : null}

          {visibleFacts.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                Related facts
              </p>
              {visibleFacts.map((f) => (
                <div
                  key={f.id}
                  className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900"
                >
                  <Tag tone={severityTone(f.severity)}>{f.kind.replace('_', ' ')}</Tag>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{f.text}</p>
                    {f.sources.length > 0 ? (
                      <p className="mt-0.5 text-[11px] text-neutral-500">{f.sources.join(' · ')}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950">
        <span className="font-medium">Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setUtterance(s);
              void submit(s);
            }}
            className="rounded-full border border-neutral-200 px-2 py-0.5 hover:bg-white dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            {s}
          </button>
        ))}
      </div>
    </CommandPalette>
  );
}

function severityTone(sev: AgentFact['severity']): 'accent' | 'warn' | 'danger' {
  if (sev === 'high') return 'danger';
  if (sev === 'medium') return 'warn';
  return 'accent';
}
