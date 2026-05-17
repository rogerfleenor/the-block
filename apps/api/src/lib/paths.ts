import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** apps/api absolute root, resolved regardless of dev/build location. */
export const API_ROOT = resolve(here, '..', '..');

/** Repo root (the workspace root containing data/, packages/, apps/). */
export const REPO_ROOT = resolve(API_ROOT, '..', '..');

/** apps/api/.data — runtime state (snapshots, audit logs). */
export const DATA_DIR = resolve(API_ROOT, '.data');

/** data/vehicles.json — read-only seed. */
export const VEHICLES_JSON = resolve(REPO_ROOT, 'data', 'vehicles.json');

/** apps/web/dist — produced by FE build (optional at runtime). */
export const WEB_DIST = resolve(REPO_ROOT, 'apps', 'web', 'dist');

/** apps/api/.data/state.json — periodic bid + vehicle snapshot. */
export const STATE_SNAPSHOT = resolve(DATA_DIR, 'state.json');

/** apps/api/.data/agent-log.jsonl — append-only agent audit log. */
export const AGENT_LOG = resolve(DATA_DIR, 'agent-log.jsonl');

export function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function ensureDirFor(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
