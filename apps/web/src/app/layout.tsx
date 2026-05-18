import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { AuctionAgentDock } from '@/features/agent/AuctionAgentDock';
import { ConfirmAction } from '@/features/agent/ConfirmAction';
import { useAgentStore } from '@/state/agentStore';

export function AppLayout() {
  const requestAgentFocus = useAgentStore((s) => s.requestAgentFocus);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        requestAgentFocus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestAgentFocus]);

  return (
    <div className="min-h-screen bg-surface text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-surface-card shadow-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="min-w-0 shrink">
            <div className="inline-flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                to="/"
                className="text-[15px] font-bold tracking-tight text-brand-navy transition-colors hover:text-accent dark:text-slate-100"
              >
                AuctionBlockAI
              </Link>
              <span className="inline-flex items-baseline gap-2 border-l border-slate-200 pl-3 dark:border-slate-700">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  By
                </span>
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-navy dark:text-slate-200">
                  OPENLANE
                </span>
              </span>
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-end justify-center text-right leading-tight sm:flex">
            <p className="hidden pb-0.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 md:block">
              Buyer marketplace
            </p>
            <p className="text-xs font-bold sm:text-sm">
              <span className="text-brand-navy">Wholesale </span>
              <span className="text-accent">made easy.</span>
            </p>
          </div>
        </div>
      </header>
      <div className="pb-[min(42vh,272px)]">
        <main className="mx-auto max-w-7xl px-4 py-4 pb-4 lg:pb-8">
          <Outlet />
        </main>
        <footer className="border-t border-white/10 bg-brand-footer px-4 py-8 text-center text-[11px] text-slate-300">
          <p className="font-medium text-white">AuctionBlockAI</p>
          <p className="mt-1 text-slate-400">Buyer-side wholesale auction prototype</p>
        </footer>
      </div>
      <AuctionAgentDock />
      <ConfirmAction />
    </div>
  );
}
