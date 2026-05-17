import type { VehicleQuery } from '@block/shared';

import { Button } from '@/ui/Button';


interface FilterRailProps {
  value: Partial<VehicleQuery>;
  onChange: (next: Partial<VehicleQuery>) => void;
  onReset: () => void;
  totals?: number;
}

const MAKES = [
  'Toyota',
  'Honda',
  'Ford',
  'Chevrolet',
  'Mazda',
  'Tesla',
  'BMW',
  'Ram',
  'Volkswagen',
  'Nissan',
];
const BODIES = ['SUV', 'truck', 'sedan', 'hatchback'];
const PROVINCES = ['Ontario', 'Quebec', 'British Columbia', 'Alberta'];
const TITLES = ['clean', 'salvage', 'rebuilt'];

export function FilterRail({ value, onChange, onReset, totals }: FilterRailProps) {
  const set = <K extends keyof VehicleQuery>(key: K, v: VehicleQuery[K] | undefined) => {
    const next = { ...value };
    if (v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key as string] = v;
    }
    onChange(next);
  };

  return (
    <aside className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 text-sm dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-baseline justify-between">
        <p className="font-semibold">Filters</p>
        <span className="text-xs text-neutral-500">{totals ?? 0} lots</span>
      </header>

      <Field label="Make">
        <select
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          value={value.make ?? ''}
          onChange={(e) => set('make', e.target.value || undefined)}
        >
          <option value="">All</option>
          {MAKES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Body">
        <select
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          value={value.body ?? ''}
          onChange={(e) => set('body', e.target.value || undefined)}
        >
          <option value="">All</option>
          {BODIES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Province">
        <select
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          value={value.province ?? ''}
          onChange={(e) => set('province', e.target.value || undefined)}
        >
          <option value="">All</option>
          {PROVINCES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Title">
        <select
          className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          value={value.title ?? ''}
          onChange={(e) => set('title', e.target.value || undefined)}
        >
          <option value="">All</option>
          {TITLES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Min condition grade">
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={value.minGrade ?? 0}
          onChange={(e) => set('minGrade', Number(e.target.value) || undefined)}
          className="w-full"
        />
        <span className="text-xs text-neutral-500">{(value.minGrade ?? 0).toFixed(1)}+</span>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Min price">
          <input
            type="number"
            min={0}
            step={500}
            value={value.minPrice ?? ''}
            onChange={(e) => set('minPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>
        <Field label="Max price">
          <input
            type="number"
            min={0}
            step={500}
            value={value.maxPrice ?? ''}
            onChange={(e) => set('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="∞"
            className="w-full rounded-md border border-neutral-200 bg-white px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
          />
        </Field>
      </div>

      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </label>
  );
}
