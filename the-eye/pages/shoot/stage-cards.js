// The cards on a shoot's front page once it's shot: the reflection while
// it's fresh (with Walk me through it and Later), the proofs and the
// deadline, what happened on set, and the final images. Each opens the
// part of the page it's about. Before the shoot, front-cards.js has its own;
// once it's delivered, report-cards.js.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootStageCards = function addShootStageCards(ed) {
  Object.assign(ed, { drawStageCards, onSetHtml: onSet });
  const CHEVRON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  // The Reflections mark (pages/tabs.html), as the card's picture.
  const MARK = '<svg class="front-reflect-mark" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22"/><path d="M24 2a22 22 0 0 1 22 22H24Z"/></svg>';
  const IN_THE_EDIT = ['waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions'];
  const esc = v => ed.escapeHtml(v);
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  // Later puts the reflection card away for as long as the app's open. An
  // archived shoot isn't fresh any more: its reflection is a row below.
  const later = new Set();

  function reflectionCard(s) {
    if (s.archived || ed.hasReflection(s) || later.has(s.id)) return '';
    return `<div class="front-card front-reflect">${MARK}<div class="front-reflect-words">
      <span class="front-card-title">Reflection</span>
      <p class="front-card-text front-card-big">While it's fresh: what went right, what could've gone better, and one lesson for next time.</p>
      <div class="front-card-btns"><button type="button" class="text-act" data-act="reflect">Walk me through it</button><button type="button" class="text-act text-act-quiet" data-act="later">Later</button></div>
    </div></div>`;
  }

  // "Due Fri 20 Nov", "Overdue by 3 days" (crimson), or "Add a deadline".
  function deadlineLine(s) {
    const today = ed.todayStr();
    if (!s.deadline) return { words: 'Add a deadline', late: false };
    if (s.deadline < today) return { words: ed.overdueWords(s.deadline, today), late: true };
    return { words: ed.dueWords(s.deadline, today), late: false };
  }
  function deadlineRow(s) {
    const d = deadlineLine(s);
    return `<button type="button" class="front-deadline" data-page="logisticsHeading"><span class="front-deadline-label">Deadline</span>
      <span class="front-deadline-words${d.late ? ' late' : ''}">${esc(d.words)} ${CHEVRON}</span></button>`;
  }

  // "Shot today", "Shot yesterday", "Shot 3 days ago".
  function shotAgo(s) {
    if (!s.date) return '';
    const n = ed.daysBetween(s.date, ed.todayStr());
    if (n <= 0) return 'Shot today';
    if (n === 1) return 'Shot yesterday';
    return `Shot ${n} days ago`;
  }
  function proofsCard(s, c) {
    if (c.video) return `<div class="front-card">${deadlineRow(s)}</div>`;
    const first = (s.talents || []).map(t => (t.name || '').trim().split(/\s+/)[0]).find(Boolean);
    return `<div class="front-card front-proofs">
      <div class="front-card-head"><span class="front-card-title">Proofs</span><span class="front-card-meta">${esc(shotAgo(s))}</span></div>
      <p class="front-card-text">Send ${esc(first || 'your talent')} the proofs. Marking them sent moves the shoot to Waiting for selects.</p>
      <button type="button" class="outline-btn" data-act="proofs">Mark proofs sent</button>
      ${deadlineRow(s)}
    </div>`;
  }

  // Shots done, wild cards tried, and how far past the wrap time it was
  // marked shot (when that was the shoot's own day).
  function wrapWords(s) {
    if (!s.capturedAt || !s.date || !s.endTime) return '';
    const done = new Date(s.capturedAt);
    if (Number.isNaN(done.getTime()) || ed.formatDate(done) !== s.date) return '';
    const [h, m] = s.endTime.split(':').map(Number);
    const wrap = new Date(done);
    wrap.setHours(h, m, 0, 0);
    const over = Math.round((done - wrap) / 60000);
    if (over <= 0) return 'On time';
    return over < 60 ? `${over}m` : `${Math.floor(over / 60)}h${over % 60 ? ` ${over % 60}m` : ''}`;
  }
  function onSet(s) {
    const shots = (s.shotList || []).filter(i => ed.hasText(i.text));
    const ticked = shots.filter(i => i.checked).length;
    const cards = Array.isArray(s.triedWildCards) ? s.triedWildCards.length : 0;
    const wrap = wrapWords(s);
    if (!ticked && !cards && !wrap) return '';
    const stat = (big, label) => `<span class="on-set-stat"><span class="on-set-big">${esc(big)}</span><span class="on-set-label">${esc(label)}</span></span>`;
    return `${ed.frontTitle('On set')}<div class="on-set">
      ${shots.length ? stat(`${ticked}/${shots.length}`, 'Shots') : ''}
      ${stat(String(cards), plural(cards, 'wild card').replace(/^\d+ /, '') + ' tried')}
      ${wrap ? stat(wrap, wrap === 'On time' ? 'Wrap' : 'Over wrap') : ''}
    </div>`;
  }

  // In the edit: the deadline (its row says so), then the final images.
  function deadlineCard(s) {
    return `<div class="front-card">${deadlineRow(s)}</div>`;
  }
  function finalImagesCard(s, c) {
    if (c.video) return '';
    const thumbs = c.finals.slice(0, 4).map(img => `<img src="${img.src}" alt="" />`).join('');
    const inner = c.finalImages
      ? `<span class="front-finals">${thumbs}</span><span class="front-board-words"><span class="front-board-name">${esc(plural(c.finalImages, 'final image'))}</span></span>${CHEVRON}`
      : '<span class="front-empty"><span class="front-empty-big">No final images yet.</span><span>Add them once they\'re edited.</span></span>';
    return ed.frontTitle('Final images') + ed.frontBlock('front-card front-board', 'postShootHeading', inner);
  }

  // This stage's cards, and the parts they cover (left out of The details).
  function drawStageCards(s, c) {
    const reflect = reflectionCard(s);
    const covered = reflect ? ['reflection'] : [];
    if (s.status === 'captured') return { html: reflect + proofsCard(s, c) + onSet(s), onFront: covered };
    if (IN_THE_EDIT.includes(s.status)) return { html: reflect + deadlineCard(s) + finalImagesCard(s, c), onFront: [...covered, 'finalImages'] };
    // Delivered or archived: its report (report-cards.js).
    return ed.drawReportCards(s, c, reflect);
  }

  document.getElementById('shootFrontCards').addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'later') { later.add(ed.currentShootId); ed.drawShootFront(); return; }
    if (act.dataset.act === 'reflect') { ed.runNextStep({ key: 'reflect' }); return; }
    if (act.dataset.act === 'proofs') ed.runNextStep({ key: 'status', to: 'waiting_for_selects' });
  });
};
