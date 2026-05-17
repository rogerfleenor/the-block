import {
  AgentFactSchema,
  FindCompsToolInputSchema,
  MarketCompsSchema,
  type FindCompsToolInput,
  type MarketComps,
} from '@block/shared';

import { makeId } from '../../lib/ids.js';
import { runOneProvider } from '../../services/intelAggregator.js';
import { type ToolDefinition } from '../types.js';

export const findCompsTool: ToolDefinition<FindCompsToolInput, MarketComps> = {
  name: 'findComps',
  description: 'Return market comparables for the vehicle (uses MarketCheck mock by default).',
  inputSchema: FindCompsToolInputSchema,
  outputSchema: MarketCompsSchema,
  run: async ({ input }) => {
    const result = await runOneProvider(input.vehicleId, 'marketcheck');
    if (!result || result.status !== 'ok') {
      throw new Error('Comps unavailable.');
    }
    const data = MarketCompsSchema.parse(result.data);
    const trimmed: MarketComps = {
      comps: data.comps.slice(0, input.limit),
      medianPrice: data.medianPrice,
      avgDaysOnMarket: data.avgDaysOnMarket,
    };
    return {
      output: trimmed,
      facts: [
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId: input.vehicleId,
          kind: 'comps_summary',
          text: `${trimmed.comps.length} comps · median $${trimmed.medianPrice.toLocaleString()}`,
          severity: 'low',
          sources: ['marketcheck'],
          ts: new Date().toISOString(),
        }),
      ],
    };
  },
};
