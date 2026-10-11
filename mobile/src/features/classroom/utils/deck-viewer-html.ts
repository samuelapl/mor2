import { JSZIP_SRC, PDFJS_SRC, PDFJS_WORKER_SRC, PPTX_PREVIEW_SRC } from './deck-viewer-bundle';

export type DeckKind = 'pdf' | 'pptx';

/** Messages the viewer page posts back to the app. */
export type DeckViewerMessage =
  | { type: 'ready' }
  | { type: 'pages'; count: number }
  | { type: 'error'; message: string };

/** A JS string literal that is also safe inside an inline <script> element. */
const scriptString = (source: string) => JSON.stringify(source).replace(/<\//g, '<\\/');

/**
 * A self-contained page that draws a slide deck as a vertical, scrollable column of pages
 * (PDF: pdf.js, PPTX: pptx-preview), like the web's SlideDeckViewer. The libraries are inlined,
 * so it works offline. The app sends the file's bytes with `window.__loadDeck(base64)` once the
 * page posts `ready`; reading the file in the app avoids CORS and works for downloaded files.
 */
export function buildDeckViewerHtml(kind: DeckKind, labels: { loading: string; failed: string }) {
  const libs =
    kind === 'pdf'
      ? `<script>window.__PDFJS_SRC=${scriptString(PDFJS_SRC)};window.__PDFJS_WORKER_SRC=${scriptString(PDFJS_WORKER_SRC)};</script>`
      : `<script>${JSZIP_SRC.replace(/<\/script/gi, '<\\/script')}</script><script>${PPTX_PREVIEW_SRC.replace(/<\/script/gi, '<\\/script')}</script>`;

  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=5, user-scalable=yes">
<style>
  html, body { margin: 0; padding: 0; background: #0f172a; -webkit-text-size-adjust: 100%; }
  #deck { display: flex; flex-direction: column; gap: 12px; padding: 12px; box-sizing: border-box; }
  .page { position: relative; width: 100%; background: #fff; border-radius: 6px; overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,.45); }
  .page canvas { display: block; width: 100%; height: auto; }
  .num { position: absolute; right: 8px; bottom: 8px; padding: 2px 8px; border-radius: 999px;
         background: rgba(15,23,42,.75); color: #fff; font: 600 11px system-ui, sans-serif; }
  #msg { color: #cbd5e1; font: 14px system-ui, sans-serif; text-align: center; padding: 48px 16px; }
  .pptx-preview-wrapper { height: auto !important; overflow: visible !important; background: transparent !important; }
</style>
</head><body>
<div id="msg">${labels.loading}</div>
<div id="deck"></div>
${libs}
<script>
(function () {
  var KIND = ${JSON.stringify(kind)};
  var FAILED = ${JSON.stringify(labels.failed)};
  var deck = document.getElementById('deck');
  var msg = document.getElementById('msg');
  function send(m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function fail(e) { msg.style.display = 'block'; msg.textContent = FAILED; send({ type: 'error', message: String((e && e.message) || e) }); }
  function bytesOf(b64) {
    var bin = atob(b64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function blobUrl(src) { return URL.createObjectURL(new Blob([src], { type: 'text/javascript' })); }

  async function renderPdf(bytes) {
    var pdfjs = await import(blobUrl(window.__PDFJS_SRC));
    pdfjs.GlobalWorkerOptions.workerSrc = blobUrl(window.__PDFJS_WORKER_SRC);
    var doc = await pdfjs.getDocument({ data: bytes }).promise;
    var first = (await doc.getPage(1)).getViewport({ scale: 1 });
    var aspect = first.height / first.width;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    msg.style.display = 'none';
    send({ type: 'pages', count: doc.numPages });

    // Pages are drawn only when near the screen, so long decks stay light.
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || entry.target.dataset.done) return;
        entry.target.dataset.done = '1';
        observer.unobserve(entry.target);
        drawPage(entry.target, Number(entry.target.dataset.page));
      });
    }, { rootMargin: '1200px 0px' });

    async function drawPage(el, n) {
      try {
        var page = await doc.getPage(n);
        var base = page.getViewport({ scale: 1 });
        var viewport = page.getViewport({ scale: (el.clientWidth * dpr) / base.width });
        var canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        el.style.minHeight = '';
        el.insertBefore(canvas, el.firstChild);
      } catch (e) { /* leave the placeholder */ }
    }

    for (var n = 1; n <= doc.numPages; n++) {
      var el = document.createElement('div');
      el.className = 'page';
      el.dataset.page = String(n);
      el.style.minHeight = Math.round((deck.clientWidth - 24) * aspect) + 'px';
      var num = document.createElement('div');
      num.className = 'num';
      num.textContent = n + ' / ' + doc.numPages;
      el.appendChild(num);
      deck.appendChild(el);
      observer.observe(el);
    }
  }

  // Generator tools often declare parts in [Content_Types].xml that are not in the archive;
  // pptx-preview then shows nothing, so drop those declarations first (same as the web).
  async function dropMissingParts(bytes) {
    var zip = await JSZip.loadAsync(bytes);
    var types = zip.file('[Content_Types].xml');
    if (!types) return bytes.buffer;
    var xml = await types.async('text');
    var cleaned = xml.replace(/<Override\\b[^>]*PartName="\\/([^"]+)"[^>]*\\/>/g, function (entry, part) {
      return zip.file(part) ? entry : '';
    });
    if (cleaned === xml) return bytes.buffer;
    zip.file('[Content_Types].xml', cleaned);
    return zip.generateAsync({ type: 'arraybuffer' });
  }

  function availableWidth() {
    return Math.max(160, Math.min(deck.clientWidth, window.innerWidth) - 24);
  }

  async function renderPptx(bytes) {
    var data = await dropMissingParts(bytes);
    // Measure after layout has settled (a timer, not requestAnimationFrame: an offscreen
    // WebView may pause animation frames).
    await new Promise(function (r) { setTimeout(r, 60); });
    var width = availableWidth();
    var previewer = window.pptxPreview.init(deck, { width: width, height: Math.round((width * 9) / 16), mode: 'list' });
    await previewer.preview(data);
    // Never wider than the screen: scale the slide column to fit, again on rotation/resize.
    var wrapper = deck.querySelector('.pptx-preview-wrapper');
    function fit() {
      if (!wrapper) return;
      wrapper.style.zoom = '';
      if (wrapper.offsetWidth > availableWidth()) {
        wrapper.style.zoom = String(availableWidth() / wrapper.offsetWidth);
      }
    }
    fit();
    window.addEventListener('resize', fit);
    msg.style.display = 'none';
    send({ type: 'pages', count: previewer.slideCount || 0 });
  }

  window.__loadDeck = function (b64) {
    var bytes = bytesOf(b64);
    (KIND === 'pdf' ? renderPdf(bytes) : renderPptx(bytes)).catch(fail);
  };
  send({ type: 'ready' });
})();
</script>
</body></html>`;
}
