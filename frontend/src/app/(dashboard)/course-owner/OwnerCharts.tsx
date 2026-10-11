'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ChartDatum {
  id: string;
  label: string;
  value: number;
}

/** Bars grow in from zero once, after the first paint. */
function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted;
}

/** Rounds the axis top up to 1, 2 or 5 × 10ⁿ so the gridlines land on whole numbers. */
function niceMax(peak: number, ticks: number) {
  if (peak <= 0) return ticks;
  const rough = peak / ticks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? rough;
  return Math.max(1, Math.ceil(step)) * ticks;
}

const share = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

/**
 * Vertical bars for the course lifecycle stages, in pipeline order.
 * One colour (primary): the stage names under each bar carry identity.
 * Hover or focus a bar to see its count and share; the others dim.
 */
export function LifecycleBarChart({
  data,
  unitLabel,
  height = 260,
}: {
  data: ChartDatum[];
  unitLabel: string;
  height?: number;
}) {
  const mounted = useMounted();
  const [active, setActive] = useState<string | null>(null);
  const TICKS = 4;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)), TICKS);
  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => (max / TICKS) * (TICKS - i));

  return (
    <div className="flex w-full gap-3 select-none">
      {/* Y axis */}
      <div
        className="flex w-6 shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-subtle-foreground"
        style={{ height }}
        aria-hidden
      >
        {ticks.map((tick) => (
          <span key={tick} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {tick}
          </span>
        ))}
      </div>

      <div className="min-w-0 flex-1">
        {/* Plot */}
        <div className="relative" style={{ height }}>
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden>
            {ticks.map((tick, i) => (
              <div
                key={tick}
                className={cn('w-full border-t', i === TICKS ? 'border-border' : 'border-border/40 border-dashed')}
              />
            ))}
          </div>

          <div className="relative flex h-full items-end justify-around gap-2 sm:gap-6">
            {data.map((d, i) => {
              const pct = (d.value / max) * 100;
              const isActive = active === d.id;
              const dimmed = active !== null && !isActive;
              return (
                <button
                  key={d.id}
                  type="button"
                  className="group relative flex h-full w-full max-w-[72px] flex-col items-center justify-end outline-none"
                  onMouseEnter={() => setActive(d.id)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(d.id)}
                  onBlur={() => setActive(null)}
                  aria-label={`${d.label}: ${d.value} ${unitLabel} (${share(d.value, total)}%)`}
                >
                  {/* Tooltip */}
                  {isActive ? (
                    <span
                      className="pointer-events-none absolute z-20 -translate-y-2 whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-2 text-left text-xs shadow-lg"
                      style={{ bottom: `${pct}%` }}
                    >
                      <span className="block font-semibold text-foreground">{d.label}</span>
                      <span className="mt-0.5 flex items-baseline gap-2 text-muted-foreground">
                        <span className="font-display text-base font-bold tabular-nums text-foreground">
                          {d.value}
                        </span>
                        {unitLabel} · {share(d.value, total)}%
                      </span>
                    </span>
                  ) : null}

                  {/* Value label, hidden while the tooltip shows it */}
                  <span
                    className={cn(
                      'mb-1.5 font-display text-sm font-bold tabular-nums text-foreground transition-opacity',
                      (isActive || dimmed) && 'opacity-0',
                    )}
                  >
                    {d.value}
                  </span>

                  <span
                    className={cn(
                      'w-full rounded-t-[4px] bg-primary transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none',
                      dimmed && 'opacity-35',
                      'group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-card',
                    )}
                    style={{
                      height: mounted ? `${d.value > 0 ? Math.max(pct, 1.5) : 0}%` : '0%',
                      transitionDelay: mounted ? `${i * 90}ms` : '0ms',
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* X axis labels */}
        <div className="mt-3 flex justify-around gap-2 sm:gap-6">
          {data.map((d) => (
            <div
              key={d.id}
              className={cn(
                'w-full max-w-[72px] text-center transition-opacity',
                active !== null && active !== d.id && 'opacity-50',
              )}
            >
              <p className="text-xs font-medium leading-tight text-secondary-foreground">{d.label}</p>
              <p className="mt-0.5 text-[11px] tabular-nums text-subtle-foreground">
                {share(d.value, total)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bars (top courses by enrollment), longest first.
 * The leader is full width; the rest scale against it.
 */
export function RankedBarChart({
  data,
  valueLabel,
}: {
  data: ChartDatum[];
  valueLabel: (value: number) => string;
}) {
  const mounted = useMounted();
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ol className="space-y-4">
      {data.map((d, i) => {
        const dimmed = active !== null && active !== d.id;
        return (
          <li
            key={d.id}
            tabIndex={0}
            className={cn(
              '-mx-2 rounded-lg px-2 py-1.5 outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring',
              dimmed && 'opacity-45',
            )}
            onMouseEnter={() => setActive(d.id)}
            onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(d.id)}
            onBlur={() => setActive(null)}
            aria-label={`${i + 1}. ${d.label}: ${valueLabel(d.value)}`}
          >
            <div className="flex items-baseline gap-3">
              <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-subtle-foreground">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={d.label}>
                {d.label}
              </span>
              <span className="shrink-0 font-display text-sm font-bold tabular-nums text-foreground">
                {d.value}
              </span>
            </div>
            <div className="mt-2 ml-7 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700 ease-out motion-reduce:transition-none"
                style={{
                  width: mounted ? `${d.value > 0 ? Math.max((d.value / max) * 100, 2) : 0}%` : '0%',
                  transitionDelay: mounted ? `${i * 90}ms` : '0ms',
                }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}
