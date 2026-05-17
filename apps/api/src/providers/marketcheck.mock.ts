import { makeMarketCompsProvider } from './_marketComps.js';

export const marketcheckProvider = makeMarketCompsProvider({
  name: 'marketcheck',
  envFlag: 'MARKETCHECK_LIVE',
  sourceLabel: 'MarketCheck',
  priceBias: 1.06,
});
