/**
 * Tailwind classes shared by the fixed AuctionAgent dock and anything that
 * must clear it (e.g. the mobile bid bar on vehicle detail).
 *
 * Keep `max-h` and `bottom` offsets in sync so UI never overlaps.
 */
export const AGENT_DOCK_MAX_H = 'max-h-[min(42vh,260px)]';

/** Mobile bid bar sits above the dock (lg: bid is in sidebar, not fixed). */
export const MOBILE_BID_ABOVE_DOCK = 'max-lg:bottom-[min(42vh,260px)]';
