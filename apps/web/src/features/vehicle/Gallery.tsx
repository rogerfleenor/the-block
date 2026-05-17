import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/ui/cn';

interface GalleryProps {
  images: string[];
  alt: string;
}

export function Gallery({ images, alt }: GalleryProps) {
  const [index, setIndex] = useState(0);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-2xl bg-neutral-100 text-sm text-neutral-500 dark:bg-neutral-800">
        No photos yet
      </div>
    );
  }

  const main = images[index] ?? images[0]!;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
        <img
          src={main}
          alt={`${alt}, view ${index + 1} of ${images.length}`}
          loading="lazy"
          decoding="async"
          width={800}
          height={600}
          className="aspect-[4/3] w-full object-cover"
        />
        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-700 shadow hover:bg-white"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-1.5 text-neutral-700 shadow hover:bg-white"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>
      {images.length > 1 ? (
        <ul className="grid grid-cols-6 gap-1.5">
          {images.slice(0, 6).map((src, i) => (
            <li key={src}>
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
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
