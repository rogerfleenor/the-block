import { describe, expect, it } from 'vitest';

import { hashSeed, mulberry32, seededRng, vinSeed } from './rng.js';

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    expect(a()).toBe(b());
    expect(a()).toBe(b());
    expect(a()).toBe(b());
  });
  it('produces values in [0,1)', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('hashSeed', () => {
  it('is stable across calls', () => {
    expect(hashSeed('hello')).toBe(hashSeed('hello'));
  });
  it('differs for different inputs', () => {
    expect(hashSeed('foo')).not.toBe(hashSeed('bar'));
  });
});

describe('vinSeed', () => {
  it('produces different seeds per provider for the same VIN', () => {
    expect(vinSeed('TRD7L1KS0HNB5X3K3', 'kbb')).not.toBe(vinSeed('TRD7L1KS0HNB5X3K3', 'manheim'));
  });
});

describe('seededRng', () => {
  it('produces deterministic sequences', () => {
    const a = seededRng('vin:1');
    const b = seededRng('vin:1');
    expect(a.int(0, 100)).toBe(b.int(0, 100));
    expect(a.pick(['a', 'b', 'c'])).toBe(b.pick(['a', 'b', 'c']));
  });
  it('chance is bounded', () => {
    const r = seededRng(1);
    let trues = 0;
    for (let i = 0; i < 1000; i++) if (r.chance(0.5)) trues++;
    expect(trues).toBeGreaterThan(400);
    expect(trues).toBeLessThan(600);
  });
});
