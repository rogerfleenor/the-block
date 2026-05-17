import { describe, expect, it } from 'vitest';

import { formatCompactCurrency, formatCountdown, formatCurrency, formatKm, formatRelative, gradeDots } from '../format';

describe('format', () => {
  it('formats currency in CAD with no fractional digits', () => {
    expect(formatCurrency(22800)).toContain('22,800');
    expect(formatCurrency(0)).toContain('0');
    expect(formatCurrency(null)).toBe('—');
    expect(formatCurrency(undefined)).toBe('—');
  });

  it('formats compact currency', () => {
    const v = formatCompactCurrency(22800);
    expect(v).toMatch(/22\.8K|\$22\.8K|\$23K|CA\$22\.8K/);
  });

  it('formats kilometers', () => {
    expect(formatKm(123456)).toContain('km');
    expect(formatKm(123456)).toContain('123,456');
  });

  it('formats grade dots', () => {
    expect(gradeDots(3.8)).toHaveLength(5);
    expect(gradeDots(3.8).split('').filter((c) => c === '●').length).toBe(4);
  });

  it('relative time returns a string', () => {
    const future = new Date(Date.now() + 2 * 60 * 1000);
    const out = formatRelative(future);
    expect(out).toMatch(/min|minute|second/);
  });

  it('countdown formats hours and minutes', () => {
    const future = new Date(Date.now() + (2 * 3600 + 14 * 60) * 1000);
    const out = formatCountdown(future);
    expect(out).toMatch(/2h/);
  });

  it('countdown handles past', () => {
    const past = new Date(Date.now() - 1000);
    expect(formatCountdown(past)).toBe('Ended');
  });
});
