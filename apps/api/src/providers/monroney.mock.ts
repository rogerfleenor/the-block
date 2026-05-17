import { makeAltSpecsProvider } from './_specsAlt.js';

export const monroneyProvider = makeAltSpecsProvider({
  name: 'monroney',
  envFlag: 'MONRONEY_LIVE',
});
