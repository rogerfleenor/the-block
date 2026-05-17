import { makeRegistrationProvider } from './_registration.js';

export const polkProvider = makeRegistrationProvider({
  name: 'polk',
  envFlag: 'POLK_LIVE',
});
