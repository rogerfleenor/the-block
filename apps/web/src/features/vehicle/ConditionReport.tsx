import type { Vehicle } from '@block/shared';

import { formatGrade, gradeDots } from '@/lib/format';

interface ConditionReportProps {
  vehicle: Vehicle;
}

export function ConditionReport({ vehicle }: ConditionReportProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm">
        <span className="font-mono text-base text-accent" aria-hidden="true">
          {gradeDots(vehicle.condition_grade)}
        </span>
        <span className="font-semibold">{formatGrade(vehicle.condition_grade)} / 5</span>
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-300">{vehicle.condition_report}</p>
    </div>
  );
}
