/**
 * mockLLM — deterministic rule-based intent router.
 *
 * Parses the utterance against a small grammar, builds a sequence of tool
 * calls, and runs them under the same guardrail layer the real LLM uses.
 * Same shape in, same shape out — only the planner differs.
 */

import {
  type AgentAction,
  type AgentFact,
  type AgentSuggestion,
  type ToolCall,
  type ToolName,
  type VehicleFilters,
} from '@block/shared';

import { makeId } from '../lib/ids.js';
import { logger } from '../lib/logger.js';

import { GuardrailError, runGuardedTool } from './guardrails.js';
import { appendAgentLog } from './log.js';
import { type AgentContext, type AgentInvokeArgs, type AgentInvokeOutcome } from './types.js';

interface PlannedCall {
  tool: ToolName;
  input: unknown;
}

const BID_RX = /\bbid\s+\$?(\d[\d,.]*)\b/i;
const FILTER_PRICE_UNDER_RX = /under\s+\$?(\d[\d,.kK]*)/i;
const FILTER_PRICE_OVER_RX = /over\s+\$?(\d[\d,.kK]*)/i;
const FILTER_PROVINCE_RX = /\bin\s+([a-z]{2,}(?:\s+[a-z]+)*)\b/i;
const RECALL_RX = /(recall|risk|title|salvage|damage|repo|accident)/i;
const COMPS_RX = /(compare|comps?|similar|matches)/i;
const PRICE_RX = /(overpriced|fair price|good deal|worth it|how much|price)/i;
const SHOW_RX = /\b(show|find|filter|browse|search)\b/i;
const BODY_RX = /\b(suv|truck|sedan|hatch|coupe|wagon|convertible|van|crossover)\b/i;

const MAKE_HINTS = [
  'toyota',
  'ford',
  'honda',
  'chevrolet',
  'chevy',
  'bmw',
  'tesla',
  'mazda',
  'volkswagen',
  'subaru',
  'audi',
  'nissan',
  'hyundai',
  'kia',
  'gmc',
  'jeep',
  'ram',
];

const PROVINCE_HINTS: Record<string, string> = {
  ontario: 'Ontario',
  alberta: 'Alberta',
  bc: 'British Columbia',
  britishcolumbia: 'British Columbia',
  quebec: 'Quebec',
  manitoba: 'Manitoba',
};

function parseMoney(raw: string): number {
  const clean = raw.toLowerCase().replace(/[,$]/g, '');
  if (clean.endsWith('k')) {
    return Math.round(Number(clean.slice(0, -1)) * 1000);
  }
  return Number(clean);
}

/** ISO-style VIN: 17 chars; also accept 11–16 for partial search. */
function extractVinFromUtterance(utterance: string): string | undefined {
  const t = utterance.trim();
  if (!t) return undefined;
  const m17 = /\b([A-HJ-NPR-Z0-9]{17})\b/i.exec(t);
  if (m17?.[1]) return m17[1].toUpperCase();
  const mPrefix = /\bvin\s*[:\s.-]*\s*([A-HJ-NPR-Z0-9]{6,17})\b/i.exec(t);
  if (mPrefix?.[1] && mPrefix[1].length >= 11) return mPrefix[1].toUpperCase();
  const compact = t.replace(/\s/g, '');
  if (/^[A-HJ-NPR-Z0-9]{11,17}$/i.test(compact)) return compact.toUpperCase();
  return undefined;
}

type ParsedFilters = Partial<VehicleFilters>;

function parseFilters(utterance: string): ParsedFilters {
  const lower = utterance.toLowerCase();
  const out: ParsedFilters = {};
  for (const m of MAKE_HINTS) {
    if (lower.includes(m)) {
      out.make = m === 'chevy' ? 'Chevrolet' : m.charAt(0).toUpperCase() + m.slice(1);
      break;
    }
  }
  const body = BODY_RX.exec(lower);
  if (body && body[1]) {
    out.body = body[1].charAt(0).toUpperCase() + body[1].slice(1);
  }
  const province = FILTER_PROVINCE_RX.exec(lower);
  if (province && province[1]) {
    const key = province[1].toLowerCase().replace(/\s/g, '');
    if (PROVINCE_HINTS[key]) out.province = PROVINCE_HINTS[key];
  }
  const under = FILTER_PRICE_UNDER_RX.exec(lower);
  if (under && under[1]) out.maxPrice = parseMoney(under[1]);
  const over = FILTER_PRICE_OVER_RX.exec(lower);
  if (over && over[1]) out.minPrice = parseMoney(over[1]);
  if (/low\s+mileage|low\s+km/.test(lower)) out.minGrade = 3.5;
  if (/\bhybrid\b/.test(lower)) out.fuelType = 'hybrid';
  if (/\bdiesel\b/.test(lower)) out.fuelType = 'diesel';
  if (/\be-?gas|gasoline|petrol\b/.test(lower)) out.fuelType = 'gasoline';
  if (/\bawd\b/.test(lower)) out.drivetrain = 'AWD';
  if (/\bfwd\b/.test(lower)) out.drivetrain = 'FWD';
  if (/\brwd\b/.test(lower)) out.drivetrain = 'RWD';
  if (/\b4wd|four\s*wheel\b/.test(lower)) out.drivetrain = '4WD';
  if (/\bcvt\b/.test(lower)) out.transmission = 'CVT';
  if (/\bautomatic\b/.test(lower)) out.transmission = 'automatic';
  if (/\bmanual\b/.test(lower)) out.transmission = 'manual';
  if (/\bclean\s+title\b/.test(lower)) out.title = 'clean';
  if (/\bsalvage\b/.test(lower)) out.title = 'salvage';
  if (/\brebuilt\b/.test(lower)) out.title = 'rebuilt';
  const vin = /\bvin\s*[:\s]?\s*([A-HJ-NPR-Z0-9]{6,17})\b/i.exec(utterance);
  if (vin && vin[1] && vin[1].length >= 11) out.vin = vin[1].toUpperCase();
  return out;
}

