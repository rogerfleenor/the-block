import {
  ProviderListResponseSchema,
  ProviderResultSchema,
  VehicleIntelSchema,
  type ProviderCategory,
} from '@block/shared';
import { z } from 'zod';

import { ApiError, notFound, sendError } from '../lib/errors.js';
import { applyCacheHeaders } from '../lib/etag.js';
import { providerCatalog } from '../providers/registry.js';
import { aggregateIntel, runOneProvider } from '../services/intelAggregator.js';
import { getVehicle } from '../services/vehicleStore.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const IdParam = z.object({ id: z.string() });
const ProviderParam = z.object({ id: z.string(), provider: z.string() });

const IntelQuery = z.object({
  categories: z.string().optional(),
});

const KNOWN_CATEGORIES: ProviderCategory[] = [
  'valuation',
  'history',
  'specs',
  'safety',
  'market',
  'dealer',
  'registration',
  'liens',
  'fuel',
  'social',
  'photography',
];

function parseCategories(raw: string | undefined): ProviderCategory[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is ProviderCategory => KNOWN_CATEGORIES.includes(s as ProviderCategory));
  return list.length ? list : undefined;
}

export const intelRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/providers',
    {
      schema: {
        response: { 200: ProviderListResponseSchema },
      },
    },
    async (req, reply) => {
      const payload = { providers: providerCatalog() };
      if (applyCacheHeaders(req, reply, payload, 60)) return reply;
      return payload;
    },
  );

  app.get(
    '/api/vehicles/:id/intel',
    {
      schema: {
        params: IdParam,
        querystring: IntelQuery,
        response: { 200: VehicleIntelSchema },
      },
    },
    async (req, reply) => {
      const vehicle = getVehicle(req.params.id);
      if (!vehicle) return sendError(reply, notFound('Vehicle', req.params.id));
      const categories = parseCategories(req.query.categories);
      const intel = await aggregateIntel({
        vehicleId: vehicle.id,
        vin: vehicle.vin,
        vehicleHints: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          bodyStyle: vehicle.body_style,
        },
        ...(categories ? { categories } : {}),
      });
      if (applyCacheHeaders(req, reply, intel, 30)) return reply;
      return intel;
    },
  );

  app.get(
    '/api/vehicles/:id/intel/:provider',
    {
      schema: {
        params: ProviderParam,
        response: { 200: ProviderResultSchema },
      },
    },
    async (req, reply) => {
      const result = await runOneProvider(req.params.id, req.params.provider);
      if (!result) {
        return sendError(
          reply,
          new ApiError({
            statusCode: 404,
            code: 'NOT_FOUND',
            message: `Vehicle or provider '${req.params.provider}' not found.`,
          }),
        );
      }
      if (applyCacheHeaders(req, reply, result, 30)) return reply;
      return result;
    },
  );
};
