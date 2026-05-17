import 'dotenv/config';

import { existsSync } from 'node:fs';

import { API_PORT, WEB_PORT } from '@block/shared';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import websocket from '@fastify/websocket';
import Fastify from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import { sendError } from './lib/errors.js';
import { makeRequestId } from './lib/ids.js';
import { baseLogger } from './lib/logger.js';
import { ensureDataDir, WEB_DIST } from './lib/paths.js';
import { runWithContext } from './lib/requestContext.js';
import { agentRoutes } from './routes/agent.js';
import { healthRoutes } from './routes/health.js';
import { intelRoutes } from './routes/intel.js';
import { vehicleRoutes } from './routes/vehicles.js';
import { registerWsRoutes } from './routes/ws.js';
import { initBidEngine, shutdownBidEngine } from './services/bidEngine.js';
import { initVehicleStore } from './services/vehicleStore.js';

export interface BuildOpts {
  startBots?: boolean;
  enableStatic?: boolean;
  logLevel?: string;
}

export async function buildServer(opts: BuildOpts = {}) {
  ensureDataDir();
  await initVehicleStore();
  await initBidEngine({ startBots: opts.startBots ?? true });

  const app = Fastify({
    logger: { level: opts.logLevel ?? process.env.LOG_LEVEL ?? 'info' },
    genReqId: () => makeRequestId(),
    bodyLimit: 1_000_000,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin:
      process.env.NODE_ENV === 'production'
        ? true
        : [`http://localhost:${WEB_PORT}`, 'http://127.0.0.1:5173'],
    credentials: true,
  });
  await app.register(compress, { global: true });
  await app.register(rateLimit, {
    global: false,
    max: 600,
    timeWindow: '1 minute',
    errorResponseBuilder: (_req, ctx) => ({
      code: 'RATE_LIMITED',
      message: `Too many requests; retry in ${ctx.after}.`,
      requestId: 'rate-limited',
    }),
  });
  await app.register(websocket);

  app.addHook('onRequest', (req, _reply, done) => {
    runWithContext({ requestId: req.id }, () => done());
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err, requestId: req.id }, 'request error');
    if ((err as { validation?: unknown }).validation) {
      return reply.code(400).send({
        code: 'BAD_REQUEST',
        message: err.message,
        requestId: req.id,
      });
    }
    return sendError(reply, err);
  });

  app.setNotFoundHandler((req, reply) => {
    if (!req.url.startsWith('/api') && opts.enableStatic !== false && existsSync(WEB_DIST)) {
      // SPA fallback: serve index.html from the static plugin.
      reply.sendFile?.('index.html');
      return;
    }
    reply.code(404).send({
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.url} not found.`,
      requestId: req.id,
    });
  });

  await app.register(healthRoutes);
  await app.register(vehicleRoutes);
  await app.register(intelRoutes);
  await app.register(agentRoutes);
  registerWsRoutes(app);

  if ((opts.enableStatic ?? true) && existsSync(WEB_DIST)) {
    await app.register(staticPlugin, {
      root: WEB_DIST,
      prefix: '/',
      decorateReply: true,
    });
    baseLogger.info({ root: WEB_DIST }, 'serving built web SPA');
  } else {
    baseLogger.debug('apps/web/dist not present — API-only mode');
  }

  return app;
}

async function start(): Promise<void> {
  const port = Number(process.env.API_PORT ?? API_PORT);
  const host = process.env.HOST ?? '0.0.0.0';
  const app = await buildServer({});

  const shutdown = async (signal: string) => {
    baseLogger.info({ signal }, 'server: shutting down');
    try {
      await shutdownBidEngine();
      await app.close();
    } finally {
      process.exit(0);
    }
  };
  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));

  try {
    await app.listen({ port, host });
    baseLogger.info({ port, host }, 'the-block API up');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  void start();
}
