import {
  GetIntelToolInputSchema,
  VehicleIntelSchema,
  type GetIntelToolInput,
  type VehicleIntel,
} from '@block/shared';

import { aggregateIntel } from '../../services/intelAggregator.js';
import { getVehicle } from '../../services/vehicleStore.js';
import { type ToolDefinition } from '../types.js';

export const getIntelTool: ToolDefinition<GetIntelToolInput, VehicleIntel> = {
  name: 'getIntel',
  description: 'Fetch the composite Vehicle Intelligence payload (optionally scoped to categories).',
  inputSchema: GetIntelToolInputSchema,
  outputSchema: VehicleIntelSchema,
  run: async ({ input }) => {
    const v = getVehicle(input.vehicleId);
    if (!v) throw new Error(`Vehicle ${input.vehicleId} not found.`);
    const intel = await aggregateIntel({
      vehicleId: v.id,
      vin: v.vin,
      vehicleHints: {
        year: v.year,
        make: v.make,
        model: v.model,
        trim: v.trim,
        bodyStyle: v.body_style,
      },
      ...(input.categories ? { categories: input.categories } : {}),
    });
    const okCount = intel.results.filter((r) => r.status === 'ok').length;
    return {
      output: intel,
      reply: `Pulled ${okCount}/${intel.results.length} provider sources for ${v.year} ${v.make} ${v.model}.`,
    };
  },
};
