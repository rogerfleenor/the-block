import { makeTitleBrandsProvider } from './_titleBrands.js';

export const vinauditProvider = makeTitleBrandsProvider({
  name: 'vinaudit',
  envFlag: 'VINAUDIT_LIVE',
  sourceLabel: 'VINaudit',
});
