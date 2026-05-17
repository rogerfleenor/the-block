import type { ProviderResult, SafetyIihs, SafetyNcap, SafetyRecalls } from '@block/shared';

import { Card, CardBody, CardHeader } from '@/ui/Card';
import { Tag } from '@/ui/Tag';


interface SafetyCardProps {
  results: ProviderResult[];
}

export function SafetyCard({ results }: SafetyCardProps) {
  const ncap = pickOk<SafetyNcap>(results, 'nhtsa_ncap');
  const iihs = pickOk<SafetyIihs>(results, 'iihs');
  const recalls = pickOk<SafetyRecalls>(results, 'nhtsa_recalls');

  return (
    <Card>
      <CardHeader>Safety</CardHeader>
      <CardBody className="space-y-3 text-sm">
        {ncap ? (
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="neutral">NCAP overall {ncap.overallRating}★</Tag>
            <Tag tone="neutral">Frontal {ncap.frontalRating}★</Tag>
            <Tag tone="neutral">Side {ncap.sideRating}★</Tag>
          </div>
        ) : null}
        {iihs ? (
          <div className="flex flex-wrap gap-1.5">
            {iihs.topSafetyPick ? <Tag tone="success">IIHS Top Safety Pick</Tag> : null}
            {Object.entries(iihs.ratings).map(([k, v]) => (
              <Tag key={k} tone={v === 'Good' ? 'success' : v === 'Acceptable' ? 'neutral' : 'warn'}>
                {k}: {v}
              </Tag>
            ))}
          </div>
        ) : null}
        {recalls && recalls.openRecalls.length > 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-semibold">{recalls.openRecalls.length} open recall(s)</p>
            <ul className="mt-1 space-y-1">
              {recalls.openRecalls.map((r) => (
                <li key={r.campaignNumber}>
                  <strong>{r.campaignNumber}</strong>: {r.component} — {r.summary}
                </li>
              ))}
            </ul>
          </div>
        ) : recalls ? (
          <p className="text-xs text-neutral-500">No open recalls.</p>
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
