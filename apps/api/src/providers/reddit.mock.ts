import { makeSocialProvider } from './_social.js';

export const redditProvider = makeSocialProvider({
  name: 'reddit',
  envFlag: 'REDDIT_LIVE',
  videoPlatform: null,
  postPlatform: 'reddit',
});
