// Which statuses a kind of shoot offers (video has its own edit steps).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootStatusOptions = function addShootStatusOptions(ed) {
  Object.assign(ed, { updateMoodboardCompleteLabel, updateMoodboardCompleteVisibility });
  // ---------- Category -> status options (video has its own edit steps) ----------
  // Flipping a shoot to or from Video rebuilds the status select for the new
  // category and swaps a category-specific status for its nearest equivalent
  // (Waiting for selects/Editing -> Rough cut; Rough cut/Client review/
  // Revisions -> Editing), so the select never goes blank. Both sides of
  // every swap are post-capture, so no reflection prompt/confirm is involved.
  // Flipping straight back restores the original status (see categoryRemap).
  function syncStatusSelectToCategory() {
    const category = document.getElementById('shootCategory').value;
    const current = document.getElementById('shootStatus').value || ed.previousStatusValue || 'prospect';
    // Looked up fresh: autosaveShoot replaces the shoot object on every save.
    const live = ed.state.shoots.find(x => x.id === ed.currentShootId);
    let next = ed.remapStatusForCategory(current, category);
    if (ed.categoryRemap && current === ed.categoryRemap.to && ed.remapStatusForCategory(ed.categoryRemap.from, category) === ed.categoryRemap.from) {
      next = ed.categoryRemap.from;
      // The flip's save may have stamped an edit-start date (Waiting for
      // selects -> Rough cut counts as entering the edit). Flipping straight
      // back puts it back how it was, so a mis-tap doesn't start the weekly
      // editing check-in clock early. The next autosave writes it.
      if (live) {
        if (ed.categoryRemap.editingAt) live.editingAt = ed.categoryRemap.editingAt;
        else delete live.editingAt;
      }
    }
    if (next !== current) ed.categoryRemap = { from: current, to: next, editingAt: live ? live.editingAt : undefined };
    ed.renderShootStatusSelectOptions(category, next);
    ed.previousStatusValue = next;
    ed.updateStatusSwatchDisplay();
  }

  document.getElementById('shootCategory').addEventListener('change', syncStatusSelectToCategory);

  function updateMoodboardCompleteLabel() {
    const checked = document.getElementById('shootMoodboardComplete').checked;
    const term = ed.moodboardTerm(document.getElementById('shootCategory').value);
    document.getElementById('moodboardCompleteLabel').textContent = `${term} complete or not required${checked ? '' : '?'}`;
  }

  // Past capture, the mood board is moot — hide the checkbox entirely rather
  // than let it keep tracking a value nobody's looking at anymore. Same for
  // canceled/postponed (key: rescheduled), an off-track branch rather than a step further
  // along (isPostCaptureStatus alone doesn't cover those — see its own
  // comment). The value itself is never touched here, so reverting to an
  // earlier status brings the row (and whatever it was actually set to)
  // right back.
  function updateMoodboardCompleteVisibility() {
    const status = document.getElementById('shootStatus').value;
    document.getElementById('moodboardCompleteRow').hidden =
      ed.isPostCaptureStatus(status) || status === 'canceled' || status === 'rescheduled';
  }

  document.getElementById('shootMoodboardComplete').addEventListener('change', updateMoodboardCompleteLabel);
};
