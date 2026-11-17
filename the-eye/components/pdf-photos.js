// A PDF's pages as photos (round 7, 16-mood-board-pdf): each page drawn on
// the phone with pdf.js (nothing is uploaded), its long side about 2400 px
// like Ref's imports, as a JPEG data address like the mood board's own
// photos. pdf.js comes from lib/ (components/load-lib.js, by way of the PDF
// viewer's loadPdfJs). One page at a time, so a phone never holds more.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfPhotos = function addPdfPhotos(ed) {
  Object.assign(ed, { pdfToPhotos });
  const LONG_SIDE = 2400;

  // Resolves the pages as data addresses, first page first. onPage(n, of)
  // before each one is drawn.
  async function pdfToPhotos(file, onPage) {
    const pdfjsLib = await ed.loadPdfJs();
    // isEvalSupported off: a PDF from anywhere can't run its own code here.
    const doc = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const photos = [];
    try {
      for (let n = 1; n <= doc.numPages; n++) {
        if (onPage) onPage(n, doc.numPages);
        const page = await doc.getPage(n);
        const plain = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: LONG_SIDE / Math.max(plain.width, plain.height) });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        // A page with nothing behind it is white, not black, once it's a JPEG.
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Drawn as for printing: the screen's way waits on the next frame,
        // which never comes while the app is in the background.
        await page.render({ canvasContext: ctx, viewport: vp, intent: 'print' }).promise;
        photos.push(canvas.toDataURL('image/jpeg', 0.85));
        canvas.width = 0; // iOS has a small budget for canvases
        canvas.height = 0;
        page.cleanup();
      }
    } finally {
      doc.destroy();
    }
    return photos;
  }
};
