// A shoot's PDF: the team, and the pictures.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfTeam = async function addPdfTeam(ed, pdf) {
    // The photographer leads the crew list — whoever gets this call sheet should
    // see who's shooting it and how to reach them before the rest of the team.
    // The section shows even with no team members, as long as there's an entry.
    if ((pdf.team.length || pdf.showPhotographer) && pdf.sections.team) {
      pdf.sectionHeading('Team:');
      pdf.doc.setFont('courier', 'normal');
      pdf.doc.setFontSize(11);
      if (pdf.showPhotographer) {
        const who = ed.hasText(pdf.photographer.name) ? pdf.photographer.name : (pdf.photographer.businessName || 'Photographer');
        const business = ed.hasText(pdf.photographer.name) && ed.hasText(pdf.photographer.businessName) ? ` (${pdf.photographer.businessName})` : '';
        pdf.ensureSpace(15);
        pdf.doc.text(`• ${who}${business}, Photographer`, pdf.margin, pdf.y);
        pdf.y += 15;
        if (ed.hasText(pdf.photographer.socialHandle)) {
          const entry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === pdf.photographer.socialPlatform);
          pdf.ensureSpace(15);
          pdf.doc.text(`   ${entry ? entry[1] : 'Other'}: ${pdf.photographer.socialHandle}`, pdf.margin, pdf.y);
          pdf.y += 15;
        }
        if (ed.hasText(pdf.photographer.phone)) {
          pdf.ensureSpace(15);
          pdf.doc.text(`   Phone: ${pdf.photographer.phone}`, pdf.margin, pdf.y);
          pdf.y += 15;
        }
      }
      pdf.team.forEach(tm => {
        pdf.ensureSpace(ed.hasText(tm.socialHandle) ? 30 : 15);
        const roleEntry = ed.TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role);
        const roleLabel = roleEntry ? roleEntry[1] : 'Other';
        pdf.doc.text(`• ${tm.name ? tm.name : 'Unnamed'}, ${roleLabel}`, pdf.margin, pdf.y);
        pdf.y += 15;
        if (ed.hasText(tm.socialHandle)) {
          const platformEntry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform);
          const platformLabel = platformEntry ? platformEntry[1] : 'Other';
          pdf.doc.text(`   ${platformLabel}: ${tm.socialHandle}`, pdf.margin, pdf.y);
          pdf.y += 15;
        }
      });
      pdf.y += 10;
    }

    // General direction notes are deliberately left off the shared PDF —
    // they're internal visual-direction planning, not something meant to
    // go out to a client or talent.

    const images = pdf.sections.moodboard ? await ed.idbGetImages(pdf.s.id) : [];
    if (images.length) {
      // Paginated by the space actually left on the page, one row at a time.
      // The previous version batched by a fixed count (2 on the first page, 4
      // after) and forced a new page once the batch was placed — so a page
      // would take its two images and then break, leaving the whole lower half
      // blank while the rest of the set carried on overleaf.
      const cellH = pdf.colW * 1.3;

      // Measured into rows first, so the heading can reserve its first row and
      // the loop can page-break on real heights. Rows are as tall as their
      // tallest image (capped), so a row of wide shots stays tight rather than
      // being letterboxed inside a full-height cell.
      const rows = [];
      for (let idx = 0; idx < images.length; idx += 2) {
        const items = [];
        for (let c = 0; c < 2 && idx + c < images.length; c++) {
          const img = images[idx + c];
          const dims = await ed.getImageDims(img.src);
          items.push({ src: img.src, ...ed.fitContain(dims.w, dims.h, pdf.colW, cellH) });
        }
        rows.push({ items, height: Math.max(...items.map(it => it.h)) });
      }

      pdf.sectionHeading(`${ed.moodboardTerm(pdf.s.category)}:`, rows[0].height);

      rows.forEach(row => {
        pdf.ensureSpace(row.height);
        row.items.forEach((it, c) => {
          const x = pdf.margin + c * (pdf.colW + pdf.colGap);
          pdf.doc.addImage(it.src, 'JPEG', x + (pdf.colW - it.w) / 2, pdf.y, it.w, it.h);
        });
        pdf.y += row.height + pdf.colGap;
      });
    }
};
