# Backend Engineer — handoff scratchpad

Append entries below as you work. Format suggestion:

```
## [YYYY-MM-DD HH:MM] <topic>
- Decision / assumption / blocker / escalation
- Files touched
```

Escalate any contract change instead of making it.

---

## [2026-05-17] Phase 2 — orchestrator hotfix (test isolation)

Symptom: `npm test` from the repo root would intermittently fail 1/90 BE tests with a stale-snapshot mismatch in `bidEngine.test.ts`.

Root cause: vitest runs test files in parallel workers by default. Each worker boots `initBidEngine()` which calls `loadSnapshot()` on `apps/api/.data/state.json`. Worker A writes a snapshot mid-test → Worker B starts up, loads the just-written snapshot, sees state it didn't expect → assertion fails.

**Fix (orchestrator inline)**: changed `apps/api/package.json` test script to `--pool=forks --poolOptions.forks.singleFork` so all api test files share a single process. Eliminates the race. Confirmed 90/90 passing across 10 consecutive runs.

Forward-looking suggestion for the BE agent: parameterize `STATE_SNAPSHOT` (and `AGENT_LOG`) so the test setup can point each suite at a per-process temp dir (e.g. `os.tmpdir() + '/the-block-' + process.pid`). That would let parallelism return without flakes. Not done now to keep the patch surgical.

No contract change.

## [2026-05-17 17:20] Phase-1a build — full API

Built `apps/api/**` per the CONTRACT + arch. No contract changes; no
escalations. Five DoD gates (lint, typecheck, test, build, smoke) all green.

### Architecture choices

- **Request id propagation** via `AsyncLocalStorage` (`lib/requestContext.ts`)
  injected from a Fastify `onRequest` hook. `lib/logger.ts` reads the id
  from the store so every provider mock, agent tool and service log line
  carries the same correlation id without threading it through call sigs.
- **In-memory store + JSON snapshot** at `apps/api/.data/state.json`,
  written every `TIMINGS.snapshotIntervalMs` (30s) AND on graceful shutdown
  (SIGINT/SIGTERM). Snapshot is best-effort restored on boot.
- **Bot bidders** are one self-rescheduling `setTimeout` per active vehicle
  (10–45s, per `TIMINGS`). Increment uses the shared `validateBidAmount`
  rule (max($100, 1% of current)) — bids that would violate the rule are
  simply dropped on a tick, so no drift between bot and user paths.
- **Provider layer**: 40 providers across the 11 categories in the catalog
  (six valuation, five history, four specs, three safety, four market,
  three dealer, two registration, three liens, two fuel, seven social,
  one photo). Every mock is **VIN-deterministic** via the shared
  `vinSeed(vin, name)` + `seededRng`, validates its output against a
  `@block/shared` schema, simulates `pickLatencyMs(vin, name)` ∈ [20, 220]
  ms, and trips `shouldFail(vin, name)` at the contract-spec ~2% rate. A
  per-provider timeout is enforced via `Promise.race` even in mock mode so
  failure paths behave identically when a real key replaces the mock.
- **`intelAggregator.aggregateIntel`** fans out with `Promise.allSettled`
  and TTL-caches the composite for `CACHE_TTL_MS.intelComposite` (60s).
  Category-scoped queries get their own cache key so they don't cross-
  pollute the all-categories warm cache.
- **AuctionAgent** is split into `agent/router.ts` (mockLLM rule grammar),
  `agent/llm.ts` (Vercel AI SDK adapter, lazy-imports `@ai-sdk/openai` /
  `@ai-sdk/anthropic` / `ollama-ai-provider` only when AGENT_LLM is set
  AND keys are present; any failure falls back to mock so the API never
  crashes on misconfig), `agent/guardrails.ts` (tool allowlist + Zod
  input/output validation), `agent/tools/<name>.ts` (one per tool),
  `agent/facts.ts` (shared fact-chip + recommendMaxBid math), and
  `agent/log.ts` (jsonl audit log at `.data/agent-log.jsonl`). The
  `placeBid` tool **never** calls `bidEngine.placeBid`; it only emits an
  `AgentSuggestion` for the FE confirm card.
