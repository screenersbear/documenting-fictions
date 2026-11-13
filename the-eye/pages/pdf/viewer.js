// The PDF preview viewer: pages drawn sharp at any zoom.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfViewer = function addPdfViewer(ed) {
  Object.assign(ed, { loadPdfJs, pdfFitWidth, refreshPdfResolution, schedulePdfSharpen, setPdfZoom, updatePdfPageIndicator, teardownPdfViewer });
  // ---------- PDF preview viewer ----------
  // Draws the built PDF with pdf.js instead of an <iframe>, so it looks the
  // same everywhere: page 1 is sized to fit the whole screen (nothing cut off
  // to scroll to), further pages sit below it, and it zooms in where you need
  // to — pinch, double-tap, or the +/- buttons. The viewport scrolls natively
  // (real momentum, pans in both directions once zoomed); zoom just widens the
  // pages and re-anchors the scroll position so the spot you're pinching on
  // stays put. pdf.js loads the first time a preview opens, not at launch.
  const PDF_ZOOM_MAX = 5;
  const PDF_DOUBLE_TAP_ZOOM = 2.5; ed.PDF_DOUBLE_TAP_ZOOM = PDF_DOUBLE_TAP_ZOOM;
  const PDF_MAX_CANVAS_PX = 2600;
  const pdfViewer = { doc: null, pages: [], zoom: 1, fitW: 0, token: 0, sharpenTimer: null }; ed.pdfViewer = pdfViewer;

  // pdf.js and the worker it draws with (components/load-lib.js loads it).
  async function loadPdfJs() {
    const pdfjsLib = await ed.loadLib('lib/pdf.min.js', 'pdfjsLib');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    return pdfjsLib;
  }

  const pdfViewportEl = document.getElementById('pdfPreviewViewport'); ed.pdfViewportEl = pdfViewportEl;
  const pdfPagesEl = document.getElementById('pdfPreviewPages'); ed.pdfPagesEl = pdfPagesEl;
  const pdfStatusEl = document.getElementById('pdfPreviewStatus'); ed.pdfStatusEl = pdfStatusEl;
  const pdfPageIndicatorEl = document.getElementById('pdfPageIndicator');

  // One whole page fits inside the viewport, whichever way it's limited —
  // width on a phone, height on a wide screen.
  function pdfFitWidth() {
    const first = pdfViewer.pages[0];
    if (!first) return 0;
    const availW = pdfViewportEl.clientWidth - 16;
    const availH = pdfViewportEl.clientHeight - 16;
    return Math.max(80, Math.min(availW, availH * (first.w / first.h)));
  }

  async function renderPdfPage(p, pixelW) {
    if (p.task) { try { p.task.cancel(); } catch (e) { /* already finished */ } }
    const vp = p.page.getViewport({ scale: pixelW / p.w });
    const off = document.createElement('canvas');
    off.width = Math.round(vp.width);
    off.height = Math.round(vp.height);
    const task = p.page.render({ canvasContext: off.getContext('2d'), viewport: vp });
    p.task = task;
    try {
      await task.promise;
    } catch (err) {
      if (err && err.name === 'RenderingCancelledException') return;
      throw err;
    }
    p.canvas.width = off.width;
    p.canvas.height = off.height;
    p.canvas.getContext('2d').drawImage(off, 0, 0);
    p.renderedW = off.width;
    p.task = null;
  }

  // Pages start at a resolution good for about 1.5x zoom; once zoom settles,
  // the pages actually in view are redrawn sharp for the size they're
  // displayed at (capped, so a big zoom can't exhaust memory), and pages that
  // have scrolled away drop back down.
  function refreshPdfResolution() {
    const dpr = window.devicePixelRatio || 1;
    const vpRect = pdfViewportEl.getBoundingClientRect();
    pdfViewer.pages.forEach(p => {
      const r = p.wrap.getBoundingClientRect();
      const visible = r.bottom > vpRect.top && r.top < vpRect.bottom;
      const base = Math.min(PDF_MAX_CANVAS_PX, Math.max(700, Math.round(pdfViewer.fitW * dpr * 1.5)));
      const want = visible ? Math.min(PDF_MAX_CANVAS_PX, Math.max(base, Math.round(r.width * dpr))) : base;
      if (!p.renderedW || Math.abs(want - p.renderedW) / p.renderedW > 0.25) {
        renderPdfPage(p, want).catch(() => {});
      }
    });
  }

  function schedulePdfSharpen() {
    clearTimeout(pdfViewer.sharpenTimer);
    pdfViewer.sharpenTimer = setTimeout(refreshPdfResolution, 220);
  }

  // Sets the zoom (1 = whole page fits) and keeps the point at (ax, ay) —
  // viewport-relative pixels — under the same spot of the page.
  function setPdfZoom(z, ax, ay) {
    if (!pdfViewer.pages.length) return;
    const zoom = Math.max(1, Math.min(PDF_ZOOM_MAX, z));
    if (ax === undefined) ax = pdfViewportEl.clientWidth / 2;
    if (ay === undefined) ay = pdfViewportEl.clientHeight / 2;
    const w0 = pdfPagesEl.offsetWidth;
    const h0 = pdfPagesEl.offsetHeight;
    const fracX = w0 ? (pdfViewportEl.scrollLeft + ax - pdfPagesEl.offsetLeft) / w0 : 0.5;
    const fracY = h0 ? (pdfViewportEl.scrollTop + ay - pdfPagesEl.offsetTop) / h0 : 0;
    pdfViewer.zoom = zoom;
    pdfPagesEl.style.width = `${pdfViewer.fitW * zoom}px`;
    pdfViewportEl.scrollLeft = fracX * pdfPagesEl.offsetWidth + pdfPagesEl.offsetLeft - ax;
    pdfViewportEl.scrollTop = fracY * pdfPagesEl.offsetHeight + pdfPagesEl.offsetTop - ay;
    schedulePdfSharpen();
    updatePdfPageIndicator();
  }

  function updatePdfPageIndicator() {
    const n = pdfViewer.pages.length;
    pdfPageIndicatorEl.hidden = n < 2;
    if (n < 2) return;
    const mid = pdfViewportEl.scrollTop + pdfViewportEl.clientHeight / 2;
    let current = n;
    for (let i = 0; i < n; i++) {
      const w = pdfViewer.pages[i].wrap;
      if (mid < w.offsetTop + w.offsetHeight + 5) { current = i + 1; break; }
    }
    pdfPageIndicatorEl.textContent = `Page ${current} of ${n}`;
  }

  function teardownPdfViewer() {
    pdfViewer.token++;
    clearTimeout(pdfViewer.sharpenTimer);
    pdfViewer.pages.forEach(p => { if (p.task) { try { p.task.cancel(); } catch (e) { /* already finished */ } } });
    if (pdfViewer.doc) { try { pdfViewer.doc.destroy(); } catch (e) { /* already gone */ } }
    pdfViewer.doc = null;
    pdfViewer.pages = [];
    pdfViewer.zoom = 1;
    pdfPagesEl.innerHTML = '';
    pdfPagesEl.style.width = '';
    pdfPageIndicatorEl.hidden = true;
  }
};
