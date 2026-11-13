// The archive PDF: each shoot, one after another.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addArchivePdfShoots = async function addArchivePdfShoots(ed, pdf) {
    for (let s_i = 0; s_i < pdf.orderedShoots.length; s_i++) {
      const s = pdf.orderedShoots[s_i];
      if (s_i > 0) { pdf.doc.addPage(); pdf.y = pdf.margin; }

      // Per-shoot header banner — the same navy/yellow band as the
      // single-shoot call sheet, just smaller (14pt), since this is one
      // entry in a running archive rather than a stand-alone document.
      const titleFontSize = 16;
      const titleLineHeight = titleFontSize * 1.15;
      const titleX = pdf.margin + pdf.logoSize + pdf.logoGap;
      pdf.doc.setFont('courier', 'bold');
      pdf.doc.setFontSize(titleFontSize);
      const headerLabel = (s.title || ed.primaryTalentName(s) || 'Shoot').toUpperCase();
      const titleLines = pdf.doc.splitTextToSize(headerLabel, pdf.pageWidth - titleX - pdf.margin);
      const titleBlockHeight = titleLines.length * titleLineHeight;
      const headerHeight = Math.max(46, titleBlockHeight + 18);

      pdf.doc.setFillColor(...pdf.navy);
      pdf.doc.rect(0, 0, pdf.pageWidth, headerHeight, 'F');
      pdf.doc.addImage(pdf.logoDataUrl, 'PNG', pdf.margin, (headerHeight - pdf.logoSize) / 2, pdf.logoSize, pdf.logoSize);
      pdf.doc.setTextColor(...pdf.yellow);
      const titleTopPad = (headerHeight - titleBlockHeight) / 2;
      titleLines.forEach((line, i) => {
        pdf.doc.text(line, titleX, titleTopPad + i * titleLineHeight + titleLineHeight * 0.83);
      });

      pdf.doc.setTextColor(...pdf.navy);
      pdf.doc.setFont('courier', 'normal');
      pdf.doc.setFontSize(10);
      // A postponed/canceled shoot's kept date is the original plan.
      const dateLabel = s.date ? `${ed.isOriginalPlanDate(s) ? 'Originally ' : ''}${ed.prettyDate(s.date)}` : 'Date TBD';
      const subLabel = [dateLabel, ed.CATEGORY_LABELS[s.category] || null, ed.STATUS_LABELS[s.status] || null]
        .filter(Boolean).join('   •   ');
      pdf.doc.text(subLabel, pdf.margin, headerHeight + 16);
      pdf.y = headerHeight + 32;
      pdf.doc.setFontSize(11);

      // ---- Talent ----
      const talentsForPdf = (s.talents || [])
        .map((talent, idx) => ({ talent, label: ed.hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}` }))
        .filter(({ talent }) => ed.hasText(talent.name) || ed.hasText(talent.photo)
          || (talent.socialHandles || []).some(sh => ed.hasText(sh.handle)));
      if (talentsForPdf.length) {
        pdf.sectionHeading('Talent:');
        pdf.doc.setFont('courier', 'normal');
        pdf.doc.setFontSize(11);
        talentsForPdf.forEach(({ talent, label }) => {
          pdf.ensureSpace(14);
          pdf.doc.text(`• ${label}`, pdf.margin, pdf.y);
          pdf.y += 14;
          (talent.socialHandles || []).filter(sh => ed.hasText(sh.handle)).forEach(sh => {
            const entry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
            pdf.ensureSpace(14);
            pdf.doc.text(`   ${entry ? entry[1] : 'Other'}: ${sh.handle}`, pdf.margin, pdf.y);
            pdf.y += 14;
          });
        });
        pdf.y += 6;
      }

      // ---- Logistics ----
      const timeRange = ed.shootTimeRange(s);
      const locationDisplay = ed.formatLocationDisplayNoCountry(s.location);
      // Call times are video-only on the page, but kept on any shoot.
      const crewCall = ed.prettyTime(s.crewCallTime);
      const talentCall = ed.prettyTime(s.talentCallTime);
      // Printed on a "Just me" shoot too, where it's kept but hidden.
      const teamDirections = s.teamDirections;
      const soloNote = s.teamRequired === 'no' ? ' (set to Just me)' : '';
      if (ed.hasText(s.deadline) || timeRange || crewCall || talentCall || locationDisplay || ed.hasText(s.locationDirections) || ed.hasText(s.talentDirections) || ed.hasText(teamDirections)) {
        pdf.sectionHeading('Logistics:');
        pdf.doc.setFontSize(11);
        if (ed.hasText(s.deadline)) pdf.drawLabeledLine('Deadline: ', ed.prettyDate(s.deadline), 14);
        if (timeRange) pdf.drawLabeledLine('Time: ', timeRange, 14);
        if (crewCall) pdf.drawLabeledLine('Crew call: ', crewCall, 14);
        if (talentCall) pdf.drawLabeledLine('Talent call: ', talentCall, 14);
        if (locationDisplay) { pdf.drawLabeledLine('Location: ', locationDisplay, 14); pdf.y += 2; }
        if (ed.hasText(s.locationDirections)) { pdf.drawLabeledLine('Location instructions: ', s.locationDirections, 14); pdf.y += 2; }
        if (ed.hasText(s.talentDirections)) { pdf.drawLabeledLine('Directions for talent: ', s.talentDirections, 14); pdf.y += 2; }
        if (ed.hasText(teamDirections)) { pdf.drawLabeledLine(`Directions for team${soloNote}: `, teamDirections, 14); pdf.y += 2; }
        pdf.y += 6;
      }

      // ---- Deliverables (video fields, kept on any shoot) ----
      const deliverableFields = ed.videoDeliverableFields(s, true);
      if (deliverableFields.length) {
        pdf.sectionHeading('Deliverables:');
        pdf.doc.setFontSize(11);
        deliverableFields.forEach(([label, value]) => { pdf.drawLabeledLine(`${label}: `, value, 14); pdf.y += 4; });
        pdf.y += 6;
      }

      // ---- Direction ----
      const directionFields = [
        ['Concept: ', s.premise, 'premise'],
        ['Elevator pitch: ', s.elevatorPitch, 'elevatorPitch'],
        ['Character/Personality: ', s.character, 'character'],
        ['World-building notes: ', s.worldNotes, 'worldNotes'],
        ['Shoot goals: ', s.shootGoals, 'shootGoals'],
      ].filter(([, value]) => ed.hasText(value));
      if (directionFields.length) {
        pdf.sectionHeading('Direction:');
        pdf.doc.setFontSize(11);
        directionFields.forEach(([label, value]) => { pdf.drawLabeledLine(label, value.trim(), 14); pdf.y += 4; });
        pdf.y += 6;
      }

      // ---- Visuals: framework tags (Visual Language, etc.) + lighting setups ----
      const tagsByFramework = new Map();
      (s.frameworkTags || []).forEach(t => {
        const fw = ed.state.frameworks.find(f => f.id === t.frameworkId);
        const name = fw ? fw.name : 'Visual language';
        if (!tagsByFramework.has(name)) tagsByFramework.set(name, []);
        tagsByFramework.get(name).push(t.tag);
      });
      const lightingSetups = (s.lightingSetups || [])
        .filter(item => ed.hasText(item.name) || ed.hasText(item.characteristics) || ed.hasText(item.description));
      if (tagsByFramework.size || lightingSetups.length) {
        pdf.sectionHeading('Visuals:');
        pdf.doc.setFontSize(11);
        tagsByFramework.forEach((tags, name) => { pdf.drawLabeledLine(`${name}: `, tags.join(', '), 14); pdf.y += 2; });
        lightingSetups.forEach((item, idx) => {
          pdf.ensureSpace(14);
          pdf.doc.setFont('courier', 'bold');
          pdf.doc.text(`• ${ed.hasText(item.name) ? item.name.trim() : `Lighting setup ${idx + 1}`}`, pdf.margin, pdf.y);
          pdf.y += 14;
          pdf.doc.setFont('courier', 'normal');
          if (ed.hasText(item.characteristics)) pdf.drawLabeledLine('   Characteristics: ', item.characteristics, 14);
          if (ed.hasText(item.description)) pdf.drawLabeledLine('   Description: ', item.description, 14);
        });
        pdf.y += 6;
      }

      // ---- Shot list, and the Shooting notes under it on the page ----
      const shots = (s.shotList || []).filter(item => ed.hasText(item.text));
      if (shots.length || ed.hasText(s.shootingNotes)) {
        pdf.sectionHeading('Shot list:');
        pdf.doc.setFont('courier', 'normal');
        pdf.doc.setFontSize(11);
        const maxWidth = pdf.pageWidth - pdf.margin * 2 - 16;
        shots.forEach(item => {
          const lines = pdf.doc.splitTextToSize(item.text.trim(), maxWidth);
          pdf.ensureSpace(14 * lines.length);
          lines.forEach((line, i) => {
            pdf.doc.text(i === 0 ? `${item.checked ? '[x] ' : '[ ] '}${line}` : `      ${line}`, pdf.margin, pdf.y);
            pdf.y += 14;
          });
        });
        if (ed.hasText(s.shootingNotes)) {
          if (shots.length) pdf.y += 4;
          pdf.drawLabeledLine('Shooting notes: ', s.shootingNotes.trim(), 14);
        }
        pdf.y += 6;
      }

      // ---- Team ----
      // Printed on a "Just me" shoot too, where the list is kept but hidden.
      const team = s.teamMembers || [];
      if (team.length) {
        pdf.sectionHeading(`Team${soloNote}:`);
        pdf.doc.setFont('courier', 'normal');
        pdf.doc.setFontSize(11);
        team.forEach(tm => {
          pdf.ensureSpace(14);
          const roleEntry = ed.TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role);
          pdf.doc.text(`• ${tm.name ? tm.name : 'Unnamed'}, ${roleEntry ? roleEntry[1] : 'Other'}`, pdf.margin, pdf.y);
          pdf.y += 14;
          if (ed.hasText(tm.socialHandle)) {
            const platformEntry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform);
            pdf.ensureSpace(14);
            pdf.doc.text(`   ${platformEntry ? platformEntry[1] : 'Other'}: ${tm.socialHandle}`, pdf.margin, pdf.y);
            pdf.y += 14;
          }
        });
        pdf.y += 6;
      }

      // ---- References ----
      const refs = (s.references || []).map(r => r.trim()).filter(Boolean);
      if (refs.length) {
        pdf.sectionHeading('References:');
        pdf.doc.setFont('courier', 'normal');
        pdf.doc.setFontSize(11);
        refs.forEach(r => {
          pdf.ensureSpace(14);
          pdf.doc.text(`• ${r}`, pdf.margin, pdf.y, { maxWidth: pdf.pageWidth - pdf.margin * 2 });
          pdf.y += 14;
        });
        pdf.y += 6;
      }

      // ---- Post-shoot reflection ----
      // Whatever the status: the page only shows it from Captured on, but a
      // shoot stepped back a status (or postponed, or canceled) keeps its
      // answers, hidden, and they're printed here rather than lost.
      const reflectionFields = [
        ['What went right: ', s.whatWentRight],
        ["What could've gone better: ", s.couldBeBetter],
        ['Lessons for next time: ', s.lessonsLearned],
      ].filter(([, value]) => ed.hasText(value));
      if (reflectionFields.length) {
        pdf.sectionHeading('Post-shoot reflection:');
        pdf.doc.setFontSize(11);
        reflectionFields.forEach(([label, value]) => { pdf.drawLabeledLine(label, value.trim(), 14); pdf.y += 4; });
        pdf.y += 6;
      }

      // ---- Photos: cover, talent, mood board/storyboard, final/delivered ----
      // Final images stay ungated even for video: a shoot switched to video
      // can still hold images from before, and this export may be followed
      // by deleting the shoot's photos — skipping them here would lose them.
      const images = await ed.gatherArchiveImages(s);
      if (images.cover) await pdf.drawImageGrid('Cover photo:', [{ src: images.cover }]);
      if (images.talentPhotos.length) await pdf.drawImageGrid('Talent photos:', images.talentPhotos);
      if (images.moodboard.length) await pdf.drawImageGrid(`${ed.moodboardTerm(s.category)}:`, images.moodboard);
      if (images.finalImages.length) await pdf.drawImageGrid('Final images:', images.finalImages);
    }
};
