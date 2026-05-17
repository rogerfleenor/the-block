import { describe, expect, it } from 'vitest';

import { setFiltersTool } from './setFilters.js';

describe('setFilters tool', () => {
  it('input requires filters object', () => {
    expect(setFiltersTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it('emits a setFilters action', async () => {
    const out = await setFiltersTool.run({
      traceId: 't',
      context: {},
      input: { filters: { make: 'Toyota', minPrice: 5000 } },
    });
    expect(out.actions?.[0]?.kind).toBe('setFilters');
  });
});
