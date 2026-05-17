
import { adesaProvider } from './adesa.mock.js';
import { autocheckProvider } from './autocheck.mock.js';
import { blackbookProvider } from './blackbook.mock.js';
import { carfaxProvider } from './carfax.mock.js';
import { carsdotcomReviewsProvider } from './carsdotcomReviews.mock.js';
import { cdkFortellisProvider } from './cdkFortellis.mock.js';
import { copartProvider } from './copart.mock.js';
import { courtViolationsProvider } from './courtViolations.mock.js';
import { dataoneProvider } from './dataone.mock.js';
import { dealertrackProvider } from './dealertrack.mock.js';
import { dmvProvider } from './dmv.mock.js';
import { edmundsReviewsProvider } from './edmundsReviews.mock.js';
import { edmundsValuesProvider } from './edmundsValues.mock.js';
import { epaGreenProvider } from './epaGreen.mock.js';
import { fueleconomyProvider } from './fueleconomy.mock.js';
import { iaaProvider } from './iaa.mock.js';
import { iihsProvider } from './iihs.mock.js';
import { instagramProvider } from './instagram.mock.js';
import { jdpowerProvider } from './jdpower.mock.js';
import { kbbProvider } from './kbb.mock.js';
import { lexisLiensProvider } from './lexisLiens.mock.js';
import { manheimProvider } from './manheim.mock.js';
import { marketcheckProvider } from './marketcheck.mock.js';
import { martiProvider } from './marti.mock.js';
import { monroneyProvider } from './monroney.mock.js';
import { nhtsaNcapProvider } from './nhtsaNcap.mock.js';
import { nhtsaRecallsProvider } from './nhtsaRecalls.mock.js';
import { nhtsaVpicProvider } from './nhtsaVpic.mock.js';
import { nicbProvider } from './nicb.mock.js';
import { nmvtisProvider } from './nmvtis.mock.js';
import { polkProvider } from './polk.mock.js';
import { rdnRepoProvider } from './rdnRepo.mock.js';
import { redditProvider } from './reddit.mock.js';
import { reynoldsProvider } from './reynolds.mock.js';
import { spincarProvider } from './spincar.mock.js';
import { tiktokProvider } from './tiktok.mock.js';
import { vautoProvider } from './vauto.mock.js';
import { vinauditProvider } from './vinaudit.mock.js';
import { xProvider } from './x.mock.js';
import { youtubeProvider } from './youtube.mock.js';

import type { Provider } from './types.js';

/**
 * The single source of truth for what providers are wired in. Order matters
 * for stable test snapshots; group by category.
 */
export const ALL_PROVIDERS: ReadonlyArray<Provider<unknown>> = [
  // Valuation
  kbbProvider,
  manheimProvider,
  adesaProvider,
  blackbookProvider,
  jdpowerProvider,
  edmundsValuesProvider,
  // History
  carfaxProvider,
  autocheckProvider,
  nmvtisProvider,
  nicbProvider,
  vinauditProvider,
  // Specs
  nhtsaVpicProvider,
  dataoneProvider,
  martiProvider,
  monroneyProvider,
  // Safety
  nhtsaRecallsProvider,
  nhtsaNcapProvider,
  iihsProvider,
  // Market
  copartProvider,
  iaaProvider,
  marketcheckProvider,
  vautoProvider,
  // Dealer
  cdkFortellisProvider,
  reynoldsProvider,
  dealertrackProvider,
  // Registration
  polkProvider,
  dmvProvider,
  // Liens / repo / violations
  rdnRepoProvider,
  lexisLiensProvider,
  courtViolationsProvider,
  // Fuel
  fueleconomyProvider,
  epaGreenProvider,
  // Social
  youtubeProvider,
  redditProvider,
  tiktokProvider,
  instagramProvider,
  xProvider,
  edmundsReviewsProvider,
  carsdotcomReviewsProvider,
  // Photo
  spincarProvider,
] as const;

const providerMap = new Map<string, Provider<unknown>>(ALL_PROVIDERS.map((p) => [p.name, p]));

export function getProvider(name: string): Provider<unknown> | undefined {
  return providerMap.get(name);
}

export function providerCatalog(): Array<{
  name: string;
  category: Provider<unknown>['category'];
  mode: 'mock' | 'live';
  ttlMs: number;
}> {
  return ALL_PROVIDERS.map((p) => ({
    name: p.name,
    category: p.category,
    mode: p.mode,
    ttlMs: p.ttlMs,
  }));
}

export const PROVIDER_COUNT = ALL_PROVIDERS.length;
