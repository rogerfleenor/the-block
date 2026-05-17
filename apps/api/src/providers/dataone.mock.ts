import { makeAltSpecsProvider } from './_specsAlt.js';

export const dataoneProvider = makeAltSpecsProvider({
  name: 'dataone',
  envFlag: 'DATAONE_LIVE',
});
