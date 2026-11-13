// Sharing a shoot as a PDF: building it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfShootPdf = function addPdfShootPdf(ed) {
  Object.assign(ed, { buildShootPdf });
  async function buildShootPdf(s, chosenSections) {
  const pdf = { s }; // what the parts of buildShootPdf share
  Object.assign(pdf, { ensureSpace, drawLabeledLine, sectionHeading });
    const sections = chosenSections || { talent: true, logistics: true, deliverables: true, direction: false, references: false, team: true, moodboard: true }; pdf.sections = sections;
    const isVideo = ed.isVideoShoot(s); pdf.isVideo = isVideo;
    const { jsPDF } = await ed.loadLib('lib/jspdf.umd.min.js', 'jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'letter' }); pdf.doc = doc;
    const pageWidth = doc.internal.pageSize.getWidth(); pdf.pageWidth = pageWidth;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44; pdf.margin = margin;
    const navy = [49, 61, 69]; pdf.navy = navy;
    const yellow = [255, 209, 3];
    const logoSize = 36;
    const logoGap = 14;
    const titleX = margin + logoSize + logoGap;
    const titleFontSize = 26;
    const titleLineHeight = titleFontSize * 1.15;

    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleLines = doc.splitTextToSize((s.title || ed.primaryTalentName(s) || 'Shoot').toUpperCase(), pageWidth - titleX - margin);
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
    pdf.y = headerHeight + 34;

    // Every section below calls this before drawing. Without it a block that
    // starts near the bottom just draws past the page edge and disappears
    // instead of continuing overleaf.
    function ensureSpace(needed) {
      if (pdf.y + needed > pageHeight - margin) {
        doc.addPage();
        pdf.y = margin;
      }
    }

    // Draws a "Label: value" line, wrapping the value and letting it flow across
    // a page break rather than treating the whole block as one unit. Reserving
    // the full wrapped height up front meant a long value that didn't quite fit
    // jumped to the next page wholesale — leaving most of a page blank when
    // there was room for all but the last line or two. Only the label and its
    // first line are kept together; everything after breaks wherever it lands.
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

    // firstChunk is how much of the section's own content must fit alongside the
    // heading, so a heading never lands as the last thing on a page with its
    // content orphaned overleaf. Grid sections measure their first row and pass
    // that in; text sections take the default couple of lines.
    function sectionHeading(text, firstChunk = 34) {
      ensureSpace(24 + firstChunk);
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text(text, margin, pdf.y);
      pdf.y += 24;
    }

    // Two columns, shared by the talent grid and the mood board grid.
    const colGap = 14; pdf.colGap = colGap;
    const colW = (pageWidth - margin * 2 - colGap) / 2; pdf.colW = colW;
  await window.EyeParts.addPdfTalent(ed, pdf);
  window.EyeParts.addPdfDetails(ed, pdf);
  await window.EyeParts.addPdfTeam(ed, pdf);

    return doc;
  }
};
