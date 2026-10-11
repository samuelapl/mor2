import { Newspaper } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Cover image, or a neutral placeholder when a post has none. Plain <img>: covers live on MinIO. */
export function NewsCover({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gradient-to-br from-info-soft to-warning-soft text-info/60',
          className,
        )}
        aria-hidden
      >
        <Newspaper className="h-10 w-10" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={cn('object-cover', className)} loading="lazy" />;
}
