import {
  CACHE_TTL_MS,
  SocialBundleSchema,
  type SocialBundle,
  type SocialPost,
  type SocialVideo,
} from '@block/shared';

import { brandChannel, daysAgo, fmtDate } from './_helpers.js';
import { rngFor, type Provider, type ProviderInput } from './types.js';

type Platform = SocialVideo['platform'] | SocialPost['platform'];

const VIDEO_PLATFORMS: SocialVideo['platform'][] = ['youtube', 'tiktok', 'instagram', 'x'];
const POST_PLATFORMS: SocialPost['platform'][] = ['reddit', 'x', 'instagram'];

function videoFor(rng: ReturnType<typeof rngFor>, input: ProviderInput, platform: SocialVideo['platform']): SocialVideo {
  const title = `${input.year ?? ''} ${input.make ?? ''} ${input.model ?? ''} ${rng.pick([
    'long-term review',
    'buyer beware',
    '5 things to check',
    'first drive',
    'reliability after 100k km',
  ])}`.trim();
  const id = `${platform}_${rng.int(100_000, 999_999)}`;
  const channel = brandChannel(input.make);
  const slug = (input.make ?? 'vehicle').toLowerCase();
  return {
    platform,
    id,
    title,
    channel,
    views: rng.int(2_000, 1_500_000),
    publishedAt: fmtDate(daysAgo(rng, 7, 1000)),
    thumbnail: `https://placehold.co/320x180/000000/ffffff?text=${encodeURIComponent(slug)}`,
    url: `https://example.com/${platform}/watch?v=${id}`,
  };
}

function postFor(rng: ReturnType<typeof rngFor>, input: ProviderInput, platform: SocialPost['platform']): SocialPost {
  const id = `${platform}_${rng.int(100_000, 999_999)}`;
  return {
    platform,
    id,
    author: `user_${rng.int(1000, 9999)}`,
    excerpt: `${input.year ?? ''} ${input.make ?? ''} ${input.model ?? ''} — ${rng.pick([
      'great daily driver, owned for 3 years',
      'transmission slipping at 120k',
      'killer deal at this price',
      'avoid the base trim',
      'panoramic roof leaks in rain',
    ])}`.trim(),
    url: `https://example.com/${platform}/p/${id}`,
    score: rng.int(-12, 2400),
    publishedAt: fmtDate(daysAgo(rng, 1, 500)),
  };
}

export function makeSocialProvider(opts: {
  name: string;
  envFlag: string;
  videoPlatform?: SocialVideo['platform'] | null;
  postPlatform?: SocialPost['platform'] | null;
}): Provider<SocialBundle> {
  function mock(input: ProviderInput): SocialBundle {
    const rng = rngFor(input, opts.name);
    const videos: SocialVideo[] = opts.videoPlatform
      ? Array.from({ length: rng.int(2, 4) }, () => videoFor(rng, input, opts.videoPlatform as SocialVideo['platform']))
      : [];
    const posts: SocialPost[] = opts.postPlatform
      ? Array.from({ length: rng.int(2, 5) }, () => postFor(rng, input, opts.postPlatform as SocialPost['platform']))
      : [];
    return { videos, posts };
  }
  return {
    name: opts.name,
    category: 'social',
    ttlMs: CACHE_TTL_MS.social,
    timeoutMs: 500,
    mode: process.env[opts.envFlag] === '1' ? 'live' : 'mock',
    schema: SocialBundleSchema,
    mock,
  };
}

// Used to populate Edmunds/Cars.com review bundles (post-only) deterministically.
export const __platformLists = { VIDEO_PLATFORMS, POST_PLATFORMS } as const;

export type PlatformAny = Platform;
