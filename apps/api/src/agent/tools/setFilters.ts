import { SetFiltersToolInputSchema, type SetFiltersToolInput } from '@block/shared';
import { z } from 'zod';

import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({ applied: z.boolean() });

export const setFiltersTool: ToolDefinition<SetFiltersToolInput, z.infer<typeof OutputSchema>> = {
  name: 'setFilters',
  description: 'Emit a setFilters action so the FE can update the inventory filter sidebar.',
  inputSchema: SetFiltersToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => ({
    output: { applied: true },
    actions: [{ kind: 'setFilters', filters: input.filters }],
  }),
};
