import { cn } from '@/lib/utils';

// Opacity of each of the 12 spokes, fading around the circle.
const SPOKES: { d: string; opacity: number }[] = [
  { d: 'M12 2.75V5.25', opacity: 0.15 },
  { d: 'M16.95 4.08L15.7 6.25', opacity: 0.22 },
  { d: 'M19.92 7.05L17.75 8.3', opacity: 0.32 },
  { d: 'M21.25 12H18.75', opacity: 0.42 },
  { d: 'M19.92 16.95L17.75 15.7', opacity: 0.54 },
  { d: 'M16.95 19.92L15.7 17.75', opacity: 0.66 },
  { d: 'M12 21.25V18.75', opacity: 0.78 },
  { d: 'M7.05 19.92L8.3 17.75', opacity: 0.9 },
  { d: 'M4.08 16.95L6.25 15.7', opacity: 1 },
  { d: 'M2.75 12H5.25', opacity: 0.86 },
  { d: 'M4.08 7.05L6.25 8.3', opacity: 0.7 },
  { d: 'M7.05 4.08L8.3 6.25', opacity: 0.5 },
];

interface SpinnerProps {
  /** Size and colour classes for the icon; colour comes from `currentColor`. */
  className?: string;
  /** Screen-reader text. */
  label?: string;
}

export function Spinner({ className, label = 'Loading...' }: SpinnerProps) {
  return (
    <div className="inline-flex" role="status" aria-label={label}>
      <svg
        className={cn('size-6 shrink-0 animate-spin text-slate-700 dark:text-slate-200', className)}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeLinecap="round" strokeWidth="2">
          {SPOKES.map((spoke) => (
            <path key={spoke.d} d={spoke.d} opacity={spoke.opacity} />
          ))}
        </g>
      </svg>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Centered spinner used by the route `loading.tsx` files while a page loads. */
export function PageLoader({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={cn(
        'flex w-full items-center justify-center',
        // h-full centres it in the dashboard content area and in full-screen pages (classroom, course review).
        fullScreen ? 'min-h-screen bg-slate-50 dark:bg-slate-950' : 'h-full min-h-[60vh]',
      )}
    >
      <Spinner className="size-8" />
    </div>
  );
}
