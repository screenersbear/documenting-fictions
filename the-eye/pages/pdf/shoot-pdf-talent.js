// A shoot's PDF: the talent.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfTalent = async function addPdfTalent(ed, pdf) {
    // A talent counts as worth printing if they have a name OR a photo — an
    // unnamed talent with a portrait used to drop out of the PDF entirely. The
    // label then falls back to their position, matching the "Talent N" the
    // editor's own card bar shows. Numbering comes from the index in the full
    // list so it lines up with the app even when earlier talents are skipped.
    const talentsForPdf = (pdf.s.talents || [])
      .map((talent, idx) => ({ talent, label: ed.hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}` }))
      .filter(({ talent }) => ed.hasText(talent.name) || ed.hasText(talent.photo));
    if (talentsForPdf.length && pdf.sections.talent) {
      // One "Talent:" heading for the section, then each person laid out two per
      // row — name, handles, photo — so a three- or four-talent shoot doesn't
      // run down the page repeating the word "Talent".
      const NAME_SIZE = 13;
      const NAME_LINE = NAME_SIZE + 4;
      const HANDLE_SIZE = 10;
      const HANDLE_LINE = HANDLE_SIZE + 4;
      const PHOTO_MAX_H = 150;
      const PHOTO_GAP = 6;

      // Measured up front: a row's height is its taller column, and that has to
      // be known before anything is drawn so the row can page-break as a unit.
      const blocks = [];
      for (const { talent, label } of talentsForPdf) {
        pdf.doc.setFont('courier', 'bold');
        pdf.doc.setFontSize(NAME_SIZE);
        const nameLines = pdf.doc.splitTextToSize(label, pdf.colW);
        const handleTexts = (talent.socialHandles || [])
          .filter(sh => ed.hasText(sh.handle))
          .map(sh => {
            const entry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
            return `${entry ? entry[1] : 'Other'}: ${sh.handle}`;
          });
        pdf.doc.setFont('courier', 'normal');
        pdf.doc.setFontSize(HANDLE_SIZE);
        const handleLines = handleTexts.reduce((acc, t) => acc.concat(pdf.doc.splitTextToSize(t, pdf.colW)), []);
        let photo = null;
        if (ed.hasText(talent.photo)) {
          const dims = await ed.getImageDims(talent.photo);
          photo = ed.fitContain(dims.w, dims.h, pdf.colW, PHOTO_MAX_H);
        }
        const height = nameLines.length * NAME_LINE
          + handleLines.length * HANDLE_LINE
          + (photo ? photo.h + PHOTO_GAP : 0);
        blocks.push({ nameLines, handleLines, photo, src: talent.photo, height });
      }

      pdf.sectionHeading('Talent:', Math.max(...blocks.slice(0, 2).map(b => b.height)));

      for (let i = 0; i < blocks.length; i += 2) {
        const row = blocks.slice(i, i + 2);
        const rowH = Math.max(...row.map(b => b.height));
        pdf.ensureSpace(rowH);
        row.forEach((b, c) => {
          const x = pdf.margin + c * (pdf.colW + pdf.colGap);
          let by = pdf.y;
          pdf.doc.setTextColor(...pdf.navy);
          pdf.doc.setFont('courier', 'bold');
          pdf.doc.setFontSize(NAME_SIZE);
          b.nameLines.forEach(line => { by += NAME_SIZE; pdf.doc.text(line, x, by); by += 4; });
          pdf.doc.setFont('courier', 'normal');
          pdf.doc.setFontSize(HANDLE_SIZE);
          b.handleLines.forEach(line => { by += HANDLE_SIZE; pdf.doc.text(line, x, by); by += 4; });
          if (b.photo) {
            by += PHOTO_GAP;
            pdf.doc.addImage(b.src, 'JPEG', x, by, b.photo.w, b.photo.h);
          }
        });
        pdf.y += rowH + 16;
      }
      pdf.y += 4;
    }
};
