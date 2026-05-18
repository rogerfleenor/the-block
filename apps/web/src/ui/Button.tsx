import { forwardRef } from 'react';

import { cn } from './cn';

import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-1.5 font-semibold transition select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'rounded-full bg-accent text-accent-fg shadow-sm shadow-slate-900/10 hover:bg-accent-strong active:bg-accent-strong/95',
  secondary:
    'rounded-full border-2 border-accent bg-white text-accent hover:bg-accent-muted dark:border-accent dark:bg-slate-950 dark:text-blue-200 dark:hover:bg-slate-900',
  ghost:
    'rounded-lg bg-transparent text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
  danger: 'rounded-full bg-red-600 text-white hover:bg-red-500 active:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', full, className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      {...rest}
    />
  );
});
