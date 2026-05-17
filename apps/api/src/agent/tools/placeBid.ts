import {
  AgentSuggestionSchema,
  PlaceBidToolInputSchema,
  TIMINGS,
  type AgentSuggestion,
  type PlaceBidToolInput,
} from '@block/shared';
import { z } from 'zod';

import { makeId } from '../../lib/ids.js';
import { getVehicle } from '../../services/vehicleStore.js';
import { getFacts } from '../facts.js';
import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({ suggestion: AgentSuggestionSchema });

export const placeBidTool: ToolDefinition<PlaceBidToolInput, { suggestion: AgentSuggestion }> = {
  name: 'placeBid',
  description:
    'Build a placeBid suggestion (NEVER executes). The UI shows a 5-second confirm card.',
  inputSchema: PlaceBidToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => {
    const vehicle = getVehicle(input.vehicleId);
    if (!vehicle) throw new Error(`Vehicle ${input.vehicleId} not found.`);
    const facts = await getFacts(input.vehicleId).catch(() => undefined);
    const sources = facts?.recommended?.sources ?? [];

    const suggestion: AgentSuggestion = AgentSuggestionSchema.parse({
      id: makeId('sugg'),
      kind: 'placeBid',
      vehicleId: vehicle.id,
      amount: input.amount,
      rationale: `Place $${input.amount.toLocaleString()} on lot ${vehicle.lot} (${vehicle.year} ${vehicle.make} ${vehicle.model}). Current bid $${vehicle.current_bid.toLocaleString()}.`,
      sources,
      confirmWindowMs: TIMINGS.agentConfirmMs,
      ts: new Date().toISOString(),
    });

    return {
      output: { suggestion },
      suggestions: [suggestion],
    };
  },
};
