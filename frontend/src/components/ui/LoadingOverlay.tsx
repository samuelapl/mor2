import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
  fullscreen?: boolean;
}

export function LoadingOverlay({
  message = 'Processing...',
  className,
  fullscreen = false,
}: LoadingOverlayProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-xs z-40 transition-all duration-200',
        fullscreen ? 'fixed inset-0' : 'absolute inset-0 rounded-inherit',
        className,
      )}
    >
      <Spinner size="lg" variant="primary" />
      {message && (
        <p className="text-sm font-medium text-slate-700 max-w-xs text-center animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
}
