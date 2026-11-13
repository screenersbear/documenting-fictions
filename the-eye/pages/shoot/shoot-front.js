// A shoot's page in the round 2 look: the front page (its status, name, when
// and where, the cards for what this stage needs, then The details), and
// each part of the form below on a page of its own, one tap deeper. The
// form itself is unchanged: it's only shown a part at a time.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootFront = function addShootFront(ed) {
  Object.assign(ed, { frontShoot, frontCounts, showShootFront, showShootDetail, drawShootFront, lastFrontCounts: () => lastCounts });
  ed.shootOnFront = true;
  const front = document.getElementById('shootFront');
  const modal = ed.shootModalOverlay.querySelector('.modal');
  const PLACES = { overview: 'Overview', shoots: 'Shoots', journal: 'Reflections', archive: 'Archive', stats: 'Stats' };
  const CLOCK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>';
  const PIN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';

  // The shoot as it stands on the page: what's saved, with what's typed.
  function frontShoot() {
    const saved = ed.state.shoots.find(s => s.id === ed.currentShootId) || {};
    return { ...saved, ...ed.gatherShootFormData(), id: ed.currentShootId, archived: !!saved.archived };
  }

  // What lives outside the shoot, for the cards and the next step: how many
  // mood board photos and final images, its boards from Ref, whether it's video.
  function frontCounts(shootId) {
    const video = document.getElementById('shootCategory').value === 'video';
    const urls = [];
    return Promise.all([
      ed.idbGetImages(shootId).catch(() => []),
      ed.idbGetImages(ed.finalImagesKey(shootId)).catch(() => []),
      ed.refBoardsFor(shootId, urls).catch(() => []),
    ]).then(([photos, finals, boards]) => ({
      moodboard: photos.length, photos, finalImages: finals.length, finals, boards: boards.length, boardList: boards, urls, video,
    }));
  }

  // Only the part of the form that's open shows: the rest is put away
  // (styles/shoot-front.css). A block the guide has borrowed isn't the
  // form's own child while it's out, so it shows wherever the guide is.
  function showPart(pageId) {
    ed.shootPageEls.forEach(({ el, page }) => el.classList.toggle('shoot-off', page !== pageId));
    ed.shootForm.classList.toggle('shoot-form-off', !pageId);
  }

  function placeName() {
    return PLACES[ed.currentScreen()] || 'Shoots';
  }

  function showShootFront() {
    ed.shootOnFront = true;
    ed.shootModalOverlay.classList.add('on-front');
    front.hidden = false;
    showPart(null);
    document.getElementById('shootBandPlace').textContent = placeName();
    if (ed.currentShootId) ed.shootPageMemory[ed.currentShootId] = { id: 'front', sub: 0 };
    modal.scrollTop = 0;
    drawShootFront();
    ed.queueLastPlace();
  }

  function showShootDetail(pageId) {
    ed.shootOnFront = false;
    ed.shootModalOverlay.classList.remove('on-front');
    front.hidden = true;
    showPart(pageId);
    document.getElementById('shootBandPlace').textContent = ed.shootDisplayName(frontShoot());
    // Boxes that were put away measured nothing.
    ed.autoSizeAllListTextareas();
    ed.syncAllShootFormFields();
    modal.scrollTop = 0;
    ed.drawNextStep(frontShoot(), lastCounts);
    ed.queueLastPlace();
  }

  const has = v => ed.hasText(v);

  // "4:30 to 7:00 PM": one AM or PM when both ends share it.
  function timeWords(start, end) {
    if (!start) return 'time not set';
    const a = ed.prettyTime(start);
    if (!end) return a;
    const b = ed.prettyTime(end);
    const sameHalf = a.slice(-2) === b.slice(-2);
    return `${sameHalf ? a.slice(0, -3) : a} to ${b}`;
  }
  const placeWords = loc => (loc ? [loc.name, loc.city].filter(has).map(v => v.trim()).join(', ') || ed.formatLocationDisplayNoCountry(loc) : '');

  function drawHead(s) {
    document.getElementById('shootStatusTagText').textContent = ed.STATUS_LABELS[s.status] || 'Prospect';
    document.getElementById('shootFrontTitle').textContent = ed.shootDisplayName(s);
    const today = ed.todayStr();
    const when = document.getElementById('shootFrontWhen');
    const where = placeWords(s.location);
    if (ed.isPostCaptureStatus(s.status)) {
      when.className = 'shoot-front-when shoot-front-shot';
      when.textContent = ed.metaLine([s.date ? `Shot ${ed.rowDate(s.date, today, true)}` : '', where]);
      return;
    }
    when.className = 'shoot-front-when';
    const day = s.date ? `${ed.rowDate(s.date, today, true)}, ${timeWords(s.startTime, s.endTime)}` : 'Date not set';
    when.innerHTML = `<span>${CLOCK}<span>${ed.escapeHtml(day)}</span></span>
      <span class="${where ? '' : 'shoot-front-dim'}">${PIN}<span>${ed.escapeHtml(where || 'Location to be decided')}</span></span>`;
  }

  // ---------- The details ----------
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const shot = s => ed.isPostCaptureStatus(s.status);
  // An honest answer's words, while it stands.
  const unsure = (s, key, words) => (ed.stillNotSure(s).includes(key) ? words : '');
  // The first board from Ref: live, frozen on the day it was shot, or imported.
  function boardWords(c) {
    const l = c.boardList && c.boardList[0] && c.boardList[0].link;
    if (!l) return '';
    if (l.importedAt) return 'Imported from Ref';
    if (!l.frozenAt) return 'Live from Ref';
    return `Board as of ${ed.rowDate(ed.formatDate(new Date(l.frozenAt)), ed.todayStr(), false)}, frozen from Ref`;
  }
  // "4 shots, 2 must-haves"; once it's shot, how many got done: "3 of 4, both must-haves".
  function shotListWords(s) {
    const shots = (s.shotList || []).filter(i => has(i.text));
    if (!shots.length) return '';
    const stars = shots.filter(i => i.starred);
    if (!shot(s)) return ed.metaLine([plural(shots.length, 'shot'), stars.length ? plural(stars.length, 'must-have') : '']);
    const done = shots.filter(i => i.checked).length;
    const starsDone = stars.filter(i => i.checked).length;
    let musts = '';
    if (stars.length && starsDone === stars.length) musts = stars.length === 1 ? 'the must-have' : stars.length === 2 ? 'both must-haves' : `all ${stars.length} must-haves`;
    else if (stars.length) musts = `${starsDone} of ${stars.length} must-haves`;
    return ed.metaLine([`${done} of ${shots.length}`, musts]);
  }
  const ROWS = {
    talent: { label: 'Talent', page: 'basicInfoHeading', words: s => (s.talents || []).map(t => t.name).filter(has).join(', ') },
    logistics: { label: 'Logistics', page: 'logisticsHeading', words: s => ed.metaLine([s.date ? ed.rowDate(s.date, ed.todayStr(), true) : unsure(s, 'date', 'Date not set'), placeWords(s.location) || unsure(s, 'location', 'Location to be decided')]) },
    team: { label: 'Team', page: 'teamHeading', words: s => (s.teamRequired === 'no' ? 'Just me' : (s.teamMembers || []).map(m => m.name).filter(has).join(', ') || unsure(s, 'team', 'Not sure yet')) },
    direction: { label: 'Direction', page: 'directionHeading', words: s => ['premise', 'shootGoals', 'elevatorPitch', 'character', 'worldNotes', 'deliverables'].map(k => s[k]).find(has) || '' },
    // Once it's shot, the mood board is what it was on the day.
    visuals: { label: s => (shot(s) ? ed.moodboardTerm(s.category || '') : 'Visuals'), page: 'visualsHeading', words: (s, c) => ed.metaLine([boardWords(c), c.boards > 1 ? plural(c.boards, 'board') : '', c.moodboard ? plural(c.moodboard, 'photo') : '', (s.references || []).length ? plural(s.references.length, 'link') : '', (s.lightingSetups || []).length ? plural(s.lightingSetups.length, 'lighting setup') : '']) },
    shotList: { label: 'Shot list', page: 'shotListHeading', words: shotListWords },
    deadline: { label: 'Deadline', page: 'logisticsHeading', empty: 'Not set', words: s => (s.deadline ? `Due ${ed.rowDate(s.deadline, ed.todayStr(), false)}` : '') },
    notes: { label: 'Notes in Overthoughts', page: 'basicInfoHeading', words: () => { const first = document.querySelector('#shootNotes .past-lesson-head'); return first ? first.textContent.trim() : ''; } },
    reflection: { label: 'Reflection', page: 'postShootHeading', empty: 'Not written yet', words: s => ['lessonsLearned', 'whatWentRight', 'couldBeBetter'].map(k => s[k]).find(has) || '' },
    finalImages: { label: 'Final images', page: 'postShootHeading', empty: 'None yet', words: (s, c) => (c.finalImages ? plural(c.finalImages, 'final image') : '') },
  };

  // Which rows, by stage. A part already on the front page isn't repeated.
  function rowKeys(s, c, onFront) {
    const notes = !document.getElementById('shootNotes').hidden ? ['notes'] : [];
    let keys;
    if (!ed.isPostCaptureStatus(s.status)) keys = ['logistics', 'team', 'direction', 'visuals', 'shotList', 'deadline', ...notes];
    else keys = ['shotList', 'visuals', 'talent', 'team', 'logistics', 'direction', ...notes, ...(c.video ? [] : ['finalImages']), 'reflection'];
    return keys.filter(k => !onFront.includes(k));
  }

  function drawDetailRows(s, c, onFront) {
    const box = document.getElementById('shootDetailRows');
    // Before it's shot, an empty part opens its chapter of the guide.
    const planning = !ed.isPostCaptureStatus(s.status) && !s.archived;
    const rows = rowKeys(s, c, onFront).map((key) => {
      const row = ROWS[key];
      const words = row.words(s, c);
      const chapter = key === 'talent' ? 'basics' : key;
      const toGuide = planning && !words && ed.SETUP_CHAPTERS.some(ch => ch.key === chapter);
      return `<button type="button" class="detail-row" data-page="${row.page}"${toGuide ? ` data-chapter="${chapter}"` : ''}>
        <span class="detail-dot${words ? ' filled' : ''}" aria-hidden="true"></span>
        <span class="detail-words"><span class="detail-label">${ed.escapeHtml(typeof row.label === 'function' ? row.label(s) : row.label)}</span><span class="detail-sum">${ed.escapeHtml(words || row.empty || 'Not added yet')}</span></span>
        ${CHEVRON}</button>`;
    });
    // Before it's shot, the reflection waits: shown, but not a way in yet.
    if (!ed.isPostCaptureStatus(s.status)) {
      rows.push(`<div class="detail-row detail-row-closed"><span class="detail-dot" aria-hidden="true"></span>
        <span class="detail-words"><span class="detail-label">Reflection</span><span class="detail-sum">Opens once the shoot is captured</span></span></div>`);
    }
    box.innerHTML = rows.join('');
  }
  document.getElementById('shootDetailRows').addEventListener('click', (e) => {
    const row = e.target.closest('button.detail-row');
    if (!row) return;
    if (row.dataset.chapter) ed.openShootPart(row.dataset.chapter, row.dataset.page);
    else ed.showShootPage(row.dataset.page);
  });

  // Everything on the front page, from the shoot as it stands. The photos
  // and boards come in after; a newer draw wins.
  let drawing = 0;
  let boardUrls = [];
  let lastCounts = null;
  function drawShootFront() {
    if (ed.shootModalOverlay.hidden || !ed.shootOnFront) return Promise.resolve();
    const s = frontShoot();
    drawHead(s);
    const draw = ++drawing;
    return frontCounts(s.id).then((c) => {
      if (draw !== drawing) { c.urls.forEach(u => URL.revokeObjectURL(u)); return; }
      boardUrls.forEach(u => URL.revokeObjectURL(u));
      boardUrls = c.urls;
      lastCounts = c;
      const onFront = ed.drawFrontCards(s, c);
      drawDetailRows(s, c, onFront);
      ed.drawNextStep(s, c);
    });
  }

  document.getElementById('shootBandBack').addEventListener('click', () => {
    if (ed.shootOnFront) ed.shootModalOverlay.querySelector('[data-close="shoot"]').click();
    else { ed.saveShootNow(); showShootFront(); }
  });
};
