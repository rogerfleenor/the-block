import {
  SearchInventoryToolInputSchema,
  SearchInventoryToolOutputSchema,
  VehicleQuerySchema,
  type SearchInventoryToolInput,
  type SearchInventoryToolOutput,
} from '@block/shared';

import { listVehicles } from '../../services/vehicleStore.js';
import { type ToolDefinition } from '../types.js';

export const searchInventoryTool: ToolDefinition<
  SearchInventoryToolInput,
  SearchInventoryToolOutput
> = {
  name: 'searchInventory',
  description: 'Search the inventory by query/filters/sort. Returns matched vehicle ids.',
  inputSchema: SearchInventoryToolInputSchema,
  outputSchema: SearchInventoryToolOutputSchema,
  run: async ({ input }) => {
    const query = VehicleQuerySchema.parse({
      q: input.q,
      sort: input.sort ?? 'ending_soon',
      limit: input.limit,
      ...input.filters,
    });
    const page = listVehicles(query);
    const output: SearchInventoryToolOutput = {
      matchedIds: page.items.map((v) => v.id),
      total: page.total,
    };
    return {
      output,
      actions: [
        {
          kind: 'setFilters',
          filters: input.filters ?? {},
        },
      ],
    };
  },
};
