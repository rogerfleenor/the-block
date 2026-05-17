import { makeSocialProvider } from './_social.js';

export const instagramProvider = makeSocialProvider({
  name: 'instagram',
  envFlag: 'INSTAGRAM_LIVE',
  videoPlatform: 'instagram',
  postPlatform: 'instagram',
});
