import type { AgentInvokeRequest, WsServerMessage } from '@block/shared';

import { api } from '@/lib/api';
import { getWsClient } from '@/lib/ws';
import { useAgentStore } from '@/state/agentStore';


/** Thin wrapper around POST /api/agent/invoke + WS push events. */
export const agentClient = {
  async invoke(req: AgentInvokeRequest) {
    return api.invokeAgent(req);
  },
  async getFacts(vehicleId: string) {
    return api.getAgentFacts(vehicleId);
  },
};

let attached = false;

/** Subscribe to WS-pushed facts/suggestions and shove them into the store. */
export function attachAgentWsListeners(): () => void {
  if (attached) return () => undefined;
  attached = true;
  const ws = getWsClient();
  const off = ws.on((msg: WsServerMessage) => {
    if (msg.type === 'agent:fact') {
      useAgentStore.getState().appendFact(msg.fact);
    } else if (msg.type === 'agent:suggestion') {
      useAgentStore.getState().pushSuggestion(msg.suggestion);
    }
  });
  return () => {
    attached = false;
    off();
  };
}
