import {
  BidHistoryResponseSchema,
  PlaceBidInputSchema,
  PlaceBidResultSchema,
  RATE_LIMITS,
  VehicleFacetsSchema,
  VehicleListResponseSchema,
  VehicleQuerySchema,
  VehicleSchema,
} from '@block/shared';
import { z } from 'zod';

import { sendError, ApiError, notFound } from '../lib/errors.js';
import { applyCacheHeaders } from '../lib/etag.js';
import { logger } from '../lib/logger.js';
import { getBidHistory, placeBid } from '../services/bidEngine.js';
import { getVehicle, getVehicleFacets, listVehicles } from '../services/vehicleStore.js';

import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const IdParam = z.object({ id: z.string() });

export const vehicleRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/api/vehicles/facets',
    {
      schema: {
        response: { 200: VehicleFacetsSchema },
      },
    },
    async () => getVehicleFacets(),
  );

  app.get(
    '/api/vehicles',
    {
      schema: {
        querystring: VehicleQuerySchema,
        response: { 200: VehicleListResponseSchema },
      },
    },
    async (req, reply) => {
      const page = listVehicles(req.query);
      if (applyCacheHeaders(req, reply, page)) return reply;
      return page;
    },
  );

  app.get(
    '/api/vehicles/:id',
    {
      schema: {
        params: IdParam,
        response: { 200: VehicleSchema },
      },
    },
    async (req, reply) => {
      const v = getVehicle(req.params.id);
      if (!v) return sendError(reply, notFound('Vehicle', req.params.id));
      if (applyCacheHeaders(req, reply, v)) return reply;
      return v;
    },
  );

  app.get(
    '/api/vehicles/:id/bids',
    {
      schema: {
        params: IdParam,
        response: { 200: BidHistoryResponseSchema },
      },
    },
    async (req, reply) => {
      const v = getVehicle(req.params.id);
      if (!v) return sendError(reply, notFound('Vehicle', req.params.id));
      const payload = { bids: getBidHistory(req.params.id) };
      if (applyCacheHeaders(req, reply, payload)) return reply;
      return payload;
    },
  );

  app.post(
    '/api/vehicles/:id/bids',
    {
      schema: {
        params: IdParam,
        body: PlaceBidInputSchema,
        response: { 200: PlaceBidResultSchema },
      },
      config: {
        rateLimit: { max: RATE_LIMITS.bidsPerMinPerIp, timeWindow: '1 minute' },
      },
    },
    async (req, reply) => {
      const result = placeBid({
        vehicleId: req.params.id,
        amount: req.body.amount,
        source: 'user',
        ...(req.body.bidder ? { bidder: req.body.bidder } : {}),
      });
      if (!result.ok) {
        logger().warn({ code: result.code, message: result.message }, 'bid rejected');
        const status = result.code === 'VEHICLE_NOT_FOUND' ? 404 : 400;
        return sendError(
          reply,
          new ApiError({ statusCode: status, code: result.code, message: result.message }),
        );
      }
      return {
        bid: result.bid,
        currentBid: result.currentBid,
        bidCount: result.bidCount,
        reserveMet: result.reserveMet,
      };
    },
  );
};
