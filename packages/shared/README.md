# @block/shared

The contract package. Single source of truth for:

- Vehicle / Bid / Intel **Zod schemas** + inferred TS types ([`src/vehicle.ts`](src/vehicle.ts), [`src/intel.ts`](src/intel.ts))
- AuctionAgent typed tools, facts, suggestions, REST contract ([`src/agent.ts`](src/agent.ts))
- WebSocket protocol ([`src/events.ts`](src/events.ts))
- Port + path constants, bid rules, cache TTLs, rate limits ([`src/constants.ts`](src/constants.ts))
- Deterministic VIN-seeded PRNG used by both api mocks and web MSW mocks ([`src/rng.ts`](src/rng.ts))
- Shared bid validation reused by api `bidEngine` and web `react-hook-form` resolver ([`src/bidRules.ts`](src/bidRules.ts))

This package is **READ-ONLY for the two engineer agents**. Any change requires escalation to the orchestrator and a re-fork.

## Build

```bash
npm run build -w @block/shared
npm test -w @block/shared
```
