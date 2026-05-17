# CONTRACT — read-only for engineer agents

This is the **single source of truth** for the parallel build. Both the Frontend Engineer agent and the Backend Engineer agent must read this and conform to it. Any change here requires escalation to the orchestrator and a re-fork.

The runtime contract lives in code in **[`packages/shared`](../packages/shared/src/)** — Zod schemas + TS types + constants + WS event types + bid rules + VIN-seeded PRNG. Import everything via the `@block/shared` package; do not duplicate or re-derive these types.

---

## Ownership boundaries

| Agent             | OWNS (read + write) | READ-ONLY                                                          | MUST NEVER MODIFY                                                                                                                         |
| ----------------- | ------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend Engineer | `apps/web/**`       | `packages/shared/**`, `data/**`, this file, `arch.md`, `README.md` | `apps/api/**`, `packages/shared/**`, root `package.json`, `package-lock.json`, `eslint.config.js`, `.github/**`, `Dockerfile`, `fly.toml` |
| Backend Engineer  | `apps/api/**`       | `packages/shared/**`, `data/**`, this file, `arch.md`, `README.md` | `apps/web/**`, `packages/shared/**`, root `package.json`, `package-lock.json`, `eslint.config.js`, `.github/**`, `Dockerfile`, `fly.toml` |

Workspace `package.json` files (`apps/web/package.json`, `apps/api/package.json`) belong to the respective agent. New deps go there; **never** edit the root `package.json` or `package-lock.json`. After Phase 1 the orchestrator runs `npm install` once.

---

## Escalation rule

If you need to change anything in `packages/shared/`, the root configs, or this CONTRACT.md:

1. **Stop** writing code.
2. Append a proposal block to your `.agents/HANDOFF-{fe,be}.md` with: what change, why, and what breaks without it.
3. Surface the escalation in your final summary message.
4. Do not silently work around the contract.

---

## Ports and paths

```ts
import { API_PORT, WEB_PORT, ROUTES, WS_PATH } from '@block/shared';
// API_PORT = 4000  WEB_PORT = 5173  WS_PATH = '/ws'
```

Vite dev server proxies `/api` and `/ws` to `localhost:4000`. Do not hardcode either port — read them from `@block/shared`.

---

## REST contract

All requests + responses validated by Zod schemas from `@block/shared`. Use `fastify-type-provider-zod` on the API; use the same schemas on the web for `safeParse` after fetch.

| Method | Path                                | Request                                      | Response                     |
| ------ | ----------------------------------- | -------------------------------------------- | ---------------------------- |
| GET    | `/api/health`                       | —                                            | `{ ok, ts }`                 |
| POST   | `/api/health/vitals`                | `{ name, value, id, navigationType }`        | `{ ok }` (web-vitals beacon) |
| GET    | `/api/vehicles`                     | query: `VehicleQuerySchema`                  | `VehicleListResponseSchema`  |
| GET    | `/api/vehicles/:id`                 | —                                            | `VehicleSchema`              |
| GET    | `/api/vehicles/:id/bids`            | —                                            | `BidHistoryResponseSchema`   |
| POST   | `/api/vehicles/:id/bids`            | `PlaceBidInputSchema`                        | `PlaceBidResultSchema`       |
| GET    | `/api/vehicles/:id/intel`           | optional `?categories=valuation,history,...` | `VehicleIntelSchema`         |
| GET    | `/api/vehicles/:id/intel/:provider` | —                                            | `ProviderResultSchema`       |
| GET    | `/api/providers`                    | —                                            | `ProviderListResponseSchema` |
| POST   | `/api/agent/invoke`                 | `AgentInvokeRequestSchema`                   | `AgentInvokeResponseSchema`  |
| GET    | `/api/agent/facts/:vehicleId`       | —                                            | `AgentFactsResponseSchema`   |

### Error envelope

Non-2xx responses:

```ts
{ code: string, message: string, requestId: string }
```

Bid-specific error codes are listed in `BidErrorCodeSchema` (`@block/shared`).

### Caching, rate limits

- `GET` endpoints set ETag + `Cache-Control: private, max-age=15, must-revalidate`.
- `POST /api/vehicles/:id/bids` rate-limited to 10/min/IP (see `RATE_LIMITS`).
- `POST /api/agent/invoke` rate-limited to 20/min/IP.
- All responses gzip/br compressed.

---

## WebSocket contract

Single endpoint: `GET /ws` (handled by `@fastify/websocket`).

Client → Server (`WsClientMessageSchema`):

```ts
{ type: 'subscribe' | 'unsubscribe', topic: 'inventory' | 'vehicle:<id>' | 'agent:<traceId>' }
{ type: 'ping', ts: <number> }
```

Server → Client (`WsServerMessageSchema`):

