import { z } from 'zod';

import { logger } from '../lib/logger.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const HealthSchema = z.object({ ok: z.boolean(), ts: z.string() });

const VitalsBodySchema = z.object({
  name: z.string(),
  value: z.number(),
  id: z.string(),
  navigationType: z.string().optional(),
});
const VitalsReplySchema = z.object({ ok: z.boolean() });

export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/health',
    { schema: { response: { 200: HealthSchema } } },
    async () => ({ ok: true, ts: new Date().toISOString() }),
  );

  app.post(
    '/api/health/vitals',
    {
      schema: {
        body: VitalsBodySchema,
        response: { 200: VitalsReplySchema },
      },
    },
    async (req) => {
      logger().info(
        { metric: req.body.name, value: req.body.value, id: req.body.id, navigationType: req.body.navigationType },
        'web-vitals beacon',
      );
      return { ok: true };
    },
  );
};
