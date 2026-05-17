import pino from 'pino';

import { getRequestId } from './requestContext.js';

const level = process.env.LOG_LEVEL ?? 'info';

const isDev = process.env.NODE_ENV !== 'production';

export const baseLogger = pino({
  level,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l' },
        },
      }
    : {}),
});

/**
 * Returns a child logger automatically tagged with the active requestId
 * (from the AsyncLocalStorage). Use inside route handlers, services,
 * providers, agent tools — any code path that touches a request.
 */
export function logger() {
  return baseLogger.child({ requestId: getRequestId() });
}
