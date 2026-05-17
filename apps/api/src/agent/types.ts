import type {
  AgentAction,
  AgentFact,
  AgentSuggestion,
  ToolCall,
  ToolName,
} from '@block/shared';
import type { ZodType, ZodTypeDef } from 'zod';

export interface AgentContext {
  vehicleId?: string;
  filters?: Record<string, unknown>;
  page?: string;
}

export interface ToolRunArgs {
  traceId: string;
  context: AgentContext;
  input: unknown;
}

export interface ToolRunResult {
  facts?: AgentFact[];
  suggestions?: AgentSuggestion[];
  actions?: AgentAction[];
  output: unknown;
  reply?: string;
}

export interface ToolDefinition<TInput, TOutput> {
  name: ToolName;
  description: string;
  // Use the looser ZodTypeAny so schemas with .default() (which produce a
  // narrower output than input) satisfy the contract without contortion.
  inputSchema: ZodType<TInput, ZodTypeDef, unknown>;
  outputSchema: ZodType<TOutput, ZodTypeDef, unknown>;
  run: (args: { traceId: string; context: AgentContext; input: TInput }) => Promise<ToolRunResult>;
}

export interface AgentInvokeArgs {
  utterance: string;
  context: AgentContext;
}

export interface AgentInvokeOutcome {
  traceId: string;
  facts: AgentFact[];
  suggestions: AgentSuggestion[];
  actions: AgentAction[];
  reply?: string;
  toolCalls: ToolCall[];
}
