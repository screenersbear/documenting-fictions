// The prompt to add a deadline, once a shoot is in the edit.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootDeadlinePrompt = function addShootDeadlinePrompt(ed) {
  Object.assign(ed, { maybeOpenDeadlinePrompt, updateEnterShootModeBtnVisibility });
  // ---------- Add deadline prompt (shown once a shoot moves into the edit —
  // Editing, or any of a video's Rough cut/Client review/Revisions — without
  // a deadline set yet — chained after the post-shoot reflection
  // prompt when both apply, e.g. a shoot logged retroactively straight into
  // "editing", so the two never show stacked on top of each other). ----------
  let deadlinePromptShootId = null;

  function openDeadlinePrompt(shootId) {
    deadlinePromptShootId = shootId;
    document.getElementById('deadlinePromptDateInput').value = '';
    // "Set deadline" waits for a date — it used to just close with none.
    document.getElementById('deadlinePromptOkBtn').disabled = true;
    document.getElementById('deadlinePromptOverlay').hidden = false;
    ed.fitButtonPair(document.getElementById('deadlinePromptActions'));
  }

  function maybeOpenDeadlinePrompt(shootId) {
    let status = '';
    let deadline = '';
    if (ed.shootPageOpenOn(shootId)) {
      status = document.getElementById('shootStatus').value;
      deadline = document.getElementById('shootDeadline').value;
    } else {
      const s = ed.state.shoots.find(x => x.id === shootId);
      if (!s) return;
      status = s.status;
      deadline = s.deadline;
    }
    if (ed.isInTheEditStatus(status) && !ed.hasText(deadline)) openDeadlinePrompt(shootId);
  }

  ['input', 'change'].forEach(type => {
    document.getElementById('deadlinePromptDateInput').addEventListener(type, (e) => {
      document.getElementById('deadlinePromptOkBtn').disabled = !e.target.value;
    });
  });

  document.getElementById('deadlinePromptOkBtn').addEventListener('click', () => {
    const dateValue = document.getElementById('deadlinePromptDateInput').value;
    if (!dateValue) return;
    const shootId = deadlinePromptShootId;
    document.getElementById('deadlinePromptOverlay').hidden = true;
    if (ed.shootPageOpenOn(shootId)) {
      document.getElementById('shootDeadline').value = dateValue;
      ed.scheduleShootAutosave();
      return;
    }
    // Asked from a row, with the page closed: same write as the ⋮ menu's
    // own deadline option (saveDeadlineOption).
    const idx = ed.state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return;
    ed.state.shoots[idx] = { ...ed.state.shoots[idx], deadline: dateValue };
    ed.saveState();
    ed.renderAll();
  });

  document.getElementById('deadlinePromptNotNowBtn').addEventListener('click', () => {
    document.getElementById('deadlinePromptOverlay').hidden = true;
    ed.showToast('You can add a deadline anytime from Basic Info.');
  });

  // Shoot mode only makes sense once a shoot has a shot list and mood board
  // worth working from and a day it's actually happening — "Shoot ready" is the
  // one status that means both. Re-run on every status change (not just on
  // load), since flipping the swatch while the modal is open is the normal way
  // a shoot reaches that status in the first place. An archived shoot gets
  // Archive mode's button in this exact same spot instead — the two are
  // mutually exclusive, so Shoot mode is also hidden once archived even on
  // the off chance a shoot got archived without ever reaching "Shoot ready".
  function updateEnterShootModeBtnVisibility() {
    const status = document.getElementById('shootStatus').value;
    const shoot = ed.editingShootId ? ed.state.shoots.find(s => s.id === ed.editingShootId) : null;
    const isArchived = !!(shoot && shoot.archived);
    document.getElementById('enterShootModeBtn').hidden = !ed.editingShootId || isArchived || status !== 'waiting_to_shoot';
    document.getElementById('enterArchiveModeBtn').hidden = !ed.editingShootId || !isArchived;
  }

  document.getElementById('shootStatus').addEventListener('change', (e) => {
    const newValue = e.target.value;
    const oldValue = ed.previousStatusValue;
    ed.previousStatusValue = newValue;
    // The same note applyStatusChange makes: going Postponed/Canceled marks
    // the date on the page right now as the plan that fell through.
    ed.currentOffScheduleDate = ed.isOffScheduleShoot({ status: newValue })
      ? document.getElementById('shootDate').value
      : undefined;

    // Nothing is cleared on the way: a Postponed (key: rescheduled) or
    // Canceled shoot keeps its date and times (lists show them as the
    // original plan, see isOffScheduleShoot), and stepping back from
    // Captured only hides the Reflection — its answers are kept, and come
    // back with the status. The form-level change listener saves it all.
    if (!ed.isPostCaptureStatus(newValue)) {
      document.getElementById('postShootContent').hidden = true;
      ed.updateShootModalJumpMenuVisibility();
    }
    ed.runStatusFollowUps(ed.currentShootId, oldValue, newValue);

    const isArchived = !document.getElementById('unarchiveShootBtn').hidden;
    document.getElementById('completeShootBtn').hidden = !ed.editingShootId || isArchived || document.getElementById('shootStatus').value !== 'delivered';
    ed.updateMoodboardCompleteVisibility();
    ed.updateStatusSwatchDisplay();
    updateEnterShootModeBtnVisibility();
  });
};
