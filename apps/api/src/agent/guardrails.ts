import { ToolNameSchema, type ToolName } from '@block/shared';

import { getTool } from './tools/index.js';
import { type AgentContext, type ToolRunResult } from './types.js';

export class GuardrailError extends Error {
  public override readonly name = 'GuardrailError';
  public readonly code: string;
  public readonly details: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/** True if `name` is a known, allowlisted tool. */
export function isAllowedTool(name: string): name is ToolName {
  const parsed = ToolNameSchema.safeParse(name);
  if (!parsed.success) return false;
  return getTool(parsed.data) !== undefined;
}

/** Validate input + invoke. Rejects unknown tools and bad shapes with structured errors. */
export async function runGuardedTool(args: {
  traceId: string;
  name: string;
  context: AgentContext;
  input: unknown;
}): Promise<{ name: ToolName; output: unknown; result: ToolRunResult; durationMs: number }> {
  const nameParsed = ToolNameSchema.safeParse(args.name);
  if (!nameParsed.success) {
    throw new GuardrailError('TOOL_NOT_ALLOWED', `Tool '${args.name}' is not on the allowlist.`);
  }
  const tool = getTool(nameParsed.data);
  if (!tool) {
    throw new GuardrailError('TOOL_NOT_FOUND', `Tool '${nameParsed.data}' is not registered.`);
  }
  const inputParsed = tool.inputSchema.safeParse(args.input);
  if (!inputParsed.success) {
    throw new GuardrailError(
      'INVALID_INPUT',
      `Input validation failed for ${tool.name}: ${inputParsed.error.issues[0]?.message ?? 'unknown'}`,
      inputParsed.error.issues,
    );
  }
  const started = Date.now();
  const result = await tool.run({ traceId: args.traceId, context: args.context, input: inputParsed.data });
  const outputParsed = tool.outputSchema.safeParse(result.output);
  if (!outputParsed.success) {
    throw new GuardrailError(
      'INVALID_OUTPUT',
      `Output validation failed for ${tool.name}: ${outputParsed.error.issues[0]?.message ?? 'unknown'}`,
      outputParsed.error.issues,
    );
  }
  return {
    name: tool.name,
    output: outputParsed.data,
    result,
    durationMs: Date.now() - started,
  };
}
