import { BID_RULES } from './constants.js';

import type { Vehicle } from './vehicle.js';

/**
 * Bid rule helpers shared by:
 *  - apps/api/src/services/bidEngine.ts (server-side authoritative validation)
 *  - apps/web/src/features/bidding (client-side optimistic + react-hook-form)
 *
 * Both sides reject identical inputs → no drift.
 */

export function minIncrement(currentBid: number): number {
  return Math.max(
    BID_RULES.MIN_INCREMENT_FLOOR,
    Math.ceil(currentBid * BID_RULES.MIN_INCREMENT_PERCENT),
  );
}

export function minNextBid(vehicle: Pick<Vehicle, 'current_bid' | 'starting_bid'>): number {
  if (!vehicle.current_bid || vehicle.current_bid <= 0) {
    return vehicle.starting_bid;
  }
  return vehicle.current_bid + minIncrement(vehicle.current_bid);
}

export interface BidValidationOk {
  ok: true;
  minNextBid: number;
}

export interface BidValidationErr {
  ok: false;
  code: 'BELOW_MINIMUM' | 'BELOW_STARTING_BID';
  message: string;
  minNextBid: number;
}

export type BidValidation = BidValidationOk | BidValidationErr;

export function validateBidAmount(
  vehicle: Pick<Vehicle, 'current_bid' | 'starting_bid'>,
  amount: number,
): BidValidation {
  const required = minNextBid(vehicle);
  if (!vehicle.current_bid || vehicle.current_bid <= 0) {
    if (amount < vehicle.starting_bid) {
      return {
        ok: false,
        code: 'BELOW_STARTING_BID',
        message: `Opening bid must be at least $${vehicle.starting_bid.toLocaleString()}.`,
        minNextBid: required,
      };
    }
    return { ok: true, minNextBid: required };
  }
  if (amount < required) {
    return {
      ok: false,
      code: 'BELOW_MINIMUM',
      message: `Next bid must be at least $${required.toLocaleString()}.`,
      minNextBid: required,
    };
  }
  return { ok: true, minNextBid: required };
}

export function reserveMet(vehicle: Pick<Vehicle, 'reserve_price'>, currentBid: number): boolean {
  if (vehicle.reserve_price === null) return true;
  return currentBid >= vehicle.reserve_price;
}
