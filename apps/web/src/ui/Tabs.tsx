import { useId, useState } from 'react';

import { cn } from './cn';

import type { ReactNode } from 'react';

export interface TabsTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabsTab[];
  initial?: string;
  className?: string;
  onTabChange?: (id: string) => void;
}

export function Tabs({ tabs, initial, className, onTabChange }: TabsProps) {
  const fallback = tabs[0]?.id ?? '';
  const [active, setActive] = useState<string>(initial ?? fallback);
  const baseId = useId();

  const activeTab = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label="Sections"
        className="-mx-1 flex flex-wrap gap-1 overflow-x-auto border-b border-neutral-200 px-1 pb-1 dark:border-neutral-800"
      >
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`${baseId}-${t.id}-panel`}
              id={`${baseId}-${t.id}-tab`}
              type="button"
              onClick={() => {
                setActive(t.id);
                onTabChange?.(t.id);
              }}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition',
                isActive
                  ? 'bg-accent/10 text-accent'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {activeTab ? (
        <div
          role="tabpanel"
          id={`${baseId}-${activeTab.id}-panel`}
          aria-labelledby={`${baseId}-${activeTab.id}-tab`}
          className="pt-4"
        >
          {activeTab.content}
        </div>
      ) : null}
    </div>
  );
}
