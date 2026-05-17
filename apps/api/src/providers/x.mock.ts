import { makeSocialProvider } from './_social.js';

export const xProvider = makeSocialProvider({
  name: 'x',
  envFlag: 'X_LIVE',
  videoPlatform: 'x',
  postPlatform: 'x',
});
