import { makeSocialProvider } from './_social.js';

export const tiktokProvider = makeSocialProvider({
  name: 'tiktok',
  envFlag: 'TIKTOK_LIVE',
  videoPlatform: 'tiktok',
  postPlatform: null,
});
