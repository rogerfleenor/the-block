import type { ProviderResult } from '@block/shared';

import { Sheet } from '@/ui/Sheet';
import { Tag } from '@/ui/Tag';

interface SourcesSheetProps {
  open: boolean;
  onClose: () => void;
  results: ProviderResult[];
}

export function SourcesSheet({ open, onClose, results }: SourcesSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Sources">
      <p className="mb-3 text-xs text-slate-500">
        Every chip and figure on this page is cited. Aggregated from {results.length} provider call
        {results.length === 1 ? '' : 's'} — all mock today, all live-ready.
      </p>
      <ul className="space-y-1.5">
        {results.map((r) => (
          <li
            key={`${r.provider}-${r.fetchedAt}`}
            className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Tag tone="neutral">{r.category}</Tag>
              <span className="font-medium">{r.provider}</span>
            </div>
            <Tag tone={r.status === 'ok' ? 'success' : 'danger'}>{r.status}</Tag>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