```ts
{ type: 'bid:updated', vehicleId, currentBid, bidCount, reserveMet, source, ts }
{ type: 'auction:ending', vehicleId, endsAt }
{ type: 'intel:patch', vehicleId, provider, data, ts }
{ type: 'agent:fact', vehicleId?, fact }
{ type: 'agent:suggestion', vehicleId, suggestion }
{ type: 'agent:trace', traceId, delta, done }
{ type: 'pong', ts }
{ type: 'error', code, message }
```

`bid:updated` is broadcast to subscribers of both `inventory` and the specific `vehicle:<id>` topic. The frontend uses BroadcastChannel as a same-browser fan-out only; the server is authoritative.

---

## Bid rules (shared)

Use `validateBidAmount` and `minNextBid` from `@block/shared`. **Both** sides (API `bidEngine` and Web `react-hook-form` resolver) must call the same helpers — no copy-pasted regexes.

- Opening bid (`current_bid == 0`) must be `>= starting_bid`.
- Subsequent bids must be `>= current_bid + max($100, 1% of current_bid)`.
- Reserve is displayed as "met / not met" only; the number is never sent to the client.
- `buy_now_price`, when present, wins instantly (priority over normal bids).
- The server is authoritative; the client UI is optimistic with rollback on rejection.

---

## Provider mock layer (API only)

Every third-party provider lives at `apps/api/src/providers/<name>.mock.ts` behind the `Provider<TIn, TOut>` interface. All mocks are **VIN-deterministic** using the shared `vinSeed(vin, providerName)` + `seededRng`. Latency 20–220 ms; 2 % synthetic failure rate (see `TIMINGS` in `@block/shared`).

Provider names + categories are listed in [`apps/api/src/providers/registry.ts`](../apps/api/src/providers/registry.ts) (BE agent creates this). The full list is in [`arch.md` → Mock provider catalog](../arch.md).

The FE agent's MSW handlers MUST use the same `vinSeed` to generate identical fake intel for the same VIN, so swapping MSW off in Phase 2 is byte-equivalent.

---

## AuctionAgent (NOT a chatbot)

- Backend service: `apps/api/src/agent/`. `POST /api/agent/invoke` returns `AgentInvokeResponseSchema`.
- Default LLM is `mockLLM` — a rule-based intent router. Zero keys, runs anywhere. Live LLM swap via `AGENT_LLM=openai|anthropic|ollama` (Vercel AI SDK).
- Tools: `placeBid`, `searchInventory`, `getIntel`, `recommendMaxBid`, `findComps`, `explainPrice`, `flagRisks`, `setFilters`, `goto`.
- `placeBid` **NEVER** auto-executes. It returns an `AgentSuggestion` with `confirmWindowMs = 5000`. The web UI renders a confirm card; defaults to Cancel on Esc / timeout.
- Frontend surfaces: `CommandBar` (Cmd-K or `/`), `SmartBidBar` (AI Max Bid pill), `FactChip`, `RiskBanner`, `CompareStrip`, `ConfirmAction`. **No chat bubble, no message thread, no avatar.**
- Audit log: append to `apps/api/.data/agent-log.jsonl` on every invoke + tool call + confirm/cancel.
- WS streams partial agent output as `agent:trace` events.

---

## Definition of done (per agent)

Each engineer agent must, before reporting done, prove its workspace works in isolation:

```bash
# Frontend
npm run --workspace apps/web lint
npm run --workspace apps/web typecheck
npm run --workspace apps/web test
npm run --workspace apps/web dev   # smoke that it boots on :5173

# Backend
npm run --workspace apps/api lint
npm run --workspace apps/api typecheck
npm run --workspace apps/api test
npm run --workspace apps/api dev   # smoke that it boots on :4000
bash apps/api/scripts/smoke.sh     # curl bid + agent invoke
```

Final message must include a structured summary: files added, tests added/passing, deps requested in workspace `package.json`, assumptions made, any escalations.

---

## Performance budgets (enforced)

| Target                                 | Limit    |
| -------------------------------------- | -------- |
| Web JS gz (initial route)              | < 70 KB  |
| Web JS gz (total)                      | < 130 KB |
| Web CSS gz                             | < 12 KB  |
| LCP on mid-tier mobile                 | < 1.5 s  |
| `GET /api/vehicles?limit=24` p95       | < 30 ms  |
| `GET /api/vehicles/:id/intel` cold     | < 350 ms |
| `GET /api/vehicles/:id/intel` warm     | < 5 ms   |
| `POST /api/agent/invoke` (mockLLM) p95 | < 30 ms  |

If the budget is exceeded, surface it in the HANDOFF file rather than silently violating it.

---

## Communication channels

- `.agents/HANDOFF-fe.md` — Frontend Engineer scratchpad (append-only, your own).
- `.agents/HANDOFF-be.md` — Backend Engineer scratchpad (append-only, your own).
- `.agents/CONTRACT.md` — this file (READ-ONLY).

You may not read or write the other agent's HANDOFF file during your run.
