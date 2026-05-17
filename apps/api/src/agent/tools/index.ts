import { type ToolName } from '@block/shared';

import { type ToolDefinition } from '../types.js';

import { explainPriceTool } from './explainPrice.js';
import { findCompsTool } from './findComps.js';
import { flagRisksTool } from './flagRisks.js';
import { getIntelTool } from './getIntel.js';
import { gotoTool } from './goto.js';
import { placeBidTool } from './placeBid.js';
import { recommendMaxBidTool } from './recommendMaxBid.js';
import { searchInventoryTool } from './searchInventory.js';
import { setFiltersTool } from './setFilters.js';

export const ALL_TOOLS: ReadonlyArray<ToolDefinition<unknown, unknown>> = [
  placeBidTool as ToolDefinition<unknown, unknown>,
  searchInventoryTool as ToolDefinition<unknown, unknown>,
  getIntelTool as ToolDefinition<unknown, unknown>,
  recommendMaxBidTool as ToolDefinition<unknown, unknown>,
  findCompsTool as ToolDefinition<unknown, unknown>,
  explainPriceTool as ToolDefinition<unknown, unknown>,
  flagRisksTool as ToolDefinition<unknown, unknown>,
  setFiltersTool as ToolDefinition<unknown, unknown>,
  gotoTool as ToolDefinition<unknown, unknown>,
];

const TOOL_MAP = new Map<ToolName, ToolDefinition<unknown, unknown>>(
  ALL_TOOLS.map((t) => [t.name, t]),
);

export function getTool(name: ToolName): ToolDefinition<unknown, unknown> | undefined {
  return TOOL_MAP.get(name);
}

export const TOOL_NAMES = ALL_TOOLS.map((t) => t.name);
