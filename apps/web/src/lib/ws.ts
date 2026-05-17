import { WS_PATH } from '@block/shared';

import type { WsClientMessage, WsServerMessage, WsTopic } from '@block/shared';

type Listener = (msg: WsServerMessage) => void;

/**
 * Cheap structural guard for incoming WS messages. The server uses the
 * shared Zod `WsServerMessageSchema` to encode, so a discriminated `type`
 * field is always present; we don't pay for runtime Zod here.
 */
function looksLikeServerMessage(value: unknown): value is WsServerMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string'
  );
}

interface WsClientOptions {
  url?: string;
  /** Optional broadcast channel name for same-browser fan-out. */
  broadcastChannelName?: string;
}

/**
 * Native WebSocket wrapper with:
 *  - exponential backoff reconnect
 *  - subscribe/unsubscribe replay on reconnect
 *  - BroadcastChannel fan-out so cross-tab updates land without a server roundtrip
 *  - tolerant of missing server (logs warning, keeps retrying)
 */
export class WsClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private subscribedTopics = new Set<WsTopic>();
  private retries = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stopped = false;
  private url: string;
  private channel: BroadcastChannel | null = null;

  constructor(opts: WsClientOptions = {}) {
    this.url = opts.url ?? this.deriveUrl();
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(opts.broadcastChannelName ?? 'auction');
      this.channel.onmessage = (e: MessageEvent<unknown>) => {
        if (looksLikeServerMessage(e.data)) {
          this.dispatch(e.data, { skipBroadcast: true });
        }
      };
    }
  }

  private deriveUrl(): string {
    const envUrl = (import.meta.env.VITE_WS_URL as string | undefined) ?? '';
    if (envUrl.length > 0) return envUrl;
    if (typeof window === 'undefined') return `ws://localhost:4000${WS_PATH}`;
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${WS_PATH}`;
  }

  connect(): void {
    if (this.stopped) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    try {
      this.ws = new WebSocket(this.url);
    } catch (err) {
      this.scheduleReconnect();
      console.warn('[ws] failed to open', err);
      return;
    }
    this.ws.onopen = () => {
      this.retries = 0;
      for (const topic of this.subscribedTopics) {
        this.send({ type: 'subscribe', topic });
      }
    };
    this.ws.onmessage = (event: MessageEvent<string | ArrayBuffer | Blob>) => {
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!looksLikeServerMessage(payload)) return;
      this.dispatch(payload);
    };
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => {
      // closure handles retry
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    if (this.reconnectTimer) return;
    const backoff = Math.min(1_000 * 2 ** this.retries, 30_000);
    this.retries += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, backoff);
  }

  private dispatch(msg: WsServerMessage, opts: { skipBroadcast?: boolean } = {}): void {
    for (const fn of this.listeners) {
      try {
        fn(msg);
      } catch (err) {
        console.error('[ws] listener threw', err);
      }
    }
    if (!opts.skipBroadcast && this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // ignore
      }
    }
  }

  /** Broadcast a server-shaped message to other tabs without touching the server. Used for optimistic bid updates. */
  broadcastLocal(msg: WsServerMessage): void {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch {
        // ignore
      }
    }
    this.dispatch(msg, { skipBroadcast: true });
  }

  subscribe(topic: WsTopic): void {
    this.subscribedTopics.add(topic);
    this.send({ type: 'subscribe', topic });
  }

  unsubscribe(topic: WsTopic): void {
    this.subscribedTopics.delete(topic);
    this.send({ type: 'unsubscribe', topic });
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  send(msg: WsClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {
      // ignore
    }
  }

  stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
    }
    this.ws = null;
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // ignore
      }
    }
    this.channel = null;
  }
}

let singleton: WsClient | null = null;

export function getWsClient(): WsClient {
  if (!singleton) {
    singleton = new WsClient();
    if (typeof window !== 'undefined') {
      singleton.connect();
    }
  }
  return singleton;
}
