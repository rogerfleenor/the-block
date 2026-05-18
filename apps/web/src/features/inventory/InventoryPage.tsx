import { useQuery } from '@tanstack/react-query';
import { Filter, Search } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { FilterRail } from './FilterRail';
import { InventoryGrid } from './InventoryGrid';
import { SortControl } from './SortControl';

import type { VehicleQuery } from '@block/shared';

import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { Button } from '@/ui/Button';
import { Sheet } from '@/ui/Sheet';
import { Skeleton } from '@/ui/Skeleton';

const ALLOWED_KEYS = [
  'q',
  'make',
  'model',
  'trim',
  'body',
  'province',
  'city',
  'title',
  'vin',
  'lot',
  'sellingDealership',
  'transmission',
  'drivetrain',
  'fuelType',
  'exteriorColor',
  'interiorColor',
  'engine',
  'minYear',
  'maxYear',
  'minOdometer',
  'maxOdometer',
  'minBidCount',
  'maxBidCount',
  'minStartingBid',
  'maxStartingBid',
  'buyNow',
  'minPrice',
  'maxPrice',
  'minGrade',
  'sort',
  'limit',
] as const;

const NUMERIC_QUERY_KEYS = new Set<string>([
  'minYear',
  'maxYear',
  'minOdometer',
  'maxOdometer',
  'minBidCount',
  'maxBidCount',
  'minStartingBid',
  'maxStartingBid',
  'minPrice',
  'maxPrice',
  'minGrade',
  'limit',
]);

function parseQuery(search: URLSearchParams): Partial<VehicleQuery> {
  const out: Partial<VehicleQuery> = {};
  for (const key of ALLOWED_KEYS) {
    const raw = search.get(key);
    if (raw === null || raw === '') continue;
    if (NUMERIC_QUERY_KEYS.has(key)) {
      const n = Number(raw);
      if (!Number.isNaN(n)) (out as Record<string, unknown>)[key] = n;
    } else {
      (out as Record<string, unknown>)[key] = raw;
    }
  }
  return out;
}

function toSearchParams(q: Partial<VehicleQuery>): URLSearchParams {
  const sp = new URLSearchParams();
  for (const key of ALLOWED_KEYS) {
    const value = (q as Record<string, unknown>)[key];
    if (value === undefined || value === null || value === '') continue;
    sp.set(key, String(value));
  }
  return sp;
}

export function InventoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = useMemo(() => parseQuery(searchParams), [searchParams]);
  const sort = (query.sort as string | undefined) ?? 'ending_soon';
  const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const setQuery = useCallback(
    (next: Partial<VehicleQuery>) => {
      const sp = toSearchParams(next);
      setSearchParams(sp, { replace: false });
    },
    [setSearchParams],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.vehicles(query),
    queryFn: () => api.listVehicles({ ...query, limit: 100 }),
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex flex-1 items-center">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-3 text-slate-400"
          />
          <input
            ref={searchRef}
            type="search"
            value={(query.q as string | undefined) ?? ''}
            onChange={(e) => setQuery({ ...query, q: e.target.value })}
            placeholder="Search any field: VIN, color, engine, dealer, notes, price…"
            title="Focus here, then dictate with Wispr Flow — search updates as you type. Press / to focus from anywhere."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30 dark:border-slate-700 dark:bg-slate-900"
            aria-label="Search inventory; Wispr Flow dictation works when this field is focused"
          />
          <span className="pointer-events-none absolute right-3 text-[10px] text-slate-400">/</span>
        </div>
        <div className="flex items-center gap-2">
          <SortControl
            value={sort}
            onChange={(s) => setQuery({ ...query, sort: s as VehicleQuery['sort'] })}
          />
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <Filter size={14} aria-hidden="true" />
            Filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="hidden lg:block">
          <FilterRail
            value={query}
            onChange={setQuery}
            onReset={() => navigate('/')}
            totals={data?.total ?? 0}
          />
        </div>
        <Sheet
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
          side="bottom"
        >
          <FilterRail
            value={query}
            onChange={(next) => {
              setQuery(next);
            }}
            onReset={() => {
              navigate('/');
              setFiltersOpen(false);
            }}
            totals={data?.total ?? 0}
          />
        </Sheet>

        <div className="space-y-3">
          <div className="flex items-baseline justify-between text-sm">
            <p className="text-slate-500">
              {data ? `${data.total} lots` : 'Loading…'}{' '}
              <span
                aria-live="polite"
                className="ml-2 inline-flex items-center gap-1 text-xs text-emerald-600"
              >
                <span className="inline-block size-1.5 animate-pulse rounded-full bg-emerald-500" />{' '}
                Live
              </span>
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-red-300 bg-red-50 p-6 text-center text-sm text-red-700 dark:bg-red-950/30">
              <p>Failed to load inventory.</p>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void refetch()}>
                Try again
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
              <p>No matches.</p>
              <p className="mt-1">Try widening price or removing filters.</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={() => navigate('/')}>
                Reset filters
              </Button>
            </div>
          ) : (
            <InventoryGrid items={items} />
          )}
        </div>
      </div>
    </div>
  );
}
