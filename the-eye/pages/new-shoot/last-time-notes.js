// "Last time" notes: lessons carried into planning.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootLastTimeNotes = function addNewShootLastTimeNotes(ed) {
  Object.assign(ed, { lastShootWithLessons, clearLastTimeNotes, showGoalsLastTimeNote });
  // ---------- "Last time" notes (lessons carried into planning) ----------
  // When planning runs into something you've done before — picking a
  // returning talent or a past location (that one not in the new-shoot
  // guide, see the pastLocationsSelect listener), or reaching the guide's
  // Goals slide for a kind of shoot you've done — this brings back what you
  // wrote under "Lessons for next time" the most recent time: one quiet
  // line under the pick, quoting that shoot's name and date, with an
  // optional button that copies it into this shoot's Shooting notes. Only
  // from shoots that have actually been shot (post-capture) with lessons
  // written, and never from the shoot that's open. It never stops you doing
  // anything: one note per popup or slide at most, replaced by the next
  // pick, and gone with the popup or slide it's on.

  // The newest shoot (by shoot date; undated ones last) that passes
  // `matches` and has lessons to pass on, or null. Never `excludeId`: the
  // shoot that's open (Shoot mode passes its own).
  function lastShootWithLessons(matches, excludeId = ed.currentShootId) {
    return ed.state.shoots
      .filter(s => s.id !== excludeId && ed.isPostCaptureStatus(s.status) && ed.hasText(s.lessonsLearned) && matches(s))
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0] || null;
  }

  function clearLastTimeNotes(container) {
    if (container) container.querySelectorAll(':scope > .last-time-note').forEach(note => note.remove());
  }

  // Puts the note for `shoot` right after `anchor` (the field it's about),
  // replacing any note already beside it; a null shoot just clears it.
  function showLastTimeNote(anchor, shoot) {
    if (!anchor) return;
    clearLastTimeNotes(anchor.parentElement);
    if (!shoot) return;
    const lessons = shoot.lessonsLearned.trim();
    const when = ed.prettyDate(shoot.date);
    const source = when ? `${ed.shootDisplayName(shoot)}, ${when}` : ed.shootDisplayName(shoot);
    const note = document.createElement('div');
    note.className = 'last-time-note';
    const text = document.createElement('p');
    text.className = 'field-hint';
    // Quoted up to 1000 characters (what Lessons used to hold), so a long
    // spoken one doesn't push the popup's own fields far down; the button
    // below still adds all of it.
    const quoted = lessons.length > 1000 ? `${lessons.slice(0, 1000).replace(/\s+\S*$/, '')}…` : lessons;
    text.innerHTML = `<span class="field-hint-bold">Last time</span> (${ed.escapeHtml(source)}): “${ed.escapeHtml(quoted)}”`;
    note.appendChild(text);
    // Written straight into the page's own Shooting notes box (it's on the
    // page even while a popup or the guide is over it), then the same
    // 'input' event typing sends, so the form's autosave and filled-in look
    // pick it up. Offered only while those notes don't already have it — the
    // same lessons can turn up from more than one pick.
    const notesField = document.getElementById('shootShootingNotes');
    if (!notesField.value.includes(lessons)) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'secondary small-btn';
      addBtn.textContent = '+ Add to shooting notes';
      addBtn.addEventListener('click', () => {
        const existing = notesField.value.replace(/\s+$/, '');
        const combined = `${existing ? `${existing}\n\n` : ''}From last time (${source}): ${lessons}`;
        const result = document.createElement('p');
        result.className = 'field-hint';
        if (combined.length > notesField.maxLength) {
          result.textContent = "There's not enough room left in Shooting notes for this.";
        } else {
          notesField.value = combined;
          notesField.dispatchEvent(new Event('input', { bubbles: true }));
          result.textContent = 'Added to shooting notes.';
        }
        addBtn.replaceWith(result);
      });
      note.appendChild(addBtn);
    }
    anchor.after(note);
  }

  function showGoalsLastTimeNote() {
    const category = document.getElementById('shootCategory').value;
    const goalsLabel = document.getElementById('shootGoals').closest('label');
    showLastTimeNote(goalsLabel, category ? lastShootWithLessons(s => s.category === category) : null);
  }

  // Alongside each picker's own change handler (which fills in the popup),
  // never instead of it. "Select a…" or "Manage…" just clears the note.
  document.getElementById('pastTalentsSelect').addEventListener('change', (e) => {
    const t = /^\d+$/.test(e.target.value) ? ed.pastTalentSamples[Number(e.target.value)] : null;
    const key = t && ed.hasText(t.name) ? t.name.trim().toLowerCase() : '';
    showLastTimeNote(e.target.closest('label'), key
      ? lastShootWithLessons(s => (s.talents || []).some(other => (other.name || '').trim().toLowerCase() === key))
      : null);
  });

  // Not while the new-shoot guide is up (the user's call, 2026-11-10): there
  // a past location is just picked, with no lesson under it.
  document.getElementById('pastLocationsSelect').addEventListener('change', (e) => {
    const loc = !ed.shootWizardActive && /^\d+$/.test(e.target.value) ? ed.pastLocationSamples[Number(e.target.value)] : null;
    const key = loc ? ed.locationKey(loc) : '';
    showLastTimeNote(e.target.closest('label'), key
      ? lastShootWithLessons(s => !!s.location && ed.locationKey(s.location) === key)
      : null);
  });

  // Each popup's note goes when the popup does — Save, the close button
  // and a tap outside all just hide the overlay — so it never greets the
  // next talent or location you open. Watched rather than wired into each
  // of those ways out.
  const lastTimeNoteObserver = new MutationObserver(records => {
    records.forEach(({ target }) => {
      if (target.hidden) target.querySelectorAll('.last-time-note').forEach(note => note.remove());
    });
  });
  ['talentModalOverlay', 'locationModalOverlay'].forEach(id => {
    lastTimeNoteObserver.observe(document.getElementById(id), { attributes: true, attributeFilter: ['hidden'] });
  });
};
