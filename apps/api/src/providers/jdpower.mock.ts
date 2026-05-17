import { makeGenericValuationProvider } from './_genericValuation.js';

export const jdpowerProvider = makeGenericValuationProvider({
  name: 'jdpower',
  envFlag: 'JDPOWER_LIVE',
  wholesaleMultiplier: 0.92,
  retailMultiplier: 1.05,
});
