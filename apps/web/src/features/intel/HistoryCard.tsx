import type { HistoryAutoCheck, HistoryCarfax, ProviderResult } from '@block/shared';

import { formatKm } from '@/lib/format';
import { Card, CardBody, CardHeader } from '@/ui/Card';
import { Tag } from '@/ui/Tag';

interface HistoryCardProps {
  results: ProviderResult[];
}

export function HistoryCard({ results }: HistoryCardProps) {
  const carfax = pickOk<HistoryCarfax>(results, 'carfax');
  const ac = pickOk<HistoryAutoCheck>(results, 'autocheck');

  if (!carfax && !ac) {
    return (
      <Card>
        <CardHeader>History</CardHeader>
        <CardBody className="text-sm text-slate-500">No history report available.</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>History</CardHeader>
      <CardBody className="space-y-3 text-sm">
        {carfax ? (
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={carfax.titleBrand === 'clean' ? 'success' : 'danger'}>
              Title: {carfax.titleBrand}
            </Tag>
            <Tag tone="neutral">{carfax.accidents} accidents</Tag>
            <Tag tone="neutral">{carfax.owners} owners</Tag>
            {carfax.buybackGuarantee ? <Tag tone="success">Buyback guarantee</Tag> : null}
          </div>
        ) : null}

        {ac ? (
          <p className="text-xs text-slate-500">
            AutoCheck score{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-100">{ac.score}</span>
            {ac.auctionAnnouncements.length > 0
              ? ` · Announcements: ${ac.auctionAnnouncements.join(', ')}`
              : ''}
          </p>
        ) : null}

        {carfax && carfax.serviceRecords.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Service records
            </p>
            <ul className="mt-1 space-y-1">
              {carfax.serviceRecords.slice(0, 4).map((r, idx) => (
                <li
                  key={idx}
                  className="flex justify-between text-xs text-slate-600 dark:text-slate-400"
                >
                  <span>
                    {r.date} · {r.type}
                  </span>
                  <span>{formatKm(r.odometerKm)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}

function pickOk<T>(results: ProviderResult[], name: string): T | null {
  const r = results.find((res) => res.provider === name);
  if (!r || r.status !== 'ok') return null;
  return r.data as T;
}
