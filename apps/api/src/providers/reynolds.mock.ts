import { makeDealerInventoryProvider } from './_dealerInventory.js';

export const reynoldsProvider = makeDealerInventoryProvider({
  name: 'reynolds',
  envFlag: 'REYNOLDS_LIVE',
  dealerNamePrefix: 'Reynolds Dealer',
});
