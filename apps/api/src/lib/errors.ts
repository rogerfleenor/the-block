import { getRequestId } from './requestContext.js';

import type { FastifyReply } from 'fastify';


export interface ApiErrorPayload {
  code: string;
  message: string;
  requestId: string;
}

export class ApiError extends Error {
  public override readonly name = 'ApiError';
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: Record<string, unknown> | undefined;

  constructor(opts: {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.statusCode = opts.statusCode;
    this.code = opts.code;
    this.details = opts.details;
  }
}

export function notFound(resource: string, id?: string): ApiError {
  return new ApiError({
    statusCode: 404,
    code: 'NOT_FOUND',
    message: id ? `${resource} '${id}' not found.` : `${resource} not found.`,
  });
}

export function badRequest(code: string, message: string): ApiError {
  return new ApiError({ statusCode: 400, code, message });
}

export function rateLimited(message = 'Too many requests.'): ApiError {
  return new ApiError({ statusCode: 429, code: 'RATE_LIMITED', message });
}

/** Serialise an ApiError (or anything error-shaped) into the contract envelope. */
export function sendError(reply: FastifyReply, err: unknown): FastifyReply {
  const requestId = getRequestId();
  if (err instanceof ApiError) {
    return reply
      .code(err.statusCode)
      .send({ code: err.code, message: err.message, requestId } satisfies ApiErrorPayload);
  }
  const message = err instanceof Error ? err.message : String(err);
  return reply.code(500).send({
    code: 'INTERNAL',
    message,
    requestId,
  } satisfies ApiErrorPayload);
}
