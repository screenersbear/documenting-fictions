// Export previous shoots: the preview, and sharing it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfArchiveExport = function addPdfArchiveExport(ed) {
  Object.assign(ed, { openExportArchivePreview });
  async function openExportArchivePreview(shoots) {
    // Web Share, tried first, is the only thing that reliably hands off a
    // correctly-named file, and skips both the new tab and this app's own
    // preview modal entirely when it's available — so closing out of the OS's
    // own share sheet lands straight back on whatever was showing before,
    // nothing else to close. Probed with a throwaway file since the real PDF
    // doesn't exist yet and this has to be decided before the popup below,
    // which needs the same still-fresh user gesture either way.
    const canWebShare = !!(navigator.canShare && navigator.share
      && navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] }));
    const previewWindow = canWebShare ? null : window.open('', '_blank');
    // Busy through the share sheet and on until the delete offer (or the
    // preview popup) is up, which then holds off an update itself.
    ed.busyTasks++;
    try {
      const doc = await ed.buildArchivePdf(shoots);
      ed.pdfPreviewBlob = doc.output('blob');
      const label = ed.archiveExportLabel(shoots);
      const safeName = label.replace(/[^\w\- .]+/g, '').trim() || 'shoot archive';
      ed.pdfPreviewFilename = `${safeName}.pdf`;
      if (canWebShare) {
        const file = new File([ed.pdfPreviewBlob], ed.pdfPreviewFilename, { type: 'application/pdf' });
        try {
          await navigator.share({ files: [file] });
        } catch (shareErr) {
          // A big archive can take longer to build than iOS lets a share
          // follow the tap that started it (a few seconds), and the share is
          // then refused (NotAllowedError) — the PDF itself is fine. So it
          // opens in the app's own preview instead, whose Share button is a
          // fresh tap; closing that asks "Did it save?" before anything's
          // offered for deletion, the same as when there's no Web Share.
          if (!shareErr || shareErr.name !== 'NotAllowedError') throw shareErr;
          ed.showPdfPreview(ed.pdfPreviewBlob);
          ed.exportArchiveAwaitingSave = shoots;
          return;
        }
        // The share sheet only resolves once the PDF went somewhere (Save to
        // Files, Mail…), so the clean-up offer can follow straight away.
        ed.openExportDeleteAsk(shoots);
      } else {
        // Shown only when Web Share isn't available — separate object URLs
        // so closing the modal's revoke doesn't pull the PDF out from
        // under a still-open tab.
        if (previewWindow) previewWindow.location.href = URL.createObjectURL(ed.pdfPreviewBlob);
        ed.showPdfPreview(ed.pdfPreviewBlob);
        if (previewWindow) ed.showToast('Opened for viewing. Use Share below to send it with the right filename');
        // Whether it then gets saved from the preview or the new tab can't
        // be seen from here, so nothing is offered for deletion until the
        // preview is closed and "Did it save?" is answered (closePdfPreview).
        ed.exportArchiveAwaitingSave = shoots;
      }
    } catch (err) {
      if (previewWindow) previewWindow.close();
      // Share sheet cancelled: nothing was saved, so no delete offer.
      if (err && err.name === 'AbortError') return;
      console.error('Failed to build archive PDF', err);
      ed.showToast('Could not create PDF archive');
    } finally {
      ed.busyTasks--;
    }
  }
};
