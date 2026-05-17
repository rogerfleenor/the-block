import { makeGenericValuationProvider } from './_genericValuation.js';

export const adesaProvider = makeGenericValuationProvider({
  name: 'adesa',
  envFlag: 'ADESA_LIVE',
  wholesaleMultiplier: 0.91,
  retailMultiplier: 1.0,
});
