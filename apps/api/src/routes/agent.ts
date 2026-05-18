import {
  AgentFactsResponseSchema,
  AgentInvokeRequestSchema,
  AgentInvokeResponseSchema,
  PurchaseAssessmentResponseSchema,
  RATE_LIMITS,
} from '@block/shared';
import { z } from 'zod';

import { getFacts } from '../agent/facts.js';
import { invokeAgent } from '../agent/llm.js';
import { appendAgentLog } from '../agent/log.js';
import { getPurchaseAssessment } from '../agent/purchaseAssessmentService.js';
import { notFound, sendError } from '../lib/errors.js';
import { applyCacheHeaders } from '../lib/etag.js';
import { getRequestId } from '../lib/requestContext.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const FactsParam = z.object({ vehicleId: z.string() });

const AuditBodySchema = z.object({
  traceId: z.string(),
  suggestionId: z.string(),
  decision: z.enum(['confirm', 'cancel']),
  vehicleId: z.string().optional(),
});

export const agentRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/api/agent/invoke',
    {
      schema: {
        body: AgentInvokeRequestSchema,
        response: { 200: AgentInvokeResponseSchema },
      },
      config: {
        rateLimit: { max: RATE_LIMITS.agentInvokesPerMinPerIp, timeWindow: '1 minute' },
      },
    },
    async (req) => {
      const outcome = await invokeAgent({
        utterance: req.body.utterance,
        context: req.body.context ?? {},
      });
      return outcome;
    },
  );

  app.get(
    '/api/agent/facts/:vehicleId',
    {
      schema: {
        params: FactsParam,
        response: { 200: AgentFactsResponseSchema },
      },
    },
    async (req, reply) => {
      const computed = await getFacts(req.params.vehicleId);
      if (!computed) return sendError(reply, notFound('Vehicle', req.params.vehicleId));
      const payload = {
        vehicleId: req.params.vehicleId,
        facts: computed.facts,
        fetchedAt: new Date().toISOString(),
      };
      if (applyCacheHeaders(req, reply, payload, 30)) return reply;
      return payload;
    },
  );

  app.get(
    '/api/agent/purchase-assessment/:vehicleId',
    {
      schema: {
        params: FactsParam,
        response: { 200: PurchaseAssessmentResponseSchema },
      },
    },
    async (req, reply) => {
      const payload = await getPurchaseAssessment(req.params.vehicleId);
      if (!payload) return sendError(reply, notFound('Vehicle', req.params.vehicleId));
      if (applyCacheHeaders(req, reply, payload, 30)) return reply;
      return payload;
    },
  );

  app.post(
    '/api/agent/audit',
    {
      schema: {
        body: AuditBodySchema,
        response: { 200: z.object({ ok: z.boolean() }) },
      },
    },
    async (req) => {
      await appendAgentLog({
        requestId: getRequestId(),
        traceId: req.body.traceId,
        kind: req.body.decision === 'confirm' ? 'confirm' : 'cancel',
        payload: {
          suggestionId: req.body.suggestionId,
          vehicleId: req.body.vehicleId,
        },
      });
      return { ok: true };
    },
  );
};
