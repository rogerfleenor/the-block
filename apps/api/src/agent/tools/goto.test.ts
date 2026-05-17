import { describe, expect, it } from 'vitest';

import { gotoTool } from './goto.js';

describe('goto tool', () => {
  it('requires path', () => {
    expect(gotoTool.inputSchema.safeParse({}).success).toBe(false);
  });

  it('emits a goto action with the given path', async () => {
    const out = await gotoTool.run({
      traceId: 't',
      context: {},
      input: { path: '/v/some-id' },
    });
    const action = out.actions?.[0];
    expect(action?.kind).toBe('goto');
    if (action?.kind === 'goto') {
      expect(action.path).toBe('/v/some-id');
    }
  });
});
