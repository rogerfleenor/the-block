# Frontend Engineer — handoff scratchpad

Append entries below as you work. Format suggestion:

```
## [YYYY-MM-DD HH:MM] <topic>
- Decision / assumption / blocker / escalation
- Files touched
```

Escalate any contract change instead of making it.

---

## [2026-05-17] Phase 1 — full SPA build

### Files added (grouped)

- `src/app/{layout.tsx,routes.tsx,NotFound.tsx,__tests__/routes.test.tsx}`
- `src/lib/{api.ts,query.ts,ws.ts,format.ts,vitals.ts,__tests__/format.test.ts}`
- `src/state/{bidStore.ts,intelStore.ts,agentStore.ts}` plus tests
- `src/ui/{Button,Card,Skeleton,Tag,Sheet,Tabs,Tooltip,CommandPalette,cn}.tsx`
- `src/features/inventory/{InventoryPage,VehicleCard,FilterRail,SortControl,InventoryGrid}.tsx`
- `src/features/vehicle/{VehiclePage,Gallery,Specs,ConditionReport,DamageNotes,IntelTabs}.tsx`
- `src/features/bidding/{BidPanel,BidForm,BidHistory,ReserveBadge}.tsx` + bidFlow test
- `src/features/intel/{ValuationCard,HistoryCard,SafetyCard,MarketCard,BuzzCard,SourcesSheet}.tsx`
- `src/features/agent/{CommandBar,ConfirmAction,SmartBidBar,FactChip,RiskBanner,CompareStrip,agentClient}.tsx`
- `src/mocks/{handlers.ts,browser.ts,server.ts,fixtures.ts,providers.ts}` + `public/mockServiceWorker.js`
- `src/main.tsx`, updated `src/test/setup.ts`, updated `vite.config.ts`, updated `tsconfig.json`

### Decisions

- **Data normalization**: `data/vehicles.json` contains 112 rows with `current_bid: null`. The shared `VehicleSchema.current_bid` is `z.number().nonnegative()`. Rather than escalating a schema change, the MSW `fixtures.ts` coerces `null → 0` on load. The shared `validateBidAmount` already treats `current_bid <= 0` as "no bids yet → opening must be >= starting_bid", so behavior is correct and the contract is honored byte-for-byte.
- **MSW VIN-determinism**: `src/mocks/providers.ts` implements 10 mock providers (KBB, Manheim, Black Book, CARFAX, AutoCheck, NHTSA Recalls/NCAP, IIHS, MarketCheck, YouTube) using `vinSeed(vin, name)` + `seededRng` from `@block/shared`. The BE agent must wire the same seeds in its `registry.ts` so swapping MSW off in Phase 2 is byte-equivalent for these providers.
- **Auction-end calculation**: `auction_start + 4 hours` is used as a synthetic `endsAt`. The BE may broadcast `auction:ending` with an authoritative timestamp once that wire exists; the FE handler is in `ws.ts` and just needs a subscriber.
- **`/api/agent/facts/:id`** uses route param name `:id` in the FE handler (matches MSW path-param convention). BE should expose `/api/agent/facts/:vehicleId` per the contract — both resolve to the same shape; the FE consumes it via `agentClient.getFacts(vehicleId)` which calls `ROUTES.agentFacts(vehicleId)`.
- **WebSocket fallback**: `src/lib/ws.ts` opens against `VITE_WS_URL` or derives from `window.location`. When no server responds (MSW-only mode), reconnect backoff caps at 30s and listeners still receive locally-broadcast events via `BroadcastChannel('auction')`.
- **Optimistic bids + cross-tab sync**: on successful bid POST, the BidForm + ConfirmAction both call `getWsClient().broadcastLocal(...)` which fans out via `BroadcastChannel`, so tab B updates without a server roundtrip. The server is still authoritative on REST; this is purely a UX latency-hiding optimization.

### Tests added & passing (19/19)

- `src/lib/__tests__/format.test.ts` — currency, compact currency, km, grade dots, relative, countdown (7 cases)
- `src/state/__tests__/bidStore.test.ts` — passthrough validation, optimistic begin/rollback/confirm, stale-id guard (5 cases)
- `src/state/__tests__/agentStore.test.tsx` — suggestion arrives → confirm card mounts → 5s timer auto-cancels → explicit confirm dispatches via injected handler (3 cases)
- `src/app/__tests__/routes.test.tsx` — smoke render `/`, `/v/:id`, 404 fallback (3 cases)
- `src/features/bidding/__tests__/bidFlow.test.tsx` — full MSW integration: type valid amount, submit, see `bidStore.lastToast.kind === 'success'` (1 case)

### Deps requested in `apps/web/package.json`

None added. All required deps (`@hookform/resolvers`, `@tanstack/react-query`, `@tanstack/react-virtual`, `lucide-react`, `react-hook-form`, `react-router-dom`, `web-vitals`, `zustand`, `msw`, `zod`) were already scaffolded.

