import { FlagRisksToolInputSchema, type AgentFact, type FlagRisksToolInput } from '@block/shared';
import { z } from 'zod';

import { getFacts } from '../facts.js';
import { type ToolDefinition } from '../types.js';

const OutputSchema = z.object({
  risks: z.array(
    z.object({
      kind: z.string(),
      text: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
      sources: z.array(z.string()),
    }),
  ),
});

export const flagRisksTool: ToolDefinition<FlagRisksToolInput, z.infer<typeof OutputSchema>> = {
  name: 'flagRisks',
  description: 'Surface every recall / title brand / accident / repo fact for the vehicle.',
  inputSchema: FlagRisksToolInputSchema,
  outputSchema: OutputSchema,
  run: async ({ input }) => {
    const computed = await getFacts(input.vehicleId);
    if (!computed) throw new Error(`Vehicle ${input.vehicleId} not found.`);
    const riskFacts: AgentFact[] = computed.facts.filter((f) => f.kind === 'risk');
    return {
      output: {
        risks: riskFacts.map((f) => ({
          kind: f.kind,
          text: f.text,
          severity: f.severity,
          sources: f.sources,
        })),
      },
      facts: riskFacts,
      reply: riskFacts.length === 0 ? 'No flagged risks found.' : `${riskFacts.length} risk(s) flagged.`,
    };
  },
};
