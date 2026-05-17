import { describe, expect, it } from 'vitest';

import { ALL_PROVIDERS } from './registry.js';

import type { ProviderInput } from './types.js';

const SAMPLE_INPUT: ProviderInput = {
  vehicleId: 'test-vehicle',
  vin: 'DETERMINISMTEST01',
  year: 2021,
  make: 'Toyota',
  model: 'Tacoma',
  trim: 'TRD Off-Road',
  bodyStyle: 'Truck',
};

describe('provider determinism', () => {
  for (const provider of ALL_PROVIDERS) {
    it(`${provider.name}: same VIN → identical output`, () => {
      const a = provider.mock(SAMPLE_INPUT as never);
      const b = provider.mock(SAMPLE_INPUT as never);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      const parsed = provider.schema.safeParse(a);
      expect(parsed.success).toBe(true);
    });
  }

  it('different VIN → different output for at least the kbb provider', () => {
    const kbb = ALL_PROVIDERS.find((p) => p.name === 'kbb');
    expect(kbb).toBeDefined();
    const a = kbb!.mock({ ...SAMPLE_INPUT, vin: 'AAAAAAAAAAAAAAAAA' } as never);
    const b = kbb!.mock({ ...SAMPLE_INPUT, vin: 'BBBBBBBBBBBBBBBBB' } as never);
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b));
  });
});