- **`POST /api/agent/audit`** added so the FE can persist confirm/cancel
  decisions for the 5-second confirm card. Body schema validated; appends
  to `agent-log.jsonl`. Not in the CONTRACT REST table — intentional minor
  extension permitted by the task brief, not a contract change.
- **Recommend-max-bid formula** lives in `agent/facts.ts`:
  `cap = 0.95 × kbb.retail.mid × conditionAdj − pressure × retail`, with
  `conditionAdj = clamp(0.85 + 0.03 × grade, 0.85, 1)` and
  `pressure = min(0.05, 0.002 × bid_count)`. Floor honors MMR.

### Assumptions (none required contract changes)

- Vehicle rows where `current_bid` (or `bid_count`) arrive as `null` are
  treated as 0 on load; otherwise 112 of 200 dataset rows would be
  rejected by the strict `VehicleSchema`. Done inside `vehicleStore.ts`
  with a brief comment explaining why. No schema change.
- Determinism for date-bearing provider outputs uses a fixed reference
  epoch (`REFERENCE_EPOCH_MS`) instead of `Date.now()`. Without this the
  determinism test would always fail since the reviewer's clock advances.
- Reviews providers (`edmundsReviews`, `carsdotcomReviews`) reuse the
  `SocialBundle` schema (`SocialPost.platform: 'reddit'`) because there's
  no dedicated review schema in `packages/shared`. Acceptable since the
  shape is structurally identical to a discussion post.
- Specs alt-providers (`dataone`, `marti`, `monroney`) reuse
  `SpecsVpicSchema` for the same reason.
- WS topic fan-out: `bid:updated` broadcast to both `inventory` and
  `vehicle:<id>`. `agent:trace` deltas only broadcast in live-LLM mode
  (mockLLM is synchronous, no streaming to emit).

### Deviations / known limitations

- Live LLM path is wired but only minimally tested in CI (no API keys in
  the sandbox). Lazy import + try/catch means it can't break the default
  mock path.
- The audit endpoint isn't typed in `AgentInvokeResponseSchema` — it's
  intentionally a small side endpoint.
- Compression with brotli requires `@fastify/compress` to detect the
  browser's `accept-encoding`; we register globally with default opts.
- Snapshot restore prefers in-memory live data on conflict (snapshot is a
  best-effort cache, the JSON dataset is the source of truth).

### Files added (high-level)

server: `src/server.ts`
routes: `src/routes/{health,vehicles,intel,agent,ws}.ts`
services: `src/services/{vehicleStore,bidEngine,intelAggregator,wsHub}.ts`
providers: `src/providers/{types,_helpers,registry}.ts` + 40 `.mock.ts`
agent: `src/agent/{router,llm,guardrails,facts,log,types}.ts`
       + `src/agent/tools/{placeBid,searchInventory,getIntel,recommendMaxBid,
          findComps,explainPrice,flagRisks,setFilters,goto,index}.ts`
lib: `src/lib/{requestContext,logger,ids,cache,paths,errors,etag}.ts`
tests: `src/services/{bidEngine,intelAggregator}.test.ts`,
       `src/providers/_determinism.test.ts`,
       `src/agent/{router,guardrails}.test.ts`,
       `src/agent/tools/*.test.ts`
scripts: `scripts/smoke.sh`

### DoD verified

```
npm run --workspace apps/api lint       ✓ 0 warnings
npm run --workspace apps/api typecheck  ✓ 0 errors
npm run --workspace apps/api test       ✓ 90/90 in 14 files
npm run --workspace apps/api build      ✓
bash apps/api/scripts/smoke.sh          ✓ all curls green
```

