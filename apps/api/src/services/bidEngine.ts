import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  BidSchema,
  reserveMet,
  TIMINGS,
  validateBidAmount,
  type Bid,
  type Vehicle,
} from '@block/shared';

import { makeId } from '../lib/ids.js';
import { baseLogger, logger } from '../lib/logger.js';
import { DATA_DIR, ensureDataDir, STATE_SNAPSHOT } from '../lib/paths.js';

import {
  allVehicles,
  getVehicle,
  initVehicleStore,
  setVehicle,
  updateVehicle,
} from './vehicleStore.js';
import { broadcastMany } from './wsHub.js';

interface PlaceBidArgs {
  vehicleId: string;
  amount: number;
  source: Bid['source'];
  bidder?: string;
}

interface PlaceBidOk {
  ok: true;
  bid: Bid;
  vehicle: Vehicle;
  currentBid: number;
  bidCount: number;
  reserveMet: boolean;
}

interface PlaceBidErr {
  ok: false;
  code: 'BELOW_MINIMUM' | 'BELOW_STARTING_BID' | 'VEHICLE_NOT_FOUND';
  message: string;
  minNextBid?: number;
}

export type PlaceBidOutcome = PlaceBidOk | PlaceBidErr;

const bidsByVehicle = new Map<string, Bid[]>();
const botTimers = new Map<string, NodeJS.Timeout>();

let snapshotTimer: NodeJS.Timeout | null = null;
let shuttingDown = false;

/** Boot the engine: load state snapshot (best-effort), then start bot bidders + snapshot loop. */
export async function initBidEngine(opts: { startBots?: boolean } = {}): Promise<void> {
  await initVehicleStore();
  ensureDataDir();
  await loadSnapshot();
  if (opts.startBots !== false) {
    for (const v of allVehicles()) {
      scheduleBotForVehicle(v.id);
    }
    if (!snapshotTimer) {
      snapshotTimer = setInterval(() => {
        writeSnapshot().catch((err) =>
          baseLogger.warn({ err }, 'bidEngine: periodic snapshot failed'),
        );
      }, TIMINGS.snapshotIntervalMs);
      snapshotTimer.unref?.();
    }
  }
}

export async function shutdownBidEngine(): Promise<void> {
  shuttingDown = true;
  for (const t of botTimers.values()) clearTimeout(t);
  botTimers.clear();
  if (snapshotTimer) {
    clearInterval(snapshotTimer);
    snapshotTimer = null;
  }
  await writeSnapshot();
}

export function getBidHistory(vehicleId: string): Bid[] {
  return bidsByVehicle.get(vehicleId) ?? [];
}

export function placeBid(args: PlaceBidArgs): PlaceBidOutcome {
  const vehicle = getVehicle(args.vehicleId);
  if (!vehicle) {
    return { ok: false, code: 'VEHICLE_NOT_FOUND', message: `Vehicle ${args.vehicleId} not found.` };
  }
  const check = validateBidAmount(vehicle, args.amount);
  if (!check.ok) {
    return { ok: false, code: check.code, message: check.message, minNextBid: check.minNextBid };
  }

  const bid: Bid = BidSchema.parse({
    id: makeId('bid'),
    vehicleId: vehicle.id,
    amount: args.amount,
    bidder: args.bidder ?? defaultBidderForSource(args.source),
    source: args.source,
    ts: new Date().toISOString(),
  });

  const history = bidsByVehicle.get(vehicle.id) ?? [];
  history.push(bid);
  bidsByVehicle.set(vehicle.id, history);

  const next = updateVehicle(vehicle.id, {
    current_bid: bid.amount,
    bid_count: vehicle.bid_count + 1,
  });
  const updated = next ?? vehicle;
  const met = reserveMet(updated, updated.current_bid);

  broadcastMany([`vehicle:${updated.id}`, 'inventory'], {
    type: 'bid:updated',
    vehicleId: updated.id,
    currentBid: updated.current_bid,
    bidCount: updated.bid_count,
    reserveMet: met,
    source: bid.source,
    ts: bid.ts,
  });

  logger().info(
    { vehicleId: updated.id, amount: bid.amount, source: bid.source, bidCount: updated.bid_count },
    'bidEngine: placed bid',
  );

  return {
    ok: true,
    bid,
    vehicle: updated,
    currentBid: updated.current_bid,
    bidCount: updated.bid_count,
    reserveMet: met,
  };
}

function defaultBidderForSource(source: Bid['source']): string {
  switch (source) {
    case 'bot':
      return 'House bot';
    case 'agent':
      return 'AuctionAgent';
    default:
      return 'You';
  }
}

// ─── Server-side bot bidders ─────────────────────────────────────────────────

function nextBotIntervalMs(): number {
  const span = TIMINGS.botMaxIntervalMs - TIMINGS.botMinIntervalMs;
  return TIMINGS.botMinIntervalMs + Math.floor(Math.random() * span);
}

function scheduleBotForVehicle(vehicleId: string): void {
  if (shuttingDown) return;
  if (botTimers.has(vehicleId)) return;
  const wait = nextBotIntervalMs();
  const t = setTimeout(() => {
    botTimers.delete(vehicleId);
    runBotTick(vehicleId);
  }, wait);
  t.unref?.();
  botTimers.set(vehicleId, t);
}

function runBotTick(vehicleId: string): void {
  if (shuttingDown) return;
  const v = getVehicle(vehicleId);
  if (!v) return;
  const base = v.current_bid > 0 ? v.current_bid : v.starting_bid;
  const step = Math.max(100, Math.ceil(base * 0.01));
  const amount = (v.current_bid > 0 ? v.current_bid : v.starting_bid) + step;
  const result = placeBid({ vehicleId, amount, source: 'bot' });
  if (!result.ok) {
    baseLogger.debug({ vehicleId, code: result.code }, 'bidEngine: bot tick rejected');
  }
  scheduleBotForVehicle(vehicleId);
}

// ─── Snapshot persistence ────────────────────────────────────────────────────

interface Snapshot {
  savedAt: string;
  vehicles: Vehicle[];
  bids: Record<string, Bid[]>;
}

export async function writeSnapshot(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const snapshot: Snapshot = {
    savedAt: new Date().toISOString(),
    vehicles: allVehicles(),
    bids: Object.fromEntries(bidsByVehicle),
  };
  await writeFile(STATE_SNAPSHOT, JSON.stringify(snapshot), 'utf-8');
}

async function loadSnapshot(): Promise<void> {
  try {
    const raw = await readFile(STATE_SNAPSHOT, 'utf-8');
    const snap = JSON.parse(raw) as Partial<Snapshot>;
    if (Array.isArray(snap.vehicles)) {
      for (const v of snap.vehicles) {
        try {
          setVehicle(v);
        } catch {
          // ignore corrupt rows; live store wins
        }
      }
    }
    if (snap.bids && typeof snap.bids === 'object') {
      for (const [id, list] of Object.entries(snap.bids)) {
        const valid = list.flatMap((b) => {
          const parsed = BidSchema.safeParse(b);
          return parsed.success ? [parsed.data] : [];
        });
        if (valid.length) bidsByVehicle.set(id, valid);
      }
    }
    baseLogger.info({ source: STATE_SNAPSHOT }, 'bidEngine: restored snapshot');
  } catch {
    // no snapshot yet — first boot
  }
}

/** Test helper: wipe in-memory bid history. */
export function __resetForTests(): void {
  bidsByVehicle.clear();
  for (const t of botTimers.values()) clearTimeout(t);
  botTimers.clear();
}
