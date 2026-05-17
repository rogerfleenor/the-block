import { ExplainPriceToolInputSchema, type ExplainPriceToolInput } from '@block/shared';
import { z } from 'zod';

import { getFacts } from '../facts.js';
import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({
  verdict: z.enum(['underpriced', 'fair', 'overpriced']),
  delta: z.number(),
  text: z.string(),
});

export const explainPriceTool: ToolDefinition<
  ExplainPriceToolInput,
  z.infer<typeof OutputSchema>
> = {
  name: 'explainPrice',
  description: 'Compare current bid to MMR + KBB retail mid and explain whether it is fair.',
  inputSchema: ExplainPriceToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => {
    const computed = await getFacts(input.vehicleId);
    if (!computed) throw new Error(`Vehicle ${input.vehicleId} not found.`);
    if (!computed.recommended) {
      throw new Error('Insufficient valuation data.');
    }
    const current = computed.vehicle.current_bid;
    const target = computed.recommended.value;
    const delta = current - target;
    let verdict: 'underpriced' | 'fair' | 'overpriced';
    if (delta < -target * 0.05) verdict = 'underpriced';
    else if (delta > target * 0.05) verdict = 'overpriced';
    else verdict = 'fair';

    const text =
      verdict === 'underpriced'
        ? `Current bid is $${Math.abs(delta).toLocaleString()} below the AI cap. Room to bid.`
        : verdict === 'overpriced'
          ? `Current bid is $${Math.abs(delta).toLocaleString()} above the AI cap. Consider passing.`
          : `Current bid is within ~5% of the AI cap. Priced fairly.`;

    return {
      output: { verdict, delta, text },
      reply: text,
      facts: computed.facts,
    };
  },
};
