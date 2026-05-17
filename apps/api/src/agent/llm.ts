/**
 * Live LLM adapter built on the Vercel AI SDK. The default `mockLLM` path
 * in router.ts is used unless AGENT_LLM is set to a live provider AND that
 * provider's keys are present. On any setup error we fall back to mock so
 * the API never crashes on a misconfigured env var.
 *
 * Tools are derived from the same Zod input schemas the rule router uses,
 * so the LLM is on rails — every tool call is guard-railed before it runs.
 */


import { makeId } from '../lib/ids.js';
import { baseLogger } from '../lib/logger.js';
import { broadcast } from '../services/wsHub.js';

import { GuardrailError, runGuardedTool } from './guardrails.js';
import { appendAgentLog } from './log.js';
import { invokeMockAgent } from './router.js';
import { ALL_TOOLS } from './tools/index.js';
import { type AgentInvokeArgs, type AgentInvokeOutcome } from './types.js';

import type {
  AgentAction,
  AgentFact,
  AgentSuggestion,
  ToolCall,
} from '@block/shared';
import type * as Ai from 'ai';

type LiveModel = 'openai' | 'anthropic' | 'ollama';

export type AgentLlmMode = 'mock' | LiveModel;

export function detectMode(): AgentLlmMode {
  const v = (process.env.AGENT_LLM ?? 'mock').toLowerCase();
  if (v === 'openai' || v === 'anthropic' || v === 'ollama') return v;
  return 'mock';
}

interface LiveDeps {
  generateText: typeof Ai.generateText;
  tool: typeof Ai.tool;
  model: Ai.LanguageModel;
}

async function loadDeps(mode: LiveModel): Promise<LiveDeps | null> {
  try {
    const ai = await import('ai');
    if (mode === 'openai') {
      if (!process.env.OPENAI_API_KEY) return null;
      const mod = await import('@ai-sdk/openai');
      const model = mod.openai(process.env.OPENAI_MODEL ?? 'gpt-4o-mini');
      return { generateText: ai.generateText, tool: ai.tool, model };
    }
    if (mode === 'anthropic') {
      if (!process.env.ANTHROPIC_API_KEY) return null;
      const mod = await import('@ai-sdk/anthropic');
      const model = mod.anthropic(process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest');
      return { generateText: ai.generateText, tool: ai.tool, model };
    }
    const mod = await import('ollama-ai-provider');
    const model = mod.ollama(process.env.OLLAMA_MODEL ?? 'llama3.1');
    return { generateText: ai.generateText, tool: ai.tool, model };
  } catch (err) {
    baseLogger.warn({ err }, 'agent/llm: failed to load adapter — falling back to mock');
    return null;
  }
}

/**
 * Invoke the agent. Behaviour:
 *   AGENT_LLM=mock (default) → invokeMockAgent
 *   AGENT_LLM=openai|anthropic|ollama → call SDK once, accumulate tool calls
 *   Any failure → mock fallback (logged)
 */
export async function invokeAgent(args: AgentInvokeArgs): Promise<AgentInvokeOutcome> {
  const mode = detectMode();
  if (mode === 'mock') return invokeMockAgent(args);

  const deps = await loadDeps(mode);
  if (!deps) {
    baseLogger.warn({ mode }, 'agent/llm: missing keys/module — using mock');
    return invokeMockAgent(args);
  }

  const traceId = makeId('trace');
  // `tool({...})` has narrowly-inferred parameter generics that fight the
  // record indexer. We treat each entry as `any` at the boundary — the
  // runGuardedTool call still Zod-validates input + output.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toolMap: Record<string, any> = {};
  for (const t of ALL_TOOLS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toolMap[t.name] = (deps.tool as any)({
      description: t.description,
      parameters: t.inputSchema,
      execute: async (input: unknown) => {
        const { output } = await runGuardedTool({
          traceId,
          name: t.name,
          context: args.context,
          input,
        });
        return output;
      },
    });
  }

  const facts: AgentFact[] = [];
  const suggestions: AgentSuggestion[] = [];
  const actions: AgentAction[] = [];
  const toolCalls: ToolCall[] = [];

  try {
    const system =
      'You are AuctionAgent for a vehicle auction site. Use the provided tools to fulfil ' +
      'the user request. Never claim to have placed a bid — placeBid is a SUGGESTION only ' +
      'that the UI surfaces as a confirm card. Keep replies under 2 short sentences.';

    const result = await deps.generateText({
      model: deps.model,
      system,
      prompt: args.utterance,
      tools: toolMap,
      maxToolRoundtrips: 3,
    });

    for (const step of result.toolCalls ?? []) {
      toolCalls.push({
        name: step.toolName as never,
        input: step.args as never,
        durationMs: 0,
      });
    }

    broadcast(`agent:${traceId}`, { type: 'agent:trace', traceId, delta: result.text, done: true });

    await appendAgentLog({
      requestId: 'no-request',
      traceId,
      kind: 'invoke',
      payload: { utterance: args.utterance, model: mode, ok: true },
    });

    return { traceId, facts, suggestions, actions, reply: result.text, toolCalls };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    baseLogger.warn({ err: message, mode }, 'agent/llm: live LLM failed — using mock');
    if (err instanceof GuardrailError) {
      await appendAgentLog({ requestId: 'no-request', traceId, kind: 'error', payload: { code: err.code, message } });
    }
    return invokeMockAgent(args);
  }
}
