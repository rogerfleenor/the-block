/**
 * Native-only formatting helpers (no date-fns).
 * Uses Intl.NumberFormat and Intl.RelativeTimeFormat.
 */

const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

const compactCurrencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('en-CA', {
  maximumFractionDigits: 0,
});

const relativeFormatter = new Intl.RelativeTimeFormat('en-CA', { numeric: 'auto' });

export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return currencyFormatter.format(amount);
}

export function formatCompactCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return compactCurrencyFormatter.format(amount);
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined || Number.isNaN(km)) return '—';
  return `${integerFormatter.format(km)} km`;
}

export function formatInteger(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return integerFormatter.format(n);
}

const RELATIVE_THRESHOLDS: Array<[number, Intl.RelativeTimeFormatUnit]> = [
  [60, 'second'],
  [60, 'minute'],
  [24, 'hour'],
  [7, 'day'],
  [4.34524, 'week'],
  [12, 'month'],
  [Number.POSITIVE_INFINITY, 'year'],
];

/** Returns "in 4h", "2m ago", etc. given a delta in milliseconds (now - then). */
export function formatRelative(target: Date | string | number, now: Date = new Date()): string {
  const targetTs = typeof target === 'number' ? target : new Date(target).getTime();
  if (Number.isNaN(targetTs)) return '—';
  const diffSec = Math.round((targetTs - now.getTime()) / 1000);
  let value = diffSec;
  let unitIndex = 0;
  for (const [factor, unit] of RELATIVE_THRESHOLDS) {
    if (Math.abs(value) < factor) {
      return relativeFormatter.format(Math.round(value), unit);
    }
    value /= factor;
    unitIndex += 1;
    if (unitIndex >= RELATIVE_THRESHOLDS.length) break;
  }
  return relativeFormatter.format(Math.round(value), 'year');
}

/**
 * Countdown style: "2h 14m", "4d 7h", "in 38s".
 * Designed for auction-ending displays where precision > linguistic naturalness.
 */
export function formatCountdown(target: Date | string | number, now: Date = new Date()): string {
  const targetTs = typeof target === 'number' ? target : new Date(target).getTime();
  if (Number.isNaN(targetTs)) return '—';
  const diffMs = targetTs - now.getTime();
  if (diffMs <= 0) return 'Ended';
  const totalSec = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

export function formatGrade(grade: number | null | undefined): string {
  if (grade === null || grade === undefined || Number.isNaN(grade)) return '—';
  return grade.toFixed(1);
}

/** "●●●●○" condition glyph row for a 0–5 grade. */
export function gradeDots(grade: number): string {
  const filled = Math.max(0, Math.min(5, Math.round(grade)));
  return '●'.repeat(filled) + '○'.repeat(5 - filled);
}
