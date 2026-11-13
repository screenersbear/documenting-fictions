// Export previous shoots: building the PDF.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfArchivePdf = function addPdfArchivePdf(ed) {
  Object.assign(ed, { buildArchivePdf });
  // Unlike the single-shoot PDF and the screens, this prints everything a
  // shoot keeps, hidden or not — its export is followed by the offer to
  // delete the shoots, so it may become the only copy. That means the team
  // and Directions for team on a "Just me" shoot (labelled as such), the
  // reflection whatever the status, Direction and video fields whatever the
  // category, and the Shooting notes and deadline (no other PDF has them).
  async function buildArchivePdf(shoots) {
  const pdf = {  }; // what the parts of buildArchivePdf share
  Object.assign(pdf, { ensureSpace, drawLabeledLine, sectionHeading, drawImageGrid });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' }); pdf.doc = doc;
    const pageWidth = doc.internal.pageSize.getWidth(); pdf.pageWidth = pageWidth;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44; pdf.margin = margin;
    const navy = [49, 61, 69]; pdf.navy = navy;
    const yellow = [255, 209, 3]; pdf.yellow = yellow;
    const logoSize = 30; pdf.logoSize = logoSize;
    const logoGap = 12; pdf.logoGap = logoGap;
    const colGap = 14;
    const colW = (pageWidth - margin * 2 - colGap) / 2;
    const logoDataUrl = await ed.loadLogoDataUrl(); pdf.logoDataUrl = logoDataUrl;
    pdf.y = margin;

    function ensureSpace(needed) {
      if (pdf.y + needed > pageHeight - margin) {
        doc.addPage();
        pdf.y = margin;
      }
    }

    function drawLabeledLine(label, value, lineHeight) {
      const maxWidth = pageWidth - margin * 2;
      doc.setFont('courier', 'bold');
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('courier', 'normal');
      const lines = doc.splitTextToSize(String(value), Math.max(10, maxWidth - labelWidth));
      if (!lines.length) return;
      ensureSpace(lineHeight * 2);
      doc.setFont('courier', 'bold');
      doc.text(label, margin, pdf.y);
      doc.setFont('courier', 'normal');
      doc.text(lines[0], margin + labelWidth, pdf.y);
      pdf.y += lineHeight;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(lineHeight);
        doc.text(lines[i], margin, pdf.y);
        pdf.y += lineHeight;
      }
    }

    function sectionHeading(text, firstChunk = 30) {
      ensureSpace(22 + firstChunk);
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.text(text, margin, pdf.y);
      pdf.y += 19;
    }

    async function drawImageGrid(label, images) {
      if (!images.length) return;
      const cellH = colW * 1.3;
      const rows = [];
      for (let idx = 0; idx < images.length; idx += 2) {
        const items = [];
        for (let c = 0; c < 2 && idx + c < images.length; c++) {
          const img = images[idx + c];
          const dims = await ed.getImageDims(img.src);
          items.push({ src: img.src, ...ed.fitContain(dims.w, dims.h, colW, cellH) });
        }
        rows.push({ items, height: Math.max(...items.map(it => it.h)) });
      }
      sectionHeading(label, rows[0].height);
      rows.forEach(row => {
        ensureSpace(row.height);
        row.items.forEach((it, c) => {
          const x = margin + c * (colW + colGap);
          doc.addImage(it.src, 'JPEG', x + (colW - it.w) / 2, pdf.y, it.w, it.h);
        });
        pdf.y += row.height + colGap;
      });
      pdf.y += 4;
    }

    const orderedShoots = [...shoots].sort(ed.compareShootsForArchive); pdf.orderedShoots = orderedShoots;
  await window.EyeParts.addArchivePdfShoots(ed, pdf);

    return doc;
  }
};
