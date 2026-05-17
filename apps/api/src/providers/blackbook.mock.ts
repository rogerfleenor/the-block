import { makeGenericValuationProvider } from './_genericValuation.js';

export const blackbookProvider = makeGenericValuationProvider({
  name: 'blackbook',
  envFlag: 'BLACKBOOK_LIVE',
  wholesaleMultiplier: 0.9,
  retailMultiplier: 1.02,
});
