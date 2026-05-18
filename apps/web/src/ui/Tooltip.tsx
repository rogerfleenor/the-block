import { useId, useState } from 'react';

import { cn } from './cn';

import type { PropsWithChildren, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
}

/** Headless tooltip — hover / focus reveals; ARIA-described. */
export function Tooltip({
  content,
  side = 'top',
  className,
  children,
}: PropsWithChildren<TooltipProps>) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className={cn('relative inline-flex', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>
      {open ? (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute left-1/2 z-30 min-w-[14rem] -translate-x-1/2 whitespace-normal rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
