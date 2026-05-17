import { Sparkles } from 'lucide-react';

import type { AgentFact } from '@block/shared';

import { Tag } from '@/ui/Tag';
import { Tooltip } from '@/ui/Tooltip';


interface FactChipProps {
  fact: AgentFact;
}

export function FactChip({ fact }: FactChipProps) {
  const tone = fact.severity === 'high' ? 'danger' : fact.severity === 'medium' ? 'warn' : 'accent';
  return (
    <Tooltip
      content={
        <div className="space-y-1">
          <p className="font-medium">Why?</p>
          {fact.detail ? <p>{fact.detail}</p> : null}
          {fact.sources.length > 0 ? (
            <p className="text-[10px] uppercase tracking-wide text-neutral-500">
              {fact.sources.join(' · ')}
            </p>
          ) : null}
        </div>
      }
    >
      <Tag tone={tone} className="cursor-help">
        <Sparkles size={10} aria-hidden="true" />
        {fact.text}
      </Tag>
    </Tooltip>
  );
}
