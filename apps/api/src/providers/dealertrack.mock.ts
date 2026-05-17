import { makeDealerInventoryProvider } from './_dealerInventory.js';

export const dealertrackProvider = makeDealerInventoryProvider({
  name: 'dealertrack',
  envFlag: 'DEALERTRACK_LIVE',
  dealerNamePrefix: 'Dealertrack Partner',
});
