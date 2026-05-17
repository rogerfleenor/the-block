import {
  AgentFactSchema,
  RecommendMaxBidToolInputSchema,
  RecommendMaxBidToolOutputSchema,
  type RecommendMaxBidToolInput,
  type RecommendMaxBidToolOutput,
} from '@block/shared';

import { makeId } from '../../lib/ids.js';
import { getFacts } from '../facts.js';
import { type ToolDefinition } from '../types.js';

export const recommendMaxBidTool: ToolDefinition<
  RecommendMaxBidToolInput,
  RecommendMaxBidToolOutput
> = {
  name: 'recommendMaxBid',
  description: 'Compute an AI-cap recommendation derived from KBB retail + MMR + condition + pressure.',
  inputSchema: RecommendMaxBidToolInputSchema,
  outputSchema: RecommendMaxBidToolOutputSchema,
  run: async ({ input }) => {
    const computed = await getFacts(input.vehicleId);
    if (!computed) throw new Error(`Vehicle ${input.vehicleId} not found.`);
    if (!computed.recommended) {
      throw new Error('Insufficient pricing data to recommend a max bid.');
    }
    const rec = computed.recommended;
    const tolMap = { low: 0.96, medium: 1, high: 1.04 } as const;
    const adj = tolMap[input.riskTolerance];
    const adjusted: RecommendMaxBidToolOutput = {
      value: Math.round((rec.value * adj) / 50) * 50,
      low: rec.low,
      high: Math.max(rec.high, Math.round((rec.value * adj) / 50) * 50),
      rationale: `${rec.rationale} Risk tolerance: ${input.riskTolerance} (×${adj}).`,
      sources: rec.sources,
    };
    return {
      output: adjusted,
      facts: [
        AgentFactSchema.parse({
          id: makeId('fact'),
          vehicleId: input.vehicleId,
          kind: 'recommendation',
          text: `AI Max Bid $${adjusted.value.toLocaleString()}`,
          severity: 'low',
          sources: adjusted.sources,
          detail: adjusted.rationale,
          ts: new Date().toISOString(),
        }),
      ],
    };
  },
};
