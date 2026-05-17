import { makeDealerInventoryProvider } from './_dealerInventory.js';

export const cdkFortellisProvider = makeDealerInventoryProvider({
  name: 'cdkFortellis',
  envFlag: 'CDK_FORTELLIS_LIVE',
  dealerNamePrefix: 'CDK Network Dealer',
});