/** Remaining words after stripping command + price phrases (used as inventory `q`). */
function utteranceToInventoryQ(utterance: string): string | undefined {
  let s = utterance.replace(/^(find|show|search|filter|browse|look\s+for)\s+/gi, '');
  s = s.replace(/\b(under|over)\s+\$?\d[\d,.kK]*\b/gi, '');
  s = s.replace(/\bin\s+[a-z]{2,}(?:\s+[a-z]+)*\b/gi, '');
  s = s.trim();
  if (s.length < 2) return undefined;
  return s;
}

export function planUtterance(args: AgentInvokeArgs): {
  plan: PlannedCall[];
  reply: string;
} {
  const lower = args.utterance.toLowerCase().trim();
  const vehicleId = args.context.vehicleId;
  const plan: PlannedCall[] = [];

  const bidMatch = BID_RX.exec(args.utterance);
  if (bidMatch && bidMatch[1] && vehicleId) {
    plan.push({ tool: 'placeBid', input: { vehicleId, amount: parseMoney(bidMatch[1]) } });
    return { plan, reply: `Proposed bid suggestion — please confirm.` };
  }

  if (PRICE_RX.test(lower) && vehicleId) {
    plan.push({ tool: 'recommendMaxBid', input: { vehicleId, riskTolerance: 'medium' } });
    plan.push({ tool: 'explainPrice', input: { vehicleId } });
    return { plan, reply: 'Pulled valuation summary.' };
  }

  if (RECALL_RX.test(lower) && vehicleId) {
    plan.push({ tool: 'flagRisks', input: { vehicleId } });
    return { plan, reply: 'Scanned safety + history sources.' };
  }

  if (COMPS_RX.test(lower) && vehicleId) {
    plan.push({ tool: 'findComps', input: { vehicleId, limit: 3 } });
    return { plan, reply: 'Pulled comparable listings.' };
  }

  const vin = extractVinFromUtterance(args.utterance);
  if (vin) {
    const filters = { vin };
    plan.push({
      tool: 'searchInventory',
      input: { filters, sort: 'ending_soon', limit: 12 },
    });
    plan.push({ tool: 'setFilters', input: { filters } });
    return { plan, reply: `Searching inventory for VIN ${vin}.` };
  }

  if (SHOW_RX.test(lower) || /\b(under|over)\b/.test(lower)) {
    const filters = parseFilters(args.utterance);
    const q = utteranceToInventoryQ(args.utterance);
    const merged = { ...filters, ...(q ? { q } : {}) };
    plan.push({
      tool: 'searchInventory',
      input: {
        q,
        filters: Object.keys(filters).length ? filters : undefined,
        sort: 'ending_soon',
        limit: 12,
      },
    });
    plan.push({ tool: 'setFilters', input: { filters: merged } });
    return { plan, reply: 'Applied filters to inventory.' };
  }

  if (vehicleId) {
    plan.push({ tool: 'getIntel', input: { vehicleId } });
    return { plan, reply: 'Pulled vehicle intel.' };
  }

  return {
    plan: [],
    reply: "I couldn't map that to a tool. Try 'bid <amount>' or 'show trucks under 25k'.",
  };
}

export async function invokeMockAgent(args: AgentInvokeArgs): Promise<AgentInvokeOutcome> {
  const traceId = makeId('trace');
  const log = logger();
  const { plan, reply } = planUtterance(args);

  const facts: AgentFact[] = [];
  const suggestions: AgentSuggestion[] = [];
  const actions: AgentAction[] = [];
  const toolCalls: ToolCall[] = [];

  await appendAgentLog({
    requestId: log.bindings().requestId ?? 'no-request',
    traceId,
    kind: 'invoke',
    payload: {
      utterance: args.utterance,
      context: args.context,
      plannedTools: plan.map((p) => p.tool),
    },
  });

  for (const step of plan) {
    try {
      const { name, output, result, durationMs } = await runGuardedTool({
        traceId,
        name: step.tool,
        context: args.context as AgentContext,
        input: step.input,
      });
      if (result.facts) facts.push(...result.facts);
      if (result.suggestions) suggestions.push(...result.suggestions);
      if (result.actions) actions.push(...result.actions);
      toolCalls.push({ name, input: step.input, output, durationMs });
      await appendAgentLog({
        requestId: log.bindings().requestId ?? 'no-request',
        traceId,
        kind: 'tool',
        payload: { name, input: step.input, durationMs, ok: true },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const code = err instanceof GuardrailError ? err.code : 'TOOL_ERROR';
      toolCalls.push({ name: step.tool, input: step.input, error: `${code}: ${message}` });
      await appendAgentLog({
        requestId: log.bindings().requestId ?? 'no-request',
        traceId,
        kind: 'error',
        payload: { tool: step.tool, code, message },
      });
    }
  }

  return {
    traceId,
    facts,
    suggestions,
    actions,
    reply,
    toolCalls,
  };
}
