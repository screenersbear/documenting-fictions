// A shoot's PDF: logistics, deliverables, direction and references.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfDetails = function addPdfDetails(ed, pdf) {
    const timeRange = ed.shootTimeRange(pdf.s);
    const locationDisplay = ed.formatLocationDisplayNoCountry(pdf.s.location);
    // Video call sheets also carry separate crew and talent call times.
    const crewCall = pdf.isVideo ? ed.prettyTime(pdf.s.crewCallTime) : '';
    const talentCall = pdf.isVideo ? ed.prettyTime(pdf.s.talentCallTime) : '';
    // Directions for team only on a shoot with a team (a "Just me" shoot
    // keeps it, hidden — see directionFieldApplies).
    const teamDirections = ed.directionFieldApplies(pdf.s, 'teamDirections') ? pdf.s.teamDirections : '';
    if ((pdf.s.date || timeRange || crewCall || talentCall || locationDisplay || ed.hasText(pdf.s.locationDirections) || ed.hasText(pdf.s.talentDirections) || ed.hasText(teamDirections)) && pdf.sections.logistics) {
      pdf.sectionHeading('Logistics:');
      pdf.doc.setFontSize(11);
      // A postponed/canceled shoot's kept date is the original plan.
      if (pdf.s.date) pdf.drawLabeledLine(ed.isOriginalPlanDate(pdf.s) ? 'Originally: ' : 'Date: ', ed.prettyDate(pdf.s.date), 16);
      if (timeRange) pdf.drawLabeledLine('Time: ', timeRange, 16);
      if (crewCall) pdf.drawLabeledLine('Crew call: ', crewCall, 16);
      if (talentCall) pdf.drawLabeledLine('Talent call: ', talentCall, 16);
      if (locationDisplay) { pdf.drawLabeledLine('Location: ', locationDisplay, 14); pdf.y += 2; }
      if (ed.hasText(pdf.s.locationDirections)) { pdf.drawLabeledLine('Location instructions: ', pdf.s.locationDirections, 14); pdf.y += 2; }
      if (ed.hasText(pdf.s.talentDirections)) { pdf.drawLabeledLine('Directions for talent: ', pdf.s.talentDirections, 14); pdf.y += 2; }
      if (ed.hasText(teamDirections)) { pdf.drawLabeledLine('Directions for team: ', teamDirections, 14); pdf.y += 2; }
      pdf.y += 8;
    }

    // Video only: what's being made and where it's going. On by default in
    // the sections popup (unlike Direction): crew frame a 9:16 Reel
    // differently from a 16:9 film, so the call sheet is where they need it.
    const deliverableFields = ed.videoDeliverableFields(pdf.s);
    if (deliverableFields.length && pdf.sections.deliverables) {
      pdf.sectionHeading('Deliverables:');
      pdf.doc.setFontSize(11);
      deliverableFields.forEach(([label, value]) => {
        pdf.drawLabeledLine(`${label}: `, value, 14);
        pdf.y += 6;
      });
      pdf.y += 8;
    }

    // Direction is opt-in (unchecked by default in the sections popup) — it's
    // internal creative planning, so it only goes out when deliberately chosen.
    // Only fields this kind of shoot has (directionFieldApplies), so an
    // event never prints a concept or pitch.
    const directionFields = [
      ['Concept: ', pdf.s.premise, 'premise'],
      ['Elevator pitch: ', pdf.s.elevatorPitch, 'elevatorPitch'],
      ['Character/Personality: ', pdf.s.character, 'character'],
      ['World-building notes: ', pdf.s.worldNotes, 'worldNotes'],
      ['Shoot goals: ', pdf.s.shootGoals, 'shootGoals'],
    ].filter(([, value, key]) => ed.hasText(value) && ed.directionFieldApplies(pdf.s, key));
    if (directionFields.length && pdf.sections.direction) {
      pdf.sectionHeading('Direction:');
      pdf.doc.setFontSize(11);
      directionFields.forEach(([label, value]) => {
        pdf.drawLabeledLine(label, value.trim(), 14);
        pdf.y += 6;
      });
      pdf.y += 8;
    }

    const refs = (pdf.s.references || []).map(r => r.trim()).filter(Boolean);
    if (refs.length && pdf.sections.references) {
      pdf.sectionHeading('References:');
      pdf.doc.setFont('courier', 'normal');
      pdf.doc.setFontSize(11);
      refs.forEach(r => {
        pdf.ensureSpace(15);
        pdf.doc.text(`• ${r}`, pdf.margin, pdf.y, { maxWidth: pdf.pageWidth - pdf.margin * 2 });
        pdf.y += 15;
      });
      pdf.y += 10;
    }

    const team = pdf.s.teamRequired === 'yes' ? (pdf.s.teamMembers || []) : []; pdf.team = team;
    const photographer = ed.normalizePhotographer(ed.state.photographer); pdf.photographer = photographer;
    const showPhotographer = ed.photographerHasInfo(photographer); pdf.showPhotographer = showPhotographer;
};
