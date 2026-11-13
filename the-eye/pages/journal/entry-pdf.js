// Sharing one Journal entry as a PDF.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalEntryPdf = function addJournalEntryPdf(ed) {
  // ---------- Journal entry PDF (share a single reflection) ----------
  // Same header/body drawing conventions as buildShootPdf (title banner,
  // ensureSpace, courier body text) — no sections to choose here since a
  // journal entry is just title/date/tags/body/photos, one flat page.
  async function buildJournalEntryPdf(entry) {
    const { jsPDF } = await ed.loadLib('lib/jspdf.umd.min.js', 'jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const navy = [49, 61, 69];
    const yellow = [255, 209, 3];
    const logoSize = 36;
    const logoGap = 14;
    const titleX = margin + logoSize + logoGap;
    const titleFontSize = 26;
    const titleLineHeight = titleFontSize * 1.15;

    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleLines = doc.splitTextToSize((entry.title || 'Untitled entry').toUpperCase(), pageWidth - titleX - margin);
    const titleBlockHeight = titleLines.length * titleLineHeight;
    const headerHeight = Math.max(64, titleBlockHeight + 28);

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    const logoDataUrl = await ed.loadLogoDataUrl();
    doc.addImage(logoDataUrl, 'PNG', margin, (headerHeight - logoSize) / 2, logoSize, logoSize);

    doc.setTextColor(...yellow);
    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleTopPad = (headerHeight - titleBlockHeight) / 2;
    titleLines.forEach((line, i) => {
      doc.text(line, titleX, titleTopPad + i * titleLineHeight + titleLineHeight * 0.83);
    });

    doc.setTextColor(...navy);
    let y = headerHeight + 34;

    function ensureSpace(needed) {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text(ed.prettyDate(entry.createdAt), margin, y);
    y += 24;

    if ((entry.tags || []).length) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      const tagsLine = entry.tags.map(t => `#${t}`).join('   ');
      doc.splitTextToSize(tagsLine, pageWidth - margin * 2).forEach(line => {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 16;
      });
      y += 8;
    }

    if (ed.hasText(entry.body)) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      entry.body.split('\n').forEach(paragraph => {
        const wrapped = doc.splitTextToSize(paragraph, pageWidth - margin * 2);
        (wrapped.length ? wrapped : ['']).forEach(line => {
          ensureSpace(17);
          doc.text(line, margin, y);
          y += 17;
        });
      });
      y += 10;
    }

    const images = await ed.idbGetImages(ed.journalEntryImagesKey(entry));
    if (images.length) {
      const maxImgW = pageWidth - margin * 2;
      const maxImgH = 320;
      for (const img of images) {
        const dims = await ed.getImageDims(img.src);
        const fitted = ed.fitContain(dims.w, dims.h, maxImgW, maxImgH);
        ensureSpace(fitted.h + 20);
        doc.addImage(img.src, 'JPEG', margin, y, fitted.w, fitted.h);
        y += fitted.h + 10;
        if (ed.hasText(img.caption)) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(10);
          doc.splitTextToSize(img.caption, maxImgW).forEach(line => {
            ensureSpace(14);
            doc.text(line, margin, y);
            y += 14;
          });
          y += 6;
        }
      }
    }

    return doc;
  }

  async function openJournalEntryPdfPreview(id) {
    const entry = ed.state.journalEntries.find(e => e.id === id);
    if (!entry) return;
    // Web Share, tried first, is the only thing that reliably hands off a
    // correctly-named file (Mail/Messages/etc respect the name on a File
    // shared this way, unlike a blob: URL opened in a new tab), and skips both
    // the new tab and this app's own preview modal when it's available.
    // Probed with a throwaway file since the real PDF doesn't exist yet and
    // this has to be decided before the popup below, which needs the same
    // still-fresh user gesture either way.
    const canWebShare = !!(navigator.canShare && navigator.share
      && navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] }));
    const previewWindow = canWebShare ? null : window.open('', '_blank');
    // Busy through the share sheet, or until the preview popup is up.
    ed.busyTasks++;
    try {
      const doc = await buildJournalEntryPdf(entry);
      ed.pdfPreviewBlob = doc.output('blob');
      const dateLabel = ed.prettyDate(entry.createdAt);
      const titleOrUntitled = entry.title || 'Untitled entry';
      const entryName = dateLabel ? `${dateLabel} · ${titleOrUntitled}` : titleOrUntitled;
      const safeName = entryName.replace(/[—·]/g, '-').replace(/[^\w\- .]+/g, '').trim() || 'journal entry';
      ed.pdfPreviewFilename = `${safeName}.pdf`;
      if (canWebShare) {
        const file = new File([ed.pdfPreviewBlob], ed.pdfPreviewFilename, { type: 'application/pdf' });
        await navigator.share({ files: [file] });
        return;
      }
      if (previewWindow) previewWindow.location.href = URL.createObjectURL(ed.pdfPreviewBlob);
      ed.showPdfPreview(ed.pdfPreviewBlob);
      if (previewWindow) ed.showToast('Opened for viewing. Use Share below to send it with the right filename');
    } catch (err) {
      if (previewWindow) previewWindow.close();
      if (err && err.name === 'AbortError') return;
      console.error('Failed to build journal entry PDF', err);
      ed.showToast('Could not create PDF');
    } finally {
      ed.busyTasks--;
    }
  }

  document.getElementById('shareJournalOptionBtn').addEventListener('click', () => {
    const id = ed.optionsJournalEntryId;
    ed.closeJournalOptions();
    if (id) openJournalEntryPdfPreview(id);
  });
};
