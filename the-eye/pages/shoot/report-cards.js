// A delivered or archived shoot's front page reads as its report (it was
// Archive mode): the reflection in full, the final images (a video's
// deliverables instead), what happened on set, the idea, and the shooting
// notes. Each part opens on its own page to change it, like the rest.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootReportCards = function addShootReportCards(ed) {
  Object.assign(ed, { drawReportCards });
  const CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const esc = v => ed.escapeHtml(v);
  const has = v => ed.hasText(v);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  let finals = [];

  // Label-over-words pairs in one card, opening the part they come from.
  function fieldsCard(page, fields) {
    const rows = fields.map(([label, value]) => `<span class="report-field"><span class="report-label">${esc(label)}</span>
      <span class="report-value">${esc(String(value).trim())}</span></span>`).join('');
    return ed.frontBlock('front-card report-card', page, rows);
  }

  // Reflection answers only show once it's shot, as on the page.
  function reflection(s) {
    const fields = [['whatWentRight', 'What went right'], ['couldBeBetter', "What could've gone better"], ['lessonsLearned', 'Lessons for next time']]
      .filter(([key]) => has(s[key])).map(([key, label]) => [label, s[key]]);
    return fields.length ? ed.frontTitle('Reflection') + fieldsCard('postShootHeading', fields) : '';
  }

  // The final images, three to a row; a tap opens one large.
  function finalImages(s, c) {
    if (c.video) {
      const fields = ed.videoDeliverableFields(s);
      return fields.length ? ed.frontTitle('Deliverables') + fieldsCard('postShootHeading', fields) : '';
    }
    finals = c.finals;
    const title = ed.frontTitle('Final images', c.finalImages ? plural(c.finalImages, 'image') : '');
    if (!c.finalImages) {
      return title + ed.frontBlock('front-card front-board', 'postShootHeading',
        '<span class="front-empty"><span class="front-empty-big">No final images yet.</span><span>Add them once they\'re edited.</span></span>');
    }
    const thumbs = c.finals.slice(0, 6).map((img, i) => `<button type="button" class="report-thumb" data-final="${i}" aria-label="Final image ${i + 1}"><img src="${img.src}" alt="" /></button>`).join('');
    return `${title}<div class="front-card report-finals"><div class="report-grid">${thumbs}</div>
      <button type="button" class="front-see-all" data-page="postShootHeading">See all ${c.finalImages} ${CHEVRON}</button></div>`;
  }

  // What it was about: the Direction boxes this kind of shoot has.
  function idea(s) {
    const fields = [['premise', 'Concept'], ['elevatorPitch', 'Elevator pitch'], ['character', 'Character/Personality'], ['worldNotes', 'World-building notes']]
      .filter(([key]) => ed.directionFieldApplies(s, key) && has(s[key])).map(([key, label]) => [label, s[key]]);
    return fields.length ? ed.frontTitle('The idea') + fieldsCard('directionHeading', fields) : '';
  }

  function shootingNotes(s) {
    if (!has(s.shootingNotes)) return '';
    return ed.frontTitle('Shooting notes') + ed.frontBlock('front-card report-card', 'shotListHeading', `<span class="report-value">${esc(s.shootingNotes.trim())}</span>`);
  }

  // The reflection card (asking for it) comes first while it's missing.
  function drawReportCards(s, c, prompt) {
    const told = reflection(s);
    const html = (told || prompt) + finalImages(s, c) + ed.onSetHtml(s) + idea(s) + shootingNotes(s);
    return { html, onFront: [told || prompt ? 'reflection' : '', c.video ? '' : 'finalImages', idea(s) ? 'direction' : ''].filter(Boolean) };
  }

  document.getElementById('shootFrontCards').addEventListener('click', (e) => {
    const thumb = e.target.closest('[data-final]');
    if (thumb) ed.openImageViewer(finals, Number(thumb.dataset.final), ed.finalImagesKey(ed.currentShootId), null, false);
  });
};
