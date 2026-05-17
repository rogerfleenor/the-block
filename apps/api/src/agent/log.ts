import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

import { baseLogger } from '../lib/logger.js';
import { AGENT_LOG } from '../lib/paths.js';

let initPromise: Promise<void> | null = null;

async function ensureLogDir(): Promise<void> {
  if (!initPromise) {
    initPromise = mkdir(dirname(AGENT_LOG), { recursive: true }).then(() => undefined);
  }
  await initPromise;
}

export interface AgentLogEvent {
  ts: string;
  requestId: string;
  traceId?: string;
  kind: 'invoke' | 'tool' | 'confirm' | 'cancel' | 'error';
  payload: Record<string, unknown>;
}

export async function appendAgentLog(event: Omit<AgentLogEvent, 'ts'>): Promise<void> {
  const enriched: AgentLogEvent = { ts: new Date().toISOString(), ...event };
  try {
    await ensureLogDir();
    await appendFile(AGENT_LOG, `${JSON.stringify(enriched)}\n`, 'utf-8');
  } catch (err) {
    baseLogger.warn({ err }, 'agentLog: append failed');
  }
}
