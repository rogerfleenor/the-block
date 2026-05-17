import { WsClientMessageSchema } from '@block/shared';

import { baseLogger } from '../lib/logger.js';
import {
  registerSocket,
  sendTo,
  subscribe,
  unregisterSocket,
  unsubscribe,
} from '../services/wsHub.js';

import type { FastifyInstance } from 'fastify';

const HEARTBEAT_MS = 30_000;

export function registerWsRoutes(app: FastifyInstance): void {
  app.get('/ws', { websocket: true } as never, (socket: unknown) => {
    // @fastify/websocket v10 passes the raw ws socket directly.
    const ws = socket as {
      readyState: number;
      send: (payload: string) => void;
      on: (evt: string, fn: (...args: unknown[]) => void) => void;
      close: () => void;
      ping?: () => void;
    };

    const record = registerSocket(ws);
    baseLogger.debug('ws: client connected');

    const heartbeat = setInterval(() => {
      try {
        ws.ping?.();
      } catch {
        // ignore
      }
    }, HEARTBEAT_MS);

    ws.on('message', (raw: unknown) => {
      const text = typeof raw === 'string' ? raw : Buffer.isBuffer(raw) ? raw.toString('utf-8') : String(raw);
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        sendTo(ws, { type: 'error', code: 'INVALID_JSON', message: 'message must be valid JSON' });
        return;
      }
      const safe = WsClientMessageSchema.safeParse(parsed);
      if (!safe.success) {
        sendTo(ws, {
          type: 'error',
          code: 'INVALID_MESSAGE',
          message: safe.error.issues[0]?.message ?? 'invalid client message',
        });
        return;
      }
      const msg = safe.data;
      switch (msg.type) {
        case 'subscribe':
          subscribe(record, msg.topic);
          break;
        case 'unsubscribe':
          unsubscribe(record, msg.topic);
          break;
        case 'ping':
          sendTo(ws, { type: 'pong', ts: Date.now() });
          break;
      }
    });

    ws.on('close', () => {
      clearInterval(heartbeat);
      unregisterSocket(record);
    });

    ws.on('error', (err: unknown) => {
      baseLogger.debug({ err }, 'ws: socket error');
    });
  });
}
