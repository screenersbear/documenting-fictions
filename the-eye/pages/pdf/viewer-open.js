// The PDF preview viewer: opening and closing it, pinching to zoom.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfViewerOpen = function addPdfViewerOpen(ed) {
  Object.assign(ed, { showPdfPreview });
  async function showPdfPreview(blob) {
    ed.teardownPdfViewer();
    const token = ed.pdfViewer.token;
    ed.pdfStatusEl.textContent = 'Loading preview…';
    ed.pdfStatusEl.hidden = false;
    document.getElementById('pdfPreviewOverlay').hidden = false;
    try {
      const pdfjs = await ed.loadPdfJs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      if (token !== ed.pdfViewer.token) { doc.destroy(); return; }
      ed.pdfViewer.doc = doc;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (token !== ed.pdfViewer.token) return;
        const v = page.getViewport({ scale: 1 });
        const wrap = document.createElement('div');
        wrap.className = 'pdf-page';
        wrap.style.aspectRatio = `${v.width} / ${v.height}`;
        const canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        ed.pdfPagesEl.appendChild(wrap);
        ed.pdfViewer.pages.push({ page, wrap, canvas, w: v.width, h: v.height, renderedW: 0, task: null });
      }
      ed.pdfViewer.fitW = ed.pdfFitWidth();
      ed.pdfPagesEl.style.width = `${ed.pdfViewer.fitW}px`;
      ed.pdfViewportEl.scrollTop = 0;
      ed.pdfViewportEl.scrollLeft = 0;
      ed.pdfStatusEl.hidden = true;
      ed.updatePdfPageIndicator();
      ed.refreshPdfResolution();
    } catch (err) {
      if (token !== ed.pdfViewer.token) return;
      console.error('Failed to display PDF preview', err);
      ed.pdfStatusEl.textContent = "Couldn't show the preview here. You can still Share the PDF.";
    }
  }

  function closePdfPreview() {
    document.getElementById('pdfPreviewOverlay').hidden = true;
    ed.teardownPdfViewer();
    ed.pdfPreviewBlob = null;
    // An "Export previous shoots" archive shown here: now that it's been
    // looked at (and maybe saved), ask whether it saved before offering to
    // delete anything.
    if (ed.exportArchiveAwaitingSave) ed.askExportArchiveSaved();
  }

  ed.pdfViewportEl.addEventListener('scroll', ed.updatePdfPageIndicator, { passive: true });

  window.addEventListener('resize', () => {
    if (document.getElementById('pdfPreviewOverlay').hidden || !ed.pdfViewer.pages.length) return;
    ed.pdfViewer.fitW = ed.pdfFitWidth();
    ed.pdfPagesEl.style.width = `${ed.pdfViewer.fitW * ed.pdfViewer.zoom}px`;
    ed.schedulePdfSharpen();
  });

  document.getElementById('pdfZoomInBtn').addEventListener('click', () => ed.setPdfZoom(ed.pdfViewer.zoom * 1.5));
  document.getElementById('pdfZoomOutBtn').addEventListener('click', () => ed.setPdfZoom(ed.pdfViewer.zoom / 1.5));

  // Pinch and double-tap. Panning is left to native scrolling; a second finger
  // takes over the gesture and turns it into zoom around the fingers' midpoint.
  (function setupPdfPinchZoom() {
    let pinch = null;
    let lastTap = null;
    let tapStart = null;

    const touchPoint = (t) => {
      const r = ed.pdfViewportEl.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    ed.pdfViewportEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinch = { d0: dist(e.touches[0], e.touches[1]) || 1, z0: ed.pdfViewer.zoom };
        tapStart = null;
      } else if (e.touches.length === 1) {
        tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
    }, { passive: true });

    ed.pdfViewportEl.addEventListener('touchmove', (e) => {
      if (!pinch || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const a = touchPoint(e.touches[0]);
      const b = touchPoint(e.touches[1]);
      ed.setPdfZoom(pinch.z0 * dist(e.touches[0], e.touches[1]) / pinch.d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }, { passive: false });

    ed.pdfViewportEl.addEventListener('touchend', (e) => {
      if (pinch) {
        if (e.touches.length < 2) pinch = null;
        lastTap = null;
        return;
      }
      if (!tapStart || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y);
      const now = Date.now();
      if (moved < 12 && now - tapStart.t < 300) {
        if (lastTap && now - lastTap.t < 300 && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40) {
          const p = touchPoint(t);
          ed.setPdfZoom(ed.pdfViewer.zoom > 1.05 ? 1 : ed.PDF_DOUBLE_TAP_ZOOM, p.x, p.y);
          lastTap = null;
        } else {
          lastTap = { x: t.clientX, y: t.clientY, t: now };
        }
      } else {
        lastTap = null;
      }
      tapStart = null;
    }, { passive: true });

    ed.pdfViewportEl.addEventListener('touchcancel', () => { pinch = null; tapStart = null; lastTap = null; }, { passive: true });
  })();

  document.getElementById('pdfPreviewCloseBtn').addEventListener('click', closePdfPreview);

  document.getElementById('pdfPreviewOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pdfPreviewOverlay')) closePdfPreview();
  });

  document.getElementById('pdfPreviewShareBtn').addEventListener('click', async () => {
    if (!ed.pdfPreviewBlob) return;
    try {
      const file = new File([ed.pdfPreviewBlob], ed.pdfPreviewFilename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(ed.pdfPreviewBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ed.pdfPreviewFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('Failed to share shoot PDF', err);
        ed.showToast('Could not create PDF');
      }
    }
  });
};
