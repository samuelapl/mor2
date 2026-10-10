'use client';

import React from 'react';
import { AlertTriangle, Download, Loader2, Presentation, ZoomIn, ZoomOut } from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export type SlideDeckKind = 'pdf' | 'pptx' | 'legacy' | 'google' | 'embed';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
// Horizontal padding around pages/slides inside the scroll area (p-4 on both sides).
const DECK_GUTTER = 32;

const PDF_FILE = /\.pdf(\?.*)?$/i;
const PPTX_FILE = /\.(pptx|ppsx)(\?.*)?$/i;
// Binary PowerPoint / OpenDocument decks: browsers have no renderer for these.
const LEGACY_FILE = /\.(ppt|pps|odp)(\?.*)?$/i;

/** Works out how a slide deck should be displayed from its URL and (optional) original file name. */
export function getSlideDeckKind(url: string, fileName?: string): SlideDeckKind {
  const matches = (re: RegExp) => re.test(url) || Boolean(fileName && re.test(fileName));
  if (url.includes('docs.google.com/presentation')) return 'google';
  if (matches(PDF_FILE)) return 'pdf';
  if (matches(PPTX_FILE)) return 'pptx';
  if (matches(LEGACY_FILE)) return 'legacy';
  return 'embed';
}

function googleSlidesEmbed(url: string): string {
  const base = url.split('/edit')[0].split('/pub')[0].split('/preview')[0].replace(/\/+$/, '');
  return `${base}/embed?start=false&loop=false&delayms=3000`;
}

/**
 * Tracks an element's content width so pages can be rendered at the size they are shown.
 * Uses a callback ref so it also picks up elements that mount after the first render.
 */
function useElementWidth<T extends HTMLElement>() {
  const [element, setElement] = React.useState<T | null>(null);
  const [width, setWidth] = React.useState(0);
  React.useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);
  return [setElement, width, element] as const;
}

/* ------------------------------------------------------------------ */
/*  PDF: every page stacked in a scrollable column                     */
/* ------------------------------------------------------------------ */

