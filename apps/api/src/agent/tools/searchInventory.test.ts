import { beforeAll, describe, expect, it } from 'vitest';

import { bootForTests } from '../../test/setup.js';

import { searchInventoryTool } from './searchInventory.js';

describe('searchInventory tool', () => {
  beforeAll(async () => {
    await bootForTests();
  });

  it('parses default values', () => {
    const parsed = searchInventoryTool.inputSchema.parse({});
    expect(parsed.limit).toBe(12);
  });

  it('rejects out-of-range limit', () => {
    expect(searchInventoryTool.inputSchema.safeParse({ limit: 9999 }).success).toBe(false);
  });

  it('returns matched ids and emits a setFilters action', async () => {
    const result = await searchInventoryTool.run({
      traceId: 't',
      context: {},
      input: { limit: 5, filters: { make: 'Toyota' }, sort: 'ending_soon' },
    });
    const out = searchInventoryTool.outputSchema.parse(result.output) as {
      matchedIds: string[];
      total: number;
    };
    expect(Array.isArray(out.matchedIds)).toBe(true);
    expect(out.matchedIds.length).toBeLessThanOrEqual(5);
    expect(result.actions?.[0]?.kind).toBe('setFilters');
  });
});
