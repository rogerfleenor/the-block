import { makeSocialProvider } from './_social.js';

export const carsdotcomReviewsProvider = makeSocialProvider({
  name: 'carsdotcomReviews',
  envFlag: 'CARSDOTCOM_REVIEWS_LIVE',
  videoPlatform: null,
  postPlatform: 'reddit',
});