function PdfPage({
  doc,
  pageNumber,
  width,
  aspect,
}: {
  doc: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  aspect: number;
}) {
  const holderRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = React.useState(false);

  // Only render pages near the viewport so long decks stay light.
  React.useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visible || width <= 0) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;

    doc.getPage(pageNumber).then((page) => {
      const canvas = canvasRef.current;
      if (cancelled || !canvas) return;
      const base = page.getViewport({ scale: 1 });
      const scale = width / base.width;
      const ratio = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * ratio });
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / ratio)}px`;
      canvas.style.height = `${Math.floor(viewport.height / ratio)}px`;
      const context = canvas.getContext('2d');
      if (!context) return;
      task = page.render({ canvasContext: context, viewport });
      task.promise.catch(() => {
        /* cancelled by a newer render */
      });
    });

    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, width, visible]);

  return (
    <div
      ref={holderRef}
      className="mx-auto bg-white shadow-md"
      style={{ width, minHeight: Math.round(width * aspect) }}
    >
      <canvas ref={canvasRef} className="block" aria-label={`Page ${pageNumber}`} />
    </div>
  );
}

interface DeckProps {
  url: string;
  /** Page/slide width at 100% (fit to the viewer). */
  fitWidth: number;
  zoom: number;
  onPageCount: (count: number) => void;
}

function PdfDeck({ url, fitWidth, zoom, onPageCount }: DeckProps) {
  const { tBilingual } = useTranslation();
  const [doc, setDoc] = React.useState<PDFDocumentProxy | null>(null);
  const [aspect, setAspect] = React.useState(9 / 16);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let loaded: PDFDocumentProxy | null = null;
    setDoc(null);
    setError(null);

    (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        // Served from /public: Next's minifier can't bundle the worker module. Keep the copy
        // in sync with the pinned pdfjs-dist version (node_modules/pdfjs-dist/build/).
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        loaded = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        const first = await loaded.getPage(1);
        const viewport = first.getViewport({ scale: 1 });
        if (cancelled) return;
        setAspect(viewport.height / viewport.width);
        setDoc(loaded);
        onPageCount(loaded.numPages);
      } catch {
        if (!cancelled) setError(tBilingual('Could not load this PDF.', 'ይህን PDF መክፈት አልተቻለም።'));
      }
    })();

    return () => {
      cancelled = true;
      loaded?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Pages are redrawn at the zoomed size so text stays sharp.
  const pageWidth = Math.round(fitWidth * zoom);

  return (
    <div className="w-max min-w-full space-y-4 p-4">
      {error ? (
        <DeckMessage>{error}</DeckMessage>
      ) : !doc ? (
        <DeckLoading />
      ) : (
        Array.from({ length: doc.numPages }, (_, i) => (
          <PdfPage key={i} doc={doc} pageNumber={i + 1} width={pageWidth} aspect={aspect} />
        ))
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PPTX: every slide stacked in a scrollable column                   */
/* ------------------------------------------------------------------ */

/**
 * Decks written by generator tools (pptxgenjs, some AI/online editors) often declare parts in
 * [Content_Types].xml that aren't in the archive. PowerPoint ignores them, but pptx-preview
 * aborts and shows no slides, so drop those dangling declarations before rendering.
 */
async function dropMissingParts(data: ArrayBuffer): Promise<ArrayBuffer> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(data);
  const types = zip.file('[Content_Types].xml');
  if (!types) return data;
  const xml = await types.async('text');
  const cleaned = xml.replace(/<Override\b[^>]*PartName="\/([^"]+)"[^>]*\/>/g, (entry, part: string) =>
    zip.file(part) ? entry : '',
  );
  if (cleaned === xml) return data;
  zip.file('[Content_Types].xml', cleaned);
  return zip.generateAsync({ type: 'arraybuffer' });
}

function PptxDeck({ url, fitWidth, zoom, onPageCount }: DeckProps) {
  const { tBilingual } = useTranslation();
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [data, setData] = React.useState<ArrayBuffer | null>(null);
  const [rendering, setRendering] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.arrayBuffer();
      })
      .then(dropMissingParts)
      .then((buf) => {
        if (!cancelled) setData(buf);
      })
      .catch(() => {
        if (!cancelled) setError(tBilingual('Could not load this slide deck.', 'ይህን ስላይድ መክፈት አልተቻለም።'));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  // Re-render only when the width settles on a noticeably different size.
  const [renderWidth, setRenderWidth] = React.useState(0);
  React.useEffect(() => {
    if (fitWidth <= 0) return;
    const timer = setTimeout(() => {
      setRenderWidth((prev) => (Math.abs(prev - fitWidth) > 24 ? fitWidth : prev));
    }, 150);
    return () => clearTimeout(timer);
  }, [fitWidth]);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!data || !host || renderWidth <= 0) return;
    let cancelled = false;
    let previewer: { destroy: () => void } | null = null;
    setRendering(true);

    (async () => {
      try {
        const { init } = await import('pptx-preview');
        if (cancelled) return;
        host.innerHTML = '';
        const instance = init(host, {
          width: renderWidth,
          height: Math.round((renderWidth * 9) / 16),
          mode: 'list',
        });
        previewer = instance;
        // The library takes ownership of the buffer, so hand it a copy to allow re-rendering.
        await instance.preview(data.slice(0));
        if (cancelled) return;
        onPageCount(instance.slideCount);
        setRendering(false);
      } catch {
        if (!cancelled) {
          setError(tBilingual('Could not display this slide deck.', 'ይህን ስላይድ ማሳየት አልተቻለም።'));
          setRendering(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      previewer?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, renderWidth]);

  return (
    <div className="relative w-max min-w-full p-4">
      {error ? (
        <DeckMessage>{error}</DeckMessage>
      ) : (
        <>
          {rendering && <DeckLoading />}
          {/* The library gives its wrapper a fixed height and its own scrollbar; let the outer
              viewer do the scrolling instead so there is a single scroll area. */}
          {/* Slides are HTML, so CSS zoom re-lays them out crisply without re-parsing the deck. */}
          <div
            ref={hostRef}
            style={{ zoom }}
            className="mx-auto w-fit [&_.pptx-preview-wrapper]:!h-auto [&_.pptx-preview-wrapper]:!overflow-visible [&_.pptx-preview-wrapper]:!bg-transparent"
          />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function DeckLoading() {
  const { tBilingual } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-xs text-slate-400">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
      {tBilingual('Loading slides…', 'ስላይዶች በመጫን ላይ…')}
    </div>
  );
}

function DeckMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center text-xs text-slate-300">
      <AlertTriangle className="h-6 w-6 text-amber-400" />
      {children}
    </div>
  );
}

export interface SlideDeckViewerProps {
  url: string;
  fileName?: string;
  title?: string;
  className?: string;
  /** Caps the scroll area; defaults to most of the viewport. */
  maxHeightClass?: string;
  /** Rendered before the file name, e.g. a block number. */
  badge?: React.ReactNode;
}

/**
 * Shows an uploaded or linked slide deck inside the page. PDF and PPTX decks are drawn
 * in-browser as a vertical scroll of pages/slides; Google Slides use Google's embed.
 */
export function SlideDeckViewer({
  url,
  fileName,
  title,
  className,
  maxHeightClass = 'max-h-[75vh]',
  badge,
}: SlideDeckViewerProps) {
  const { tBilingual } = useTranslation();
  const kind = getSlideDeckKind(url, fileName);
  const [pageCount, setPageCount] = React.useState<number | null>(null);
  const label = fileName || title || tBilingual('Slide Deck', 'ስላይድ');
  const canDownload = kind !== 'google' && kind !== 'embed';

  const [zoom, setZoom] = React.useState(1);
  const [scrollRef, viewerWidth, scrollEl] = useElementWidth<HTMLDivElement>();
  const fitWidth = Math.max(viewerWidth - DECK_GUTTER, 0);
  const zoomable = kind === 'pdf' || kind === 'pptx';

  React.useEffect(() => {
    setPageCount(null);
    setZoom(1);
  }, [url]);

  // Keep the point at the centre of the view in place when the zoom changes.
  const anchorRef = React.useRef<{ x: number; y: number } | null>(null);
  const changeZoom = React.useCallback(
    (next: (current: number) => number) => {
      const el = scrollEl;
      if (el && el.scrollHeight > 0) {
        anchorRef.current = {
          x: (el.scrollLeft + el.clientWidth / 2) / el.scrollWidth,
          y: (el.scrollTop + el.clientHeight / 2) / el.scrollHeight,
        };
      }
      setZoom((current) => clampZoom(next(current)));
    },
    [scrollEl],
  );
  React.useLayoutEffect(() => {
    const el = scrollEl;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    anchorRef.current = null;
    el.scrollLeft = anchor.x * el.scrollWidth - el.clientWidth / 2;
    el.scrollTop = anchor.y * el.scrollHeight - el.clientHeight / 2;
  }, [zoom, scrollEl]);

  // Ctrl/⌘ + wheel (and trackpad pinch, which browsers report the same way) zooms the deck
  // instead of the whole page. Needs a non-passive listener to cancel the browser zoom.
  React.useEffect(() => {
    const el = scrollEl;
    if (!el || !zoomable) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom((z) => z * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [scrollEl, zoomable, changeZoom]);

  const zoomButtonClass =
    'inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:pointer-events-none disabled:opacity-30';

  return (
    // contain: inline-size keeps zoomed (wider) pages from widening the viewer's parent, which
    // would raise the fit width and feed back into an ever-growing zoom.
    <div
      className={cn(
        'min-w-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 [contain:inline-size]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-2.5 text-xs text-slate-300">
        <div className="flex min-w-0 items-center gap-2">
          {badge}
          <Presentation className="h-4 w-4 shrink-0 text-indigo-400" />
          <span className="truncate font-semibold">{label}</span>
          {pageCount ? (
            <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
              {kind === 'pdf'
                ? tBilingual(`${pageCount} pages`, `${pageCount} ገጾች`)
                : tBilingual(`${pageCount} slides`, `${pageCount} ስላይዶች`)}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {zoomable && (
            <div className="flex items-center rounded-lg bg-slate-800 p-0.5" role="group" aria-label={tBilingual('Zoom', 'ማጉያ')}>
              <button
                type="button"
                onClick={() => changeZoom((z) => z - ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
                className={zoomButtonClass}
                title={tBilingual('Zoom out', 'አሳንስ')}
                aria-label={tBilingual('Zoom out', 'አሳንስ')}
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => changeZoom(() => 1)}
                className="h-7 min-w-[3.25rem] rounded-lg px-1.5 text-[11px] font-semibold tabular-nums text-slate-200 transition hover:bg-slate-700"
                title={tBilingual('Fit to width', 'ከስፋቱ ጋር አስተካክል')}
                aria-label={tBilingual(`Zoom ${Math.round(zoom * 100)}%, reset to fit width`, `ማጉያ ${Math.round(zoom * 100)}%፣ ወደ ስፋት መልስ`)}
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => changeZoom((z) => z + ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
                className={zoomButtonClass}
                title={tBilingual('Zoom in', 'አጉላ')}
                aria-label={tBilingual('Zoom in', 'አጉላ')}
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {canDownload && (
            <a
              href={url}
              download={fileName}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-2.5 py-1.5 font-medium text-white transition hover:bg-indigo-500"
              title={tBilingual('Download', 'አውርድ')}
            >
              <Download className="h-3 w-3" />
              <span className="hidden sm:inline">{tBilingual('Download', 'አውርድ')}</span>
            </a>
          )}
        </div>
      </div>

      {kind === 'google' || kind === 'embed' ? (
        <div className="aspect-video w-full bg-slate-950">
          <iframe
            src={kind === 'google' ? googleSlidesEmbed(url) : url}
            className="h-full w-full border-0"
            allowFullScreen
            title={label}
          />
        </div>
      ) : kind === 'legacy' ? (
        <DeckMessage>
          <span className="max-w-sm">
            {tBilingual(
              'This older PowerPoint format (.ppt / .pps / .odp) cannot be shown in the browser. Save it as .pptx or PDF and upload it again, or download it to view.',
              'ይህ የቆየ የፓወርፖይንት ቅርጸት (.ppt / .pps / .odp) በብሮውዘር ውስጥ ሊታይ አይችልም። እንደ .pptx ወይም PDF አስቀምጠው እንደገና ይጫኑ ወይም አውርደው ይመልከቱ።',
            )}
          </span>
        </DeckMessage>
      ) : (
        <div ref={scrollRef} className={cn('deck-scroll overflow-auto bg-slate-950/60', maxHeightClass)}>
          {kind === 'pdf' ? (
            <PdfDeck url={url} fitWidth={fitWidth} zoom={zoom} onPageCount={setPageCount} />
          ) : (
            <PptxDeck url={url} fitWidth={fitWidth} zoom={zoom} onPageCount={setPageCount} />
          )}
        </div>
      )}
    </div>
  );
}
