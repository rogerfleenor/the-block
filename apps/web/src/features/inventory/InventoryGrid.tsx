import { measureElement, useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';

import { VehicleCard } from './VehicleCard';

import type { VehicleListItem, WsServerMessage } from '@block/shared';

import { getWsClient } from '@/lib/ws';

interface InventoryGridProps {
  items: VehicleListItem[];
}

const ROW_GAP = 16;
/** Initial row height guess until `measureElement` runs (image + meta + gap). */
const EST_ROW_HEIGHT = 420;

function columnCountForWidth(w: number) {
  if (w < 640) return 1;
  if (w < 900) return 2;
  if (w < 1200) return 3;
  return 4;
}

/**
 * Virtualized grid (4 columns on wide desktop, down to 1 on mobile). Row heights are
 * measured so cards never overlap when content is taller than the estimate.
 */
export function InventoryGrid({ items }: InventoryGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(() =>
    typeof window !== 'undefined' ? columnCountForWidth(window.innerWidth) : 3,
  );
  const [flashTicks, setFlashTicks] = useState<Record<string, number>>({});

  useEffect(() => {
    const apply = () => {
      if (typeof window === 'undefined') return;
      setCols(columnCountForWidth(window.innerWidth));
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, []);

  useEffect(() => {
    const ws = getWsClient();
    ws.subscribe('inventory');
    const off = ws.on((msg: WsServerMessage) => {
      if (msg.type !== 'bid:updated') return;
      setFlashTicks((prev) => ({ ...prev, [msg.vehicleId]: Date.now() }));
    });
    return () => {
      off();
      ws.unsubscribe('inventory');
    };
  }, []);

  const rows = useMemo(() => {
    const result: VehicleListItem[][] = [];
    for (let i = 0; i < items.length; i += cols) {
      result.push(items.slice(i, i + cols));
    }
    return result;
  }, [items, cols]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => EST_ROW_HEIGHT + ROW_GAP,
    overscan: 4,
    measureElement,
  });

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      ref={parentRef}
      className="relative max-h-[calc(100vh-180px)] overflow-auto rounded-xl"
      data-testid="inventory-grid"
    >
      <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: ROW_GAP,
              }}
            >
              <div
                className="grid min-w-0 gap-3 sm:gap-4"
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {row.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} flashTick={flashTicks[v.id] ?? 0} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
