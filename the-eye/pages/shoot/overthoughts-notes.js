// Notes about this shoot, written in Overthoughts.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOverthoughtsNotes = function addShootOverthoughtsNotes(ed) {
  Object.assign(ed, { renderShootNotes, renderTalents });
  // ---------- Notes about this shoot, written in Overthoughts ----------
  // Inside Documenting Fictions an Overthoughts entry can say which shoot
  // it's about: it shows here, read only, and opens in Overthoughts. Nothing
  // goes the other way: The Eye never writes to Overthoughts.
  function renderShootNotes(shootId) {
    const box = document.getElementById('shootNotes');
    box.hidden = true;
    box.innerHTML = '';
    const D = window.DFData;
    if (!shootId || !D || !D.inSuite()) return;
    const firstLine = t => (t || '').split('\n').map(l => l.trim()).find(Boolean) || 'Untitled entry';
    D.overthoughts().then(db => D.rows(db, 'entries')).then(rows => {
      if (ed.editingShootId !== shootId) return;
      const notes = rows.map(([, e]) => e)
        .filter(e => e && e.shootId === shootId && e.kind !== 'reflection' && e.from !== 'the-eye' && (ed.hasText(e.title) || ed.hasText(e.body) || ed.hasText(e.takeaway)))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
        .slice(0, 5);
      if (!notes.length) return;
      box.innerHTML = '<p class="team-question">Notes in Overthoughts</p>' + notes.map(e => `
        <a class="past-lesson past-lesson-link" href="${ed.escapeHtml(D.notebookUrl('overthoughts', { entry: e.id }) || '#')}">
          <span class="past-lesson-head">${ed.escapeHtml(ed.hasText(e.title) ? e.title.trim() : firstLine(e.body))}${e.date ? ` · ${ed.escapeHtml(ed.prettyDate(e.date))}` : ''}</span>
          ${ed.hasText(e.takeaway) ? `<span class="past-lesson-text">${ed.escapeHtml(e.takeaway.trim())}</span>` : ''}
        </a>`).join('');
      box.hidden = false;
    }).catch(() => {});
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
