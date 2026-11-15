// Talents on the shoot page, and what shows under each.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTalents = function addShootTalents(ed) {
  Object.assign(ed, { renderPastLessons, renderTalents });
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

  function renderTalents() {
    ed.updateShootRunningHead();
    ed.renderPastLessons();
    const container = document.getElementById('talentsList');
    container.innerHTML = ed.currentTalents.map((talent, idx) => {
      const handles = (talent.socialHandles || []).filter(sh => ed.hasText(sh.handle));
      return `
      <div class="team-member-card talent-summary-card" data-idx="${idx}">
        <div class="talent-summary-heading">
          ${talent.photo ? `<img src="${talent.photo}" alt="" class="talent-summary-photo" />` : ''}
          <span class="talent-summary-name">${ed.escapeHtml(ed.hasText(talent.name) ? talent.name : `Talent ${idx + 1}`)}</span>
        </div>
        ${handles.length ? `
          <div class="talent-summary-handles">
            ${handles.map(sh => {
              const entry = ed.SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
              return `<span>${ed.escapeHtml(entry ? entry[1] : 'Other')}: ${ed.escapeHtml(sh.handle)}</span>`;
            }).join('')}
          </div>
        ` : ''}
        <button type="button" class="talent-summary-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `;
    }).join('');

    // The whole card is the "edit" affordance now — no separate button needed.
    container.querySelectorAll('.talent-summary-card').forEach(card => {
      card.addEventListener('click', () => ed.openTalentModal(Number(card.dataset.idx)));
    });
    container.querySelectorAll('.talent-summary-delete').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        // The card itself opens the edit popup, so the delete "x" has to stop
        // the click here or it also reopens a popup for the talent it just removed.
        // Stopped before the await below, while the click is still on its way.
        ev.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const talent = ed.currentTalents[idx];
        if (!talent) return;
        const shootId = ed.currentShootId;
        // Removing a talent also throws away their handles and photo, so it
        // asks first rather than vanishing on a mis-tap.
        const who = ed.hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}`;
        const ok = await ed.askConfirm({
          title: `Remove ${who} from this shoot?`,
          text: 'Their handles and photo will be removed too.',
          confirmLabel: 'Remove',
          cancelLabel: 'Keep them',
          danger: true,
        });
        if (!ok || ed.currentShootId !== shootId) return;
        // Found again by the talent itself, in case the list moved meanwhile.
        const at = ed.currentTalents.indexOf(talent);
        if (at === -1) return;
        if (ed.currentShootId && talent.id) ed.idbDeleteImages(ed.talentPhotoKey(ed.currentShootId, talent.id)).catch(() => {});
        ed.currentTalents.splice(at, 1);
        renderTalents();
        ed.scheduleShootAutosave();
      });
    });
  }

  document.getElementById('addTalentBtn').addEventListener('click', () => ed.openTalentModal(null));
};
