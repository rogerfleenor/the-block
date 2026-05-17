import { makeSocialProvider } from './_social.js';

export const edmundsReviewsProvider = makeSocialProvider({
  name: 'edmundsReviews',
  envFlag: 'EDMUNDS_REVIEWS_LIVE',
  videoPlatform: null,
  postPlatform: 'reddit',
});
