import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useMemo, useRef, useState } from 'react';


import { VehicleCard } from './VehicleCard';

import type { VehicleListItem, WsServerMessage } from '@block/shared';

import { getWsClient } from '@/lib/ws';

interface InventoryGridProps {
  items: VehicleListItem[];
}

const ROW_GAP = 16;
const CARD_HEIGHT = 320;

/**
 * Virtualized N-column grid (3 desktop, 2 tablet, 1 mobile). Rows are virtualized;
 * inside a row, cards stretch via CSS grid so the virtualizer only manages rows.
 */
export function InventoryGrid({ items }: InventoryGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState(3);
  const [flashTicks, setFlashTicks] = useState<Record<string, number>>({});

  useEffect(() => {
    const apply = () => {
      if (typeof window === 'undefined') return;
      const w = window.innerWidth;
      setCols(w >= 1280 ? 3 : w >= 768 ? 2 : 1);
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
    estimateSize: () => CARD_HEIGHT + ROW_GAP,
    overscan: 4,
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
                className="grid gap-4"
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
