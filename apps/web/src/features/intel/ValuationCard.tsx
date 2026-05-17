import type { ProviderResult, ValuationGeneric, ValuationKbb, ValuationManheim } from '@block/shared';

import { formatCurrency } from '@/lib/format';
import { Card, CardBody, CardHeader } from '@/ui/Card';


interface ValuationCardProps {
  results: ProviderResult[];
}

export function ValuationCard({ results }: ValuationCardProps) {
  const kbb = pickOk<ValuationKbb>(results, 'kbb');
  const mmr = pickOk<ValuationManheim>(results, 'manheim');
  const bb = pickOk<ValuationGeneric>(results, 'blackbook');

  return (
    <Card>
      <CardHeader>Valuation</CardHeader>
      <CardBody className="space-y-2 text-sm">
        {kbb ? (
          <Row label="KBB trade-in">{formatCurrency(kbb.tradeIn.low)} – {formatCurrency(kbb.tradeIn.high)}</Row>
        ) : null}
        {kbb ? (
          <Row label="KBB retail">{formatCurrency(kbb.retail.low)} – {formatCurrency(kbb.retail.high)}</Row>
        ) : null}
        {mmr ? (
          <Row label="MMR wholesale">{formatCurrency(mmr.mmrValue)} (grade {mmr.averageGrade.toFixed(1)})</Row>
        ) : null}
        {bb ? <Row label="Black Book">{formatCurrency(bb.wholesale ?? 0)}</Row> : null}
      </CardBody>
    </Card>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-neutral-500">{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

function pickOk<T>(results: ProviderResult[], name: string): T | null {
  const r = results.find((res) => res.provider === name);
  if (!r || r.status !== 'ok') return null;
  return r.data as T;
}
