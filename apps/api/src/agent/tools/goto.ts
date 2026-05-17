import { GotoToolInputSchema, type GotoToolInput } from '@block/shared';
import { z } from 'zod';

import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({ path: z.string() });

export const gotoTool: ToolDefinition<GotoToolInput, z.infer<typeof OutputSchema>> = {
  name: 'goto',
  description: 'Emit a navigation action (FE consumes this to push the router).',
  inputSchema: GotoToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => ({
    output: { path: input.path },
    actions: [{ kind: 'goto', path: input.path }],
  }),
};
