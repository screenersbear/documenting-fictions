// The cards on a shoot's front page before it's shot: Getting ready (the
// seven parts the guide asks about, components/shoot-stage.js), Talent, the
// mood board and the first shots. After the shoot, stage-cards.js has its
// own. Each card opens the part of the page it's about.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootFrontCards = function addShootFrontCards(ed) {
  Object.assign(ed, { drawFrontCards, frontBlock, frontTitle });
  const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8Z"/></svg>';
  const EMPTY_BOARD = '<span class="front-board-empty" aria-hidden="true"><span></span><span></span><span></span><span></span></span>';
  const has = v => ed.hasText(v);
  const esc = v => ed.escapeHtml(v);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // A section title on the front page, with words at its right.
  function frontTitle(text, right) {
    return `<div class="front-title-row"><h2 class="front-title">${esc(text)}</h2>${right ? `<span class="front-title-meta">${esc(right)}</span>` : ''}</div>`;
  }
  // A block that opens a part of the page.
  function frontBlock(cls, page, inner) {
    return `<button type="button" class="${cls}" data-page="${page}">${inner}</button>`;
  }

  // The chapter an honest answer belongs to (the date is asked in Basics).
  const NOT_SURE_CHAPTER = { date: 'basics', location: 'logistics', team: 'team' };

  // Stays while a part is missing or an answer is still "not sure yet".
  function gettingReady(s, c) {
    const chapters = ed.setupChapters(s, c);
    const unsure = ed.stillNotSure(s).map(key => NOT_SURE_CHAPTER[key]);
    const left = chapters.filter(ch => !ch.done);
    const from = left[0] || chapters.find(ch => unsure.includes(ch.key));
    if (!from) return '';
    const bars = chapters.map(ch => `<span class="${ch.done ? 'done' : ''}"></span>`).join('');
    return `<div class="front-card getting-ready">
      <div class="front-card-head"><span class="front-card-title">Getting ready</span><span class="front-card-meta">${chapters.length - left.length} of ${chapters.length}</span></div>
      <div class="ready-bars" aria-hidden="true">${bars}</div>
      <p class="front-card-text">${esc([ed.setupWords(chapters), ed.notSureWords(s)].filter(Boolean).join(' '))}</p>
      <button type="button" class="outline-btn" data-guide="${from.key}">Continue setup ${CHEVRON}</button>
      <p class="front-card-note">The whole guide, from ${esc(from.label.toLowerCase())} on</p>
    </div>`;
  }

  // Who's in it: their photo, name, and whether they've been in a shoot before.
  function talentBlock(s) {
    const talents = (s.talents || []).filter(t => has(t.name));
    const others = ed.state.shoots.filter(x => x.id !== s.id);
    const returning = t => others.some(x => (x.talents || []).some(o => has(o.name) && o.name.trim().toLowerCase() === t.name.trim().toLowerCase()));
    const rows = talents.map((t) => {
      const handle = (t.socialHandles || []).map(h => h.handle || h.value || '').find(has);
      const meta = ed.metaLine([returning(t) ? 'Returning talent' : '', handle ? `@${handle.replace(/^@/, '')}` : '']);
      return `<span class="front-talent">
        <span class="front-talent-photo">${t.photo ? `<img src="${t.photo}" alt="" />` : ''}</span>
        <span class="front-talent-words"><span class="front-talent-name">${esc(t.name)}</span>${meta ? `<span class="front-talent-meta">${esc(meta)}</span>` : ''}</span>
      </span>`;
    }).join('');
    return frontTitle('Talent') + frontBlock('front-talents', 'basicInfoHeading', rows
      || '<span class="front-empty"><span class="front-empty-big">No talent yet.</span><span>Add who it\'s with.</span></span>');
  }

  // The first board from Ref, else the shoot's own photos, else how to add one.
  function moodboardBlock(s, c) {
    const term = ed.moodboardTerm(s.category || '');
    const board = c.boardList[0];
    let inner;
    if (board) {
      const l = board.link;
      const state = l.importedAt ? 'Imported' : l.frozenAt ? 'Frozen from Ref' : 'Live from Ref';
      const pics = [board.cover, ...board.pages].filter(Boolean).slice(0, 3);
      inner = `${collage(pics)}<span class="front-board-words"><span class="front-board-state">${esc(state)}</span>
        <span class="front-board-name">${esc(l.name || term)}</span><span class="front-board-meta">${esc(plural(l.photoCount || 0, 'image'))}</span></span>${CHEVRON}`;
    } else if (c.moodboard) {
      inner = `${collage(c.photos.slice(0, 3).map(p => p.src))}<span class="front-board-words"><span class="front-board-name">${esc(term)}</span>
        <span class="front-board-meta">${esc(plural(c.moodboard, 'photo'))}</span></span>${CHEVRON}`;
    } else {
      inner = `${EMPTY_BOARD}<span class="front-board-words"><span class="front-empty-big">No ${esc(term.toLowerCase())} yet.</span><span>Send one from Ref, or import photos.</span></span>`;
    }
    return frontTitle(term) + frontBlock('front-card front-board', 'visualsHeading', inner);
  }
  function collage(srcs) {
    return `<span class="front-collage n${srcs.length}" aria-hidden="true">${srcs.map(src => `<img src="${src}" alt="" />`).join('')}</span>`;
  }

  // The first three shots, and the way to the rest.
  function shotListBlock(s) {
    const shots = (s.shotList || []).filter(i => has(i.text));
    if (!shots.length) return '';
    const stars = shots.filter(i => i.starred).length;
    const rows = shots.slice(0, 3).map(i => `<span class="front-shot"><span class="front-shot-ring" aria-hidden="true"></span>
      <span class="front-shot-text">${esc(i.text)}</span><span class="front-shot-star${i.starred ? ' starred' : ''}" aria-label="${i.starred ? 'Must-have' : ''}">${STAR}</span></span>`).join('');
    return frontTitle('Shot list', ed.metaLine([plural(shots.length, 'shot'), stars ? plural(stars, 'must-have') : '']))
      + frontBlock('front-shots', 'shotListHeading', `${rows}<span class="front-see-all">See all ${shots.length} ${CHEVRON}</span>`);
  }

  // Draws this stage's cards; returns the parts they cover, which The
  // details then leaves out.
  function drawFrontCards(s, c) {
    const box = document.getElementById('shootFrontCards');
    let html = '';
    let onFront = [];
    if (ed.isPostCaptureStatus(s.status) || s.archived) {
      const drawn = ed.drawStageCards(s, c);
      html = drawn.html;
      onFront = drawn.onFront;
    } else if (s.status === 'waiting_to_shoot') {
      html = moodboardBlock(s, c) + shotListBlock(s) + talentBlock(s);
      onFront = ['shotList'];
    } else {
      html = gettingReady(s, c) + talentBlock(s) + moodboardBlock(s, c) + shotListBlock(s);
      onFront = ['shotList'];
    }
    box.innerHTML = html;
    // An empty shot list isn't on the front page, so it stays a row.
    if (!box.querySelector('[data-page="shotListHeading"]')) onFront = onFront.filter(k => k !== 'shotList');
    return onFront;
  }

  document.getElementById('shootFrontCards').addEventListener('click', (e) => {
    const guide = e.target.closest('[data-guide]');
    if (guide) { ed.startShootWizard({ again: true, from: guide.dataset.guide }); return; }
    const part = e.target.closest('[data-page]');
    if (part) ed.showShootPage(part.dataset.page);
  });
};
