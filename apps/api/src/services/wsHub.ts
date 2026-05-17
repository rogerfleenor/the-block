/**
 * Pub/sub fan-out for the `/ws` endpoint.
 *
 * Clients send {type:'subscribe'|'unsubscribe', topic} per WsClientMessageSchema.
 * Services call `broadcast(topic, msg)` and every subscribed socket gets it.
 *
 * Topics:
 *   - 'inventory'       -> all bid:updated events
 *   - 'vehicle:<id>'    -> bid:updated + intel:patch + agent:suggestion for a lot
 *   - 'agent:<traceId>' -> agent:trace deltas
 */

import { WsServerMessageSchema, type WsServerMessage } from '@block/shared';

import { baseLogger } from '../lib/logger.js';

type WireSocket = {
  readyState: number;
  send: (payload: string) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  close: () => void;
};

const OPEN_STATE = 1;

interface ClientRecord {
  socket: WireSocket;
  topics: Set<string>;
}

const clients = new Set<ClientRecord>();

export function registerSocket(socket: WireSocket): ClientRecord {
  const record: ClientRecord = { socket, topics: new Set() };
  clients.add(record);
  return record;
}

export function unregisterSocket(record: ClientRecord): void {
  clients.delete(record);
  record.topics.clear();
}

export function subscribe(record: ClientRecord, topic: string): void {
  record.topics.add(topic);
}

export function unsubscribe(record: ClientRecord, topic: string): void {
  record.topics.delete(topic);
}

export function sendTo(socket: WireSocket, msg: WsServerMessage): void {
  if (socket.readyState !== OPEN_STATE) return;
  const parsed = WsServerMessageSchema.safeParse(msg);
  if (!parsed.success) {
    baseLogger.warn({ issues: parsed.error.issues, msg }, 'ws: refused to send invalid message');
    return;
  }
  try {
    socket.send(JSON.stringify(parsed.data));
  } catch (err) {
    baseLogger.warn({ err }, 'ws: send failed');
  }
}

/** Fan out to every client subscribed to a topic. */
export function broadcast(topic: string, msg: WsServerMessage): void {
  for (const client of clients) {
    if (client.topics.has(topic)) {
      sendTo(client.socket, msg);
    }
  }
}

/** Fan out to multiple topics in one call (de-duped by socket). */
export function broadcastMany(topics: readonly string[], msg: WsServerMessage): void {
  const seen = new Set<WireSocket>();
  for (const topic of topics) {
    for (const client of clients) {
      if (client.topics.has(topic) && !seen.has(client.socket)) {
        sendTo(client.socket, msg);
        seen.add(client.socket);
      }
    }
  }
}

export function clientCount(): number {
  return clients.size;
}