### Bundle size vs budget

Standard `vite build` (no MSW, what gets shipped behind the live API):

| Chunk                              | Raw      | Gz       |
| ---------------------------------- | -------- | -------- |
| `index-*.js` (initial main)        | 311.06   | **96.01** |
| `forms-*.js` (lazy, vehicle route) | 32.97    | 12.33    |
| `InventoryPage-*.js` (lazy)        | 28.74    | 9.18     |
| `VehiclePage-*.js` (lazy)          | 25.28    | 7.79     |
| `Sheet-*.js` (lazy)                | 23.65    | 8.12     |
| 5 intel-card chunks (lazy)         | ~7.64    | ~3.75    |
| `style-*.css`                      | 25.70    | **5.39** |

- **JS gz initial**: **96.01 KB** (budget 70 KB) — **over by ~26 KB**.
- **JS gz total**: **~137 KB** (budget 130 KB) — **over by ~7 KB**.
- **CSS gz**: **5.39 KB** (budget 12 KB) — **under**.

Root cause: react 18 + react-dom + react-router-dom + @tanstack/react-query + @tanstack/react-virtual + zod + zustand together already sum to ~75–80 KB gz before any application code. Splitting react+react-dom into a separate manualChunk causes circular-chunk warnings (react-query and react-router both ESM-import React) and worsens the total. Per the contract: "If the budget is exceeded, surface it in the HANDOFF file rather than silently violating it." → surfaced.

Possible future trimming (not done in this phase to avoid churn):

- Replace `zod` runtime usage at the network boundary with `zod-mini` if it ships, or drop `safeParse` from hot paths and rely solely on TS types after BE verification.
- Defer `web-vitals` registration behind `requestIdleCallback`.
- Replace `react-hook-form` on the bid input with a tiny hand-rolled validator (saves ~10 KB gz) — only worth it if budget compliance becomes a hard gate.

### Assumptions

- The dev server runs `web-vitals` in console-info mode; only `import.meta.env.PROD` beacons to `/api/health/vitals`.
- All `selling_dealership`, `lot`, `images[]` fields in the dataset are non-null (verified with a scan; only `current_bid` and `reserve_price`/`buy_now_price` have nulls; the latter two are already schema-nullable).
- The `agent:trace` WS event is not surfaced in the FE yet (no chat bubble per the contract). The listener slot exists in `ws.ts` so a streaming live-LLM swap can be hooked up without touching components.
- `/api/agent/facts/:id` is hit eagerly on detail mount; the BE response is cached server-side per the contract so this is cheap.

### Escalations

- None.

### Known limitations

- Bundle initial > 70 KB (see above).
- Photo `<img>` tags use the upstream placeholder URLs from `data/vehicles.json`; an image CDN with `srcset` density variants is out of scope for this phase.
- Provider catalog in MSW covers 10/30 named providers from arch.md — the most user-visible ones (KBB, Manheim, CARFAX, AutoCheck, NHTSA, IIHS, MarketCheck, YouTube, Black Book). The remaining providers (CDK, Reynolds, ADESA, NICB, fueleconomy.gov, etc.) are out-of-scope for the FE-side mock layer; the BE registry can ship them and the FE will render gracefully via the generic Sources sheet.
- WS subscribe topics fire `safeParse` on every incoming message; high-volume bid storms would benefit from a one-shot validator cache. Not an issue at 200-row prototype scale.

---

## [2026-05-17] Phase 2 — orchestrator hotfix (infinite re-render)

While running the Phase 2 Playwright smoke (`browse → detail → intel → bid`) against the live Fastify API, the detail route crashed with React error #185 ("Maximum update depth exceeded").

Root cause: two Zustand selectors returned `[] ` inline:

- `src/features/agent/RiskBanner.tsx:14`
- `src/features/vehicle/IntelTabs.tsx:37`

```ts
const facts = useAgentStore((s) => s.factsByVehicle[vehicleId] ?? []);
```

Zustand uses reference equality. Each render produced a fresh `[]`, so Zustand notified subscribers, which re-rendered, which created another `[]`, etc.

**Fix (orchestrator inline, 2-line patch each)**: extracted module-level `EMPTY_FACTS: AgentFact[] = []` and use it as the fallback so the selector returns a stable reference. Verified by Playwright smoke now passing on detail page.

For future FE work: the same pattern lives elsewhere any time a selector synthesizes a value with `??`, `|| []`, `?? {}`, `.filter(...)`, `.map(...)` inline. Prefer either:

1. Storing the empty/default in a module constant.
2. Splitting into two selectors: one for the raw value, one for the derived shape via `useMemo`.
3. Passing `shallow` as the equality function from `zustand/shallow`.

No contract change.
