import { makeAltSpecsProvider } from './_specsAlt.js';

// Marti is famous for muscle-car build sheets — bias towards RWD V8s in mock.
export const martiProvider = makeAltSpecsProvider({
  name: 'marti',
  envFlag: 'MARTI_LIVE',
  driveBias: 'RWD',
});
