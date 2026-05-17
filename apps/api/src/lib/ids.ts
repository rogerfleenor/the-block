import { randomBytes } from 'node:crypto';

export function makeId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

export function makeRequestId(): string {
  return `req_${randomBytes(6).toString('hex')}`;
}
