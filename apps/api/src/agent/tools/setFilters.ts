import { SetFiltersToolInputSchema, type SetFiltersToolInput } from '@block/shared';
import { z } from 'zod';

import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({ applied: z.boolean() });

export const setFiltersTool: ToolDefinition<SetFiltersToolInput, z.infer<typeof OutputSchema>> = {
  name: 'setFilters',
  description:
    'Emit setFilters so the UI updates URL + inventory. Filters mirror GET /api/vehicles query params (all vehicle fields).',
  inputSchema: SetFiltersToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => ({
    output: { applied: true },
    actions: [{ kind: 'setFilters', filters: input.filters }],
  }),
};
