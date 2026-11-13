// The PDF preview, before it's shared.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfPreview = function addPdfPreview(ed) {
  Object.assign(ed, { hashString, openPdfPreview });
  // ---------- PDF preview (shows the built PDF before offering to share it) ----------
  // Every navigator.share in this app sends the file and nothing else: an
  // emailed call sheet went out with no attachment while a title was being
  // shared alongside it (the user's report, 2026-11-10), and iOS can hand a
  // title to the share sheet as a separate text item. Don't add title or
  // text back to a file share.
  ed.pdfPreviewBlob = null;
  ed.pdfPreviewFilename = '';

  // The last call sheet built, kept so reopening it with everything unchanged
  // skips rebuilding (the slow part: laying out the pages and embedding every
  // photo). The key covers everything that goes into the PDF — the chosen
  // sections, the shoot's own fields (talent photos included), the photographer
  // info, and the mood board images — so changing ANY of them, e.g. switching
  // the mood board off, always builds a fresh one rather than showing the
  // previous version. Only the most recent build is kept.
  let callSheetCache = null;

  function hashString(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  async function callSheetCacheKey(s, sections) {
    const parts = [
      s.id,
      JSON.stringify(sections),
      JSON.stringify(s),
      JSON.stringify(ed.normalizePhotographer(ed.state.photographer)),
    ];
    // Mood board photos live in IndexedDB rather than on the shoot, so they
    // need their own read — skipped entirely when the section is off, since
    // they don't affect the PDF then.
    if (sections.moodboard) {
      const imgs = await ed.idbGetImages(s.id);
      parts.push(imgs.map(img => `${(img.src || '').length}:${hashString(img.src || '')}:${img.caption || ''}`).join('|'));
    }
    return parts.map(part => `${part.length}:${hashString(part)}`).join('/');
  }

  // Always lands on this app's own preview (with Close and Share) rather than
  // handing straight off to the phone's share sheet — you look it over first,
  // then Share sends it on with the right filename.
  async function openPdfPreview(id, chosenSections) {
    const s = ed.state.shoots.find(x => x.id === id);
    if (!s) return;
    // Busy until the preview popup is up (it then holds off an update itself).
    ed.busyTasks++;
    try {
      const key = await callSheetCacheKey(s, chosenSections);
      if (!callSheetCache || callSheetCache.key !== key) {
        ed.showToast('Building call sheet…');
        const doc = await ed.buildShootPdf(s, chosenSections);
        const dateLabel = ed.formatDateDots(s.date);
        const nameOrTalent = s.title || ed.primaryTalentName(s) || 'Shoot';
        const title = dateLabel ? `${dateLabel} · ${nameOrTalent} call sheet` : `${nameOrTalent} call sheet`;
        // Filename allows dots (the date format needs them) but swaps the em
        // dash for a plain hyphen rather than dropping it, since the sanitizer
        // strips anything that isn't word/hyphen/space/dot.
        const safeName = title.replace(/—/g, '-').replace(/[^\w\- .]+/g, '').trim() || 'call sheet';
        callSheetCache = { key, blob: doc.output('blob'), filename: `${safeName}.pdf` };
      }
      ed.pdfPreviewBlob = callSheetCache.blob;
      ed.pdfPreviewFilename = callSheetCache.filename;
      ed.showPdfPreview(ed.pdfPreviewBlob);
    } catch (err) {
      console.error('Failed to build shoot PDF', err);
      ed.showToast('Could not create PDF');
    } finally {
      ed.busyTasks--;
    }
  }
};
