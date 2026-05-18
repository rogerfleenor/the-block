import { ExternalLink } from 'lucide-react';

import type { ProviderResult, SocialBundle } from '@block/shared';

import { Card, CardBody, CardHeader } from '@/ui/Card';

interface BuzzCardProps {
  results: ProviderResult[];
}

export function BuzzCard({ results }: BuzzCardProps) {
  const social = pickOk<SocialBundle>(results, 'youtube');
  if (!social) {
    return (
      <Card>
        <CardHeader>Buzz</CardHeader>
        <CardBody className="text-sm text-slate-500">No social posts cached.</CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>Buzz</CardHeader>
      <CardBody className="space-y-3 text-sm">
        <ul className="grid gap-2 sm:grid-cols-3">
          {social.videos.slice(0, 3).map((v) => (
            <li
              key={v.id}
              className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800"
            >
              <img
                src={v.thumbnail}
                alt={`Thumbnail for ${v.title}`}
                loading="lazy"
                decoding="async"
                width={320}
                height={180}
                className="aspect-video w-full bg-slate-100 object-cover dark:bg-slate-800"
              />
              <div className="p-2">
                <p className="line-clamp-2 text-xs font-medium">{v.title}</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {v.channel} · {Math.round(v.views / 1000)}k views
                </p>
              </div>
            </li>
          ))}
        </ul>
        <ul className="space-y-1.5 text-xs">
          {social.posts.map((p) => (
            <li key={p.id} className="rounded border border-slate-200 p-2 dark:border-slate-800">
              <p className="font-medium">
                {p.author}{' '}
                <a
                  href={p.url}
                  className="ml-1 inline-flex items-center gap-0.5 text-accent"
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={10} aria-hidden="true" />
                </a>
              </p>
              <p className="text-slate-600 dark:text-slate-400">{p.excerpt}</p>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function pickOk<T>(results: ProviderResult[], name: string): T | null {
  const r = results.find((res) => res.provider === name);
  if (!r || r.status !== 'ok') return null;
  return r.data as T;
}
