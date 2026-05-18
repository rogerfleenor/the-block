import { ArrowRight, Filter, Loader2, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { agentClient } from './agentClient';

import type { AgentAction, AgentInvokeResponse, AgentFact } from '@block/shared';

import { useAgentStore } from '@/state/agentStore';
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

/**
 * Always-visible AuctionAgent surface (dock shell lives in `AuctionAgentDock`).
 * Not a chat thread — intent input + facts + quick actions only.
 */
export function CommandBar({ vehicleId }: CommandBarProps) {
  const focusNonce = useAgentStore((s) => s.focusNonce);
  const pushSuggestion = useAgentStore((s) => s.pushSuggestion);

  const [utterance, setUtterance] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<AgentInvokeResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    setUtterance('');
    setResponse(null);
  }, [vehicleId]);

  useEffect(() => {
    if (focusNonce === 0) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [focusNonce]);

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
    } else if (action.kind === 'setFilters') {
      const next = new URLSearchParams();
      for (const [k, v] of Object.entries(action.filters)) {
        if (v === undefined || v === null || v === '') continue;
        next.set(k, String(v));
      }
      setSearchParams(next, { replace: false });
      navigate(`/?${next.toString()}`);
    }
  };

  const visibleFacts: AgentFact[] = useMemo(() => (response?.facts ?? []).slice(0, 6), [response]);

  return (
    <section
      aria-label="AuctionAgent"
      className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-slate-800">
        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-200">
          <Sparkles size={12} className="text-accent" aria-hidden="true" /> AuctionAgent
        </span>
        {vehicleId ? (
          <span className="max-w-[50%] truncate text-[10px] text-slate-400" title={vehicleId}>
            Scoped to listing
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">All inventory</span>
        )}
      </div>

      <form
        className="shrink-0 border-b border-slate-200 dark:border-slate-800"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-center gap-2 bg-white px-3 py-2 dark:bg-slate-950">
          <input
            ref={inputRef}
            value={utterance}
            onChange={(e) => setUtterance(e.target.value)}
            placeholder='Try "find hybrid AWD under 30k" or "VIN 1HGBH41JXMN109186"'
            title="Click here (or press ⌘K), then dictate with Wispr Flow — same as typing. Submit with the arrow or Enter."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            aria-label="AuctionAgent input; Wispr Flow dictation works when this field is focused"
          />
          {loading ? (
            <Loader2
              size={14}
              className="shrink-0 animate-spin text-slate-400"
              aria-hidden="true"
            />
          ) : (
            <button
              type="submit"
              className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              aria-label="Submit"
            >
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </form>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {response ? (
          <div className="space-y-2 p-2">
            {response.reply ? (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
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
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Related facts
                </p>
                {visibleFacts.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <Tag tone={severityTone(f.severity)}>{f.kind.replace('_', ' ')}</Tag>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{f.text}</p>
                      {f.sources.length > 0 ? (
                        <p className="mt-0.5 text-[11px] text-slate-500">{f.sources.join(' · ')}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="px-3 py-2 text-[11px] text-slate-500">
            Results appear here after you submit.
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-slate-200 bg-white px-2 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950">
        <span className="font-medium">Try:</span>
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setUtterance(s);
              void submit(s);
            }}
            className="rounded-full border border-slate-200 px-2 py-0.5 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

function severityTone(sev: AgentFact['severity']): 'accent' | 'warn' | 'danger' {
  if (sev === 'high') return 'danger';
  if (sev === 'medium') return 'warn';
  return 'accent';
}
