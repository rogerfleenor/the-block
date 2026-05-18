import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/ui/cn';

interface GalleryProps {
  images: string[];
  alt: string;
}

export function Gallery({ images, alt }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(() => new Set<string>());

  useEffect(() => {
    setBroken(new Set());
    setIndex(0);
  }, [images]);

  const ok = useMemo(() => images.filter((src) => !broken.has(src)), [images, broken]);

  useEffect(() => {
    if (index >= ok.length) setIndex(0);
  }, [index, ok.length]);

  const markBroken = (src: string) => {
    setBroken((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
        No photos yet
      </div>
    );
  }

  if (ok.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
        Photos unavailable
      </div>
    );
  }

  const main = ok[index] ?? ok[0]!;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
        <img
          src={main}
          alt={`${alt}, view ${index + 1} of ${ok.length}`}
          loading="lazy"
          decoding="async"
          width={800}
          height={600}
          className="aspect-[4/3] w-full object-cover"
          onError={() => markBroken(main)}
        />
        {ok.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + ok.length) % ok.length)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % ok.length)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-slate-700 shadow hover:bg-white"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {ok.length > 1 ? (
        <ul className="grid grid-cols-6 gap-1.5">
          {ok.slice(0, 6).map((src, i) => (
            <li key={`${src}-${i}`}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show view ${i + 1}`}
                className={cn(
                  'aspect-square w-full overflow-hidden rounded-md border-2',
                  i === index ? 'border-accent' : 'border-transparent',
                )}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={120}
                  height={120}
                  className="h-full w-full object-cover"
                  onError={() => markBroken(src)}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
