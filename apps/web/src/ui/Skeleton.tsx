import { cn } from './cn';

import type { HTMLAttributes } from 'react';

export function Skeleton({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-neutral-200/70 dark:bg-neutral-800/70',
        className,
      )}
      {...rest}
    />
  );
}
