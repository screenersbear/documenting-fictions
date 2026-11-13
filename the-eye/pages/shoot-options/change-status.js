// Changing a shoot's status.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptionsChangeStatus = function addShootOptionsChangeStatus(ed) {
  Object.assign(ed, { applyStatusChange });
  // ---------- Change status (kebab menu slide-over) ----------
  // Filtered by the shoot's category — video swaps Waiting for selects/
  // Editing for Rough cut/Client review/Revisions.
  function renderStatusOptionsList(s) {
    const currentStatus = s ? (s.status || 'prospect') : 'prospect';
    const list = document.getElementById('statusOptionsList');
    list.innerHTML = ed.statusOptionKeys(s ? s.category : '', currentStatus).map(key => `
      <button type="button" class="options-item choice-item${key === currentStatus ? ' active' : ''}" data-status="${ed.escapeHtml(key)}">${ed.escapeHtml(ed.STATUS_LABELS[key] || key)}</button>
    `).join('');
  }

  // The one way a status changes from outside the shoot page — a row's ⋮ >
  // Change status, "Done shooting", the next-day check-in — writing straight
  // to the saved shoot. applyStatusTimestamps stamps capturedAt/editingAt
  // (the reflection and editing reminders run off those), and nothing else
  // on the shoot is touched: a reflection is only hidden while the shoot's
  // back before Captured, and a postponed/canceled shoot keeps its date and
  // times (see isOffScheduleShoot), only noting which date that was (see
  // isOriginalPlanDate). Then the same follow-up prompts as the
  // page's status button (runStatusFollowUps), unless the caller passes
  // { followUps: false } to ask them itself, or not at all. Returns the
  // status the shoot had before, or null when there's no such shoot.
  function applyStatusChange(shootId, newStatus, opts) {
    const idx = ed.state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return null;
    const shoot = { ...ed.state.shoots[idx] };
    const oldStatus = shoot.status || 'prospect';
    shoot.status = newStatus;
    ed.applyStatusTimestamps(shoot, oldStatus, newStatus);
    // Postponed/Canceled picked here means the date the shoot has right now
    // is the plan that fell through (see isOriginalPlanDate) — even when it
    // was Postponed already: the check-in asks about a new date once it's
    // passed, and answering Postponed again has to settle that one too.
    if (ed.isOffScheduleShoot(shoot)) shoot.offScheduleDate = shoot.date || '';
    else delete shoot.offScheduleDate;
    ed.state.shoots[idx] = shoot;
    ed.saveState();
    ed.renderAll();
    // A stat box popup left open underneath would otherwise keep listing a
    // shoot that no longer belongs in it.
    ed.refreshOpenStatBoxDetail();
    if (!opts || opts.followUps !== false) ed.runStatusFollowUps(shootId, oldStatus, newStatus);
    return oldStatus;
  }

  document.getElementById('changeStatusOptionBtn').addEventListener('click', () => {
    const s = ed.state.shoots.find(x => x.id === ed.optionsShootId);
    renderStatusOptionsList(s);
    ed.shootOptionsPaneTrack.classList.add('show-second');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
  });

  document.getElementById('statusOptionsBackBtn').addEventListener('click', () => {
    ed.shootOptionsPaneTrack.classList.remove('show-second');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
  });

  document.getElementById('statusOptionsList').addEventListener('click', (e) => {
    const btn = e.target.closest('.options-item');
    if (!btn) return;
    const id = ed.optionsShootId;
    const newStatus = btn.dataset.status;
    ed.closeShootOptions();
    if (id) applyStatusChange(id, newStatus);
  });

  document.getElementById('shareShootOptionBtn').addEventListener('click', () => {
    const id = ed.optionsShootId;
    ed.closeShootOptions();
    if (id) ed.openPdfSectionsModal(id);
  });

  document.getElementById('archiveShootOptionBtn').addEventListener('click', () => {
    const id = ed.optionsShootId;
    ed.closeShootOptions();
    if (!id) return;
    const idx = ed.state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    ed.state.shoots[idx] = { ...ed.state.shoots[idx], archived: !ed.state.shoots[idx].archived };
    ed.saveState();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  });

  document.getElementById('deleteShootOptionBtn').addEventListener('click', async () => {
    const id = ed.optionsShootId;
    ed.closeShootOptions();
    if (!id) return;
    if (!(await ed.askDeleteShoot())) return;
    if (id === ed.currentShootId && !ed.shootModalOverlay.hidden) {
      clearTimeout(ed.shootSaveTimer);
      ed.unlockBodyScroll();
      ed.shootModalOverlay.hidden = true;
      ed.editingShootId = null;
    }
    ed.deleteShootById(id);
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  });
};
