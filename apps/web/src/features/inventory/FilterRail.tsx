import { useQuery } from '@tanstack/react-query';
import { useId } from 'react';

import type { VehicleFacets, VehicleQuery } from '@block/shared';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { Button } from '@/ui/Button';

interface FilterRailProps {
  value: Partial<VehicleQuery>;
  onChange: (next: Partial<VehicleQuery>) => void;
  onReset: () => void;
  totals?: number;
}

export function FilterRail({ value, onChange, onReset, totals }: FilterRailProps) {
  const baseId = useId();
  const { data: facets } = useQuery({
    queryKey: queryKeys.vehicleFacets(),
    queryFn: () => api.listVehicleFacets(),
    staleTime: 5 * 60_000,
  });

  const set = <K extends keyof VehicleQuery>(key: K, v: VehicleQuery[K] | undefined) => {
    const next = { ...value };
    if (v === undefined || v === '' || (typeof v === 'number' && Number.isNaN(v))) {
      delete next[key];
    } else {
      (next as Record<string, unknown>)[key as string] = v;
    }
    onChange(next);
  };

  const f: VehicleFacets | undefined = facets;

  return (
    <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-baseline justify-between">
        <p className="font-semibold">Filters</p>
        <span className="text-xs text-slate-500">{totals ?? 0} lots</span>
      </header>

      <Field label="Make">
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={value.make ?? ''}
          onChange={(e) => set('make', e.target.value || undefined)}
        >
          <option value="">All</option>
          {(f?.makes ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Model contains">
        <input
          type="search"
          list={`${baseId}-models`}
          value={value.model ?? ''}
          onChange={(e) => set('model', e.target.value || undefined)}
          placeholder="e.g. Tacoma"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
        />
        <datalist id={`${baseId}-models`}>
          {(f?.models ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>

      <Field label="Trim contains">
        <input
          type="search"
          list={`${baseId}-trims`}
          value={value.trim ?? ''}
          onChange={(e) => set('trim', e.target.value || undefined)}
          placeholder="e.g. TRD"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
        />
        <datalist id={`${baseId}-trims`}>
          {(f?.trims ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>

      <Field label="Body">
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={value.body ?? ''}
          onChange={(e) => set('body', e.target.value || undefined)}
        >
          <option value="">All</option>
          {(f?.bodyStyles ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Province">
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={value.province ?? ''}
          onChange={(e) => set('province', e.target.value || undefined)}
        >
          <option value="">All</option>
          {(f?.provinces ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="City contains">
        <input
          type="search"
          list={`${baseId}-cities`}
          value={value.city ?? ''}
          onChange={(e) => set('city', e.target.value || undefined)}
          placeholder="City"
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
        />
        <datalist id={`${baseId}-cities`}>
          {(f?.cities ?? []).map((m) => (
            <option key={m} value={m} />
          ))}
        </datalist>
      </Field>

      <Field label="Title">
        <select
          className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          value={value.title ?? ''}
          onChange={(e) => set('title', e.target.value || undefined)}
        >
          <option value="">All</option>
          {(f?.titleStatuses ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Year min">
          <input
            type="number"
            min={1990}
            max={2030}
            value={value.minYear ?? ''}
            onChange={(e) => set('minYear', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </Field>
        <Field label="Year max">
          <input
            type="number"
            min={1990}
            max={2030}
            value={value.maxYear ?? ''}
            onChange={(e) => set('maxYear', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </Field>
      </div>

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
        <span className="text-xs text-slate-500">{(value.minGrade ?? 0).toFixed(1)}+</span>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Min price (bid)">
          <input
            type="number"
            min={0}
            step={500}
            value={value.minPrice ?? ''}
            onChange={(e) => set('minPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="0"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </Field>
        <Field label="Max price (bid)">
          <input
            type="number"
            min={0}
            step={500}
            value={value.maxPrice ?? ''}
            onChange={(e) => set('maxPrice', e.target.value ? Number(e.target.value) : undefined)}
            placeholder="∞"
            className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
          />
        </Field>
      </div>

      <details className="rounded-lg border border-slate-200 bg-slate-50/50 p-2 dark:border-slate-800 dark:bg-slate-950/40">
        <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-slate-600">
          More fields
        </summary>
        <div className="mt-3 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Field label="VIN contains">
            <input
              type="search"
              value={value.vin ?? ''}
              onChange={(e) => set('vin', e.target.value || undefined)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs dark:border-slate-700 dark:bg-slate-900"
            />
          </Field>
          <Field label="Lot contains">
            <input
              type="search"
              value={value.lot ?? ''}
              onChange={(e) => set('lot', e.target.value || undefined)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </Field>
          <Field label="Dealership contains">
            <input
              type="search"
              list={`${baseId}-dealers`}
              value={value.sellingDealership ?? ''}
              onChange={(e) => set('sellingDealership', e.target.value || undefined)}
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
            <datalist id={`${baseId}-dealers`}>
              {(f?.dealerships ?? []).map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </Field>
          <Field label="Engine contains">
            <input
              type="search"
              value={value.engine ?? ''}
              onChange={(e) => set('engine', e.target.value || undefined)}
              placeholder="e.g. turbo"
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
            />
          </Field>
          <Field label="Transmission">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.transmission ?? ''}
              onChange={(e) => set('transmission', e.target.value || undefined)}
            >
              <option value="">All</option>
              {(f?.transmissions ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Drivetrain">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.drivetrain ?? ''}
              onChange={(e) => set('drivetrain', e.target.value || undefined)}
            >
              <option value="">All</option>
              {(f?.drivetrains ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fuel type">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.fuelType ?? ''}
              onChange={(e) => set('fuelType', e.target.value || undefined)}
            >
              <option value="">All</option>
              {(f?.fuelTypes ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exterior color">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.exteriorColor ?? ''}
              onChange={(e) => set('exteriorColor', e.target.value || undefined)}
            >
              <option value="">All</option>
              {(f?.exteriorColors ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Interior color">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.interiorColor ?? ''}
              onChange={(e) => set('interiorColor', e.target.value || undefined)}
            >
              <option value="">All</option>
              {(f?.interiorColors ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Odo min (km)">
              <input
                type="number"
                min={0}
                step={1000}
                value={value.minOdometer ?? ''}
                onChange={(e) =>
                  set('minOdometer', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Odo max (km)">
              <input
                type="number"
                min={0}
                step={1000}
                value={value.maxOdometer ?? ''}
                onChange={(e) =>
                  set('maxOdometer', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Bids min">
              <input
                type="number"
                min={0}
                value={value.minBidCount ?? ''}
                onChange={(e) =>
                  set('minBidCount', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Bids max">
              <input
                type="number"
                min={0}
                value={value.maxBidCount ?? ''}
                onChange={(e) =>
                  set('maxBidCount', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Start bid min">
              <input
                type="number"
                min={0}
                step={500}
                value={value.minStartingBid ?? ''}
                onChange={(e) =>
                  set('minStartingBid', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
            <Field label="Start bid max">
              <input
                type="number"
                min={0}
                step={500}
                value={value.maxStartingBid ?? ''}
                onChange={(e) =>
                  set('maxStartingBid', e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              />
            </Field>
          </div>

          <Field label="Buy now">
            <select
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-900"
              value={value.buyNow ?? 'any'}
              onChange={(e) => {
                const v = e.target.value as VehicleQuery['buyNow'];
                set('buyNow', v === 'any' ? undefined : v);
              }}
            >
              <option value="any">Any</option>
              <option value="yes">Has buy-now</option>
              <option value="no">No buy-now</option>
            </select>
          </Field>
        </div>
      </details>

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
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
