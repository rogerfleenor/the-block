import { makeMarketCompsProvider } from './_marketComps.js';

export const vautoProvider = makeMarketCompsProvider({
  name: 'vauto',
  envFlag: 'VAUTO_LIVE',
  sourceLabel: 'Cox vAuto',
  priceBias: 1.0,
});
