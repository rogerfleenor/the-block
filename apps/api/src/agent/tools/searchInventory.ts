import {
  SearchInventoryToolInputSchema,
  SearchInventoryToolOutputSchema,
  VehicleFiltersSchema,
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
  description:
    'Search inventory using free-text q (matches any vehicle field) plus structured filters (make, model substring, drivetrain, fuel, VIN, price, year, odometer, buy-now, etc.). Returns matched ids.',
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
    const appliedFilters = VehicleFiltersSchema.parse({
      ...input.filters,
      ...(input.q ? { q: input.q } : {}),
    });
    const output: SearchInventoryToolOutput = {
      matchedIds: page.items.map((v) => v.id),
      total: page.total,
    };
    return {
      output,
      actions: [
        {
          kind: 'setFilters',
          filters: appliedFilters,
        },
      ],
    };
  },
};
