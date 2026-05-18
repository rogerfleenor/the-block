import { useQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';

import type { PurchaseAssessmentResponse, PurchaseAssessmentVerdict } from '@block/shared';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';

function verdictStyles(verdict: PurchaseAssessmentVerdict): string {
  switch (verdict) {
    case 'good_buy':
      return 'border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-100';
    case 'caution':
      return 'border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-100';
    case 'bad_buy':
      return 'border-red-200 bg-red-50/80 text-red-950 dark:border-red-900/50 dark:bg-red-950/25 dark:text-red-100';
    default:
      return 'border-slate-200 bg-white';
  }
}

function verdictLabel(verdict: PurchaseAssessmentVerdict): string {
  switch (verdict) {
    case 'good_buy':
      return 'Good buy tilt';
    case 'caution':
      return 'Caution';
    case 'bad_buy':
      return 'Bad buy tilt';
    default:
      return verdict;
  }
}

function sentimentLabel(s: PurchaseAssessmentResponse['sentiment']): string {
  switch (s) {
    case 'positive':
      return 'Sentiment: positive';
    case 'mixed':
      return 'Sentiment: mixed';
    case 'negative':
      return 'Sentiment: negative';
    default:
      return `Sentiment: ${s}`;
  }
}

function factorDot(tilt: PurchaseAssessmentResponse['factors'][number]['tilt']): string {
  if (tilt === 'positive') return 'bg-emerald-500';
  if (tilt === 'negative') return 'bg-red-500';
  return 'bg-slate-300';
}

interface PurchaseAssessmentCardProps {
  vehicleId: string;
}

export function PurchaseAssessmentCard({ vehicleId }: PurchaseAssessmentCardProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.purchaseAssessment(vehicleId),
    queryFn: () => api.getPurchaseAssessment(vehicleId),
    enabled: vehicleId.length > 0,
  });

  if (isLoading) {
    return (
      <section
        aria-busy="true"
        aria-label="AuctionAgent purchase assessment"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-market dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="h-4 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        <div className="mt-3 h-3 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        <div className="mt-2 h-3 w-[80%] animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-market dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-medium text-slate-800 dark:text-slate-100">
          Purchase assessment unavailable.
        </p>
        <button type="button" className="mt-2 text-accent underline" onClick={() => void refetch()}>
          Retry
        </button>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="purchase-assessment-heading"
      className={`rounded-2xl border p-4 shadow-market ${verdictStyles(data.verdict)}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
          <div className="min-w-0">
            <p
              id="purchase-assessment-heading"
              className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300"
            >
              AuctionAgent · purchase read
            </p>
            <h2 className="mt-0.5 text-lg font-bold leading-snug">{data.headline}</h2>
            <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {sentimentLabel(data.sentiment)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="inline-block rounded-full border border-slate-200/80 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-800 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100">
            {verdictLabel(data.verdict)}
          </span>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span>Confidence</span>
          <span className="tabular-nums text-slate-900 dark:text-slate-100">
            {data.confidence}%
          </span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-700">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-500"
            style={{ width: `${data.confidence}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
          Breadth-of-signals score — not legal, financial, or mechanical advice.
        </p>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100">
        {data.summary}
      </p>

      {data.factors.length > 0 ? (
        <ul className="mt-4 space-y-2 border-t border-slate-200/60 pt-3 dark:border-slate-600/60">
          {data.factors.map((f, i) => (
            <li key={`${f.label}-${i}`} className="flex gap-2 text-sm">
              <span
                className={`mt-1.5 size-1.5 shrink-0 rounded-full ${factorDot(f.tilt)}`}
                aria-hidden
              />
              <span>
                <span className="font-semibold text-slate-900 dark:text-slate-50">{f.label}:</span>{' '}
                <span className="text-slate-700 dark:text-slate-200">{f.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
