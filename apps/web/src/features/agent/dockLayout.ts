/**
 * Max height for the AuctionAgent panel (scrolls internally). The vehicle
 * bid strip sits above this in the same fixed dock on narrow viewports.
 */
export const AGENT_DOCK_MAX_H = 'max-h-[min(42vh,260px)]';

/** Entire fixed dock (bid strip + agent) should not eat the whole screen. */
export const VEHICLE_DOCK_MAX_H = 'max-h-[min(58vh,400px)]';
