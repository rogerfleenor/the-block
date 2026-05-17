import { makeMarketCompsProvider } from './_marketComps.js';

export const iaaProvider = makeMarketCompsProvider({
  name: 'iaa',
  envFlag: 'IAA_LIVE',
  sourceLabel: 'IAA',
  priceBias: 0.8,
});
