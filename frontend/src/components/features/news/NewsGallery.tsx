'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { newsTextLang } from '@/lib/news';
import type { ApiNewsImage } from '@/lib/api/types';

/** Photo grid with a keyboard-navigable lightbox. */
export function NewsGallery({ images }: { images: ApiNewsImage[] }) {
  const { tBilingual } = useTranslation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((i) => (i === null ? i : (i + delta + images.length) % images.length)),
    [images.length],
  );

  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIndex, close, step]);

  if (images.length === 0) return null;
  const current = openIndex === null ? null : images[openIndex];

  return (
    <section className="mt-10">
      <h2 className="mb-4 font-display text-lg font-bold text-slate-900 dark:text-white">
        {tBilingual('Photo gallery', 'የፎቶ ማዕከል')}
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((image, index) => (
          <figure key={image.id}>
            <button
              type="button"
              onClick={() => setOpenIndex(index)}
              className="block w-full overflow-hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.url}
                alt={image.caption ?? ''}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition hover:scale-[1.03]"
              />
            </button>
            {image.caption && (
              <figcaption
                lang={newsTextLang(image.caption)}
                className="mt-1.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400"
              >
                {image.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label={tBilingual('Close', 'ዝጋ')}
            className="absolute right-4 top-4 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label={tBilingual('Previous photo', 'ቀዳሚ ፎቶ')}
                className="absolute left-2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:left-6"
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label={tBilingual('Next photo', 'ቀጣይ ፎቶ')}
                className="absolute right-2 rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white sm:right-6"
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.url}
              alt={current.caption ?? ''}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
            />
            {current.caption && (
              <figcaption
                lang={newsTextLang(current.caption)}
                className="mt-3 text-center text-sm text-white/80"
              >
                {current.caption}
              </figcaption>
            )}
          </figure>
        </div>
      )}
    </section>
  );
}
