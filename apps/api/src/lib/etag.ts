import { createHash } from 'node:crypto';

import type { FastifyReply, FastifyRequest } from 'fastify';

/** Cheap-but-stable ETag of an arbitrary serialisable payload. */
export function computeETag(payload: unknown): string {
  const json = JSON.stringify(payload);
  const hash = createHash('sha1').update(json).digest('base64url');
  return `"${hash}"`;
}

/**
 * Apply the standard GET cache headers + If-None-Match handling.
 * Returns `true` if the caller should short-circuit with 304.
 */
export function applyCacheHeaders(
  req: FastifyRequest,
  reply: FastifyReply,
  payload: unknown,
  maxAgeSec = 15,
): boolean {
  const etag = computeETag(payload);
  reply.header('ETag', etag);
  reply.header('Cache-Control', `private, max-age=${maxAgeSec}, must-revalidate`);
  const inm = req.headers['if-none-match'];
  if (inm && inm === etag) {
    reply.code(304).send();
    return true;
  }
  return false;
}
