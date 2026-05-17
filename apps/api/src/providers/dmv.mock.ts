import { makeRegistrationProvider } from './_registration.js';

export const dmvProvider = makeRegistrationProvider({
  name: 'dmv',
  envFlag: 'DMV_LIVE',
});
