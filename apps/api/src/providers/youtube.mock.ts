import { makeSocialProvider } from './_social.js';

export const youtubeProvider = makeSocialProvider({
  name: 'youtube',
  envFlag: 'YOUTUBE_LIVE',
  videoPlatform: 'youtube',
  postPlatform: null,
});
