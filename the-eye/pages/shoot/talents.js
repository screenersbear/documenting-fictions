// Talents on the shoot page, and what shows under each.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTalents = function addShootTalents(ed) {
  Object.assign(ed, { renderPastLessons });
  // ---------- Talents (dynamic list, right under Title) ----------
  // Each talent renders as a compact read-only summary card — name, and
  // handles as plain text — with an Edit button that reopens the same popup
  // used to add one, prefilled (see openTalentModal/talentModalDraft below).
  // Mirrors the Location popup's pattern: nothing commits to currentTalents
  // until Save is tapped, so canceling out of an edit throws nothing away.
  ed.currentTalents = [];

  // ---------- Under a shoot's talent: last time with them ----------
  // The "Lessons for next time" from other shoots with any of the same people
  // (newest first, up to three; a shoot's later days share their lessons, so
  // each one shows once), so planning starts from what was learned before.
  function renderPastLessons() {
    const box = document.getElementById('pastLessons');
    const norm = n => (n || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const names = new Map();
    ed.currentTalents.forEach(t => { if (ed.hasText(t.name)) names.set(norm(t.name), t.name.trim()); });
    const seen = new Set();
    const shown = !names.size ? [] : ed.state.shoots
      .filter(s => s.id !== ed.editingShootId && ed.hasText(s.lessonsLearned) && (s.talents || []).some(t => names.has(norm(t.name))))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .filter(s => { const k = s.lessonsLearned.trim(); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 3);
    box.hidden = !shown.length;
    if (!shown.length) { box.innerHTML = ''; return; }
    const who = [...new Set(shown.flatMap(s => (s.talents || []).map(t => norm(t.name)).filter(n => names.has(n))))].map(n => names.get(n));
    box.innerHTML = `<p class="team-question">Last time with ${ed.escapeHtml(ed.joinWithAnd(who))}</p>` + shown.map(s => `
      <div class="past-lesson">
        <span class="past-lesson-head">${ed.escapeHtml(ed.hasText(s.title) ? s.title.trim() : ed.shootDisplayName(s))}${s.date ? ` · ${ed.escapeHtml(ed.prettyDate(s.date))}` : ''}</span>
        <span class="past-lesson-text">${ed.escapeHtml(s.lessonsLearned.trim())}</span>
      </div>`).join('');
  }
};
