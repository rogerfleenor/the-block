import { makeTitleBrandsProvider } from './_titleBrands.js';

export const nmvtisProvider = makeTitleBrandsProvider({
  name: 'nmvtis',
  envFlag: 'NMVTIS_LIVE',
  sourceLabel: 'NMVTIS / DOJ',
});
