import { makeTitleBrandsProvider } from './_titleBrands.js';

export const nicbProvider = makeTitleBrandsProvider({
  name: 'nicb',
  envFlag: 'NICB_LIVE',
  sourceLabel: 'NICB VINCheck',
  brandChance: 0.08,
});
