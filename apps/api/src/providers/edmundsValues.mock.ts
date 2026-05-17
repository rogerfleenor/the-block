import { makeGenericValuationProvider } from './_genericValuation.js';

export const edmundsValuesProvider = makeGenericValuationProvider({
  name: 'edmundsValues',
  envFlag: 'EDMUNDS_VALUES_LIVE',
  wholesaleMultiplier: 0.93,
  retailMultiplier: 1.06,
});
