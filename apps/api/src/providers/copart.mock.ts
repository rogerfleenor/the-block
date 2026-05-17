import { makeMarketCompsProvider } from './_marketComps.js';

export const copartProvider = makeMarketCompsProvider({
  name: 'copart',
  envFlag: 'COPART_LIVE',
  sourceLabel: 'Copart',
  priceBias: 0.78,
});
