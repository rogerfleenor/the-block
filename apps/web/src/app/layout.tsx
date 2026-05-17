import { CircleDot, Command } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Outlet } from 'react-router-dom';

import { useAgentStore } from '@/state/agentStore';
import { Button } from '@/ui/Button';

export function AppLayout() {
  const open = useAgentStore((s) => s.openCommandBar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold">
            <CircleDot size={16} className="text-accent" aria-hidden="true" />
            the-block
          </Link>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Button
              variant="ghost"
              size="sm"
              onClick={open}
              className="gap-1.5"
              aria-label="Open AuctionAgent (Cmd+K)"
            >
              <Command size={12} aria-hidden="true" />
              <span className="hidden sm:inline">AuctionAgent</span>
              <kbd className="hidden rounded border border-neutral-200 px-1 text-[10px] sm:inline dark:border-neutral-700">
                ⌘K
              </kbd>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-4 pb-32">
        <Outlet />
      </main>
      <footer className="px-4 py-6 text-center text-[11px] text-neutral-500">
        the-block · buyer-side vehicle auction prototype
      </footer>
    </div>
  );
}
