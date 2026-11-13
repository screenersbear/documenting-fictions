// Closing a shoot, and deleting one.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootClose = function addShootClose(ed) {
  Object.assign(ed, { closeShootModal, deleteShootById, askDeleteShoot, syncPaneTrackHeight });
  function closeShootModal() {
    // First: every borrowed field goes home (with its readonly back) before
    // the scroll position is recorded and the draft saved or discarded.
    ed.endShootWizard({ closing: true });
    clearTimeout(ed.shootSaveTimer);
    ed.autosaveShoot();
    if (!ed.state.shoots.some(x => x.id === ed.currentShootId)) {
      ed.dropRefBoardsFor(ed.currentShootId);
      ed.idbDeleteImages(ed.currentShootId).catch(() => {});
      ed.idbDeleteImages(ed.finalImagesKey(ed.currentShootId)).catch(() => {});
      // Abandoned blank shoot — drop any photo rows it managed to create too.
      ed.idbDeleteImages(ed.projectPhotoKey(ed.currentShootId)).catch(() => {});
      ed.currentTalents.forEach(t => {
        if (t.id) ed.idbDeleteImages(ed.talentPhotoKey(ed.currentShootId, t.id)).catch(() => {});
      });
    }
    if (!ed.shootModalOverlay.hidden) ed.unlockBodyScroll();
    ed.shootModalOverlay.hidden = true;
    ed.editingShootId = null;
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  }

  document.getElementById('saveShootBtn').addEventListener('click', closeShootModal);

  function deleteShootById(id) {
    const doomed = ed.state.shoots.find(x => x.id === id);
    ed.state.shoots = ed.state.shoots.filter(x => x.id !== id);
    ed.state.journalEntries = ed.state.journalEntries.filter(e => e.sourceShootId !== id);
    // A project is only its shoots, so one whose last shoot this was goes too.
    ed.pruneEmptyProjects();
    ed.idbDeleteImages(id).catch(() => {});
    ed.idbDeleteImages(ed.finalImagesKey(id)).catch(() => {});
    ed.dropRefBoardsFor(id);
    // Cover + per-talent photos live under their own keys, so they need
    // explicit cleanup or they'd linger as orphaned rows.
    if (doomed) ed.shootPhotoKeys(doomed).forEach(k => ed.idbDeleteImages(k).catch(() => {}));
    ed.saveState();
  }

  // The page's Delete shoot and the ⋮ menu's ask the same thing.
  function askDeleteShoot() {
    return ed.askConfirm({ title: 'Delete this shoot?', text: "This can't be undone.", confirmLabel: 'Delete shoot', cancelLabel: 'Keep it', danger: true });
  }

  document.getElementById('deleteShootBtn').addEventListener('click', async () => {
    const id = ed.currentShootId;
    // Only if the page is still on that shoot — it should be, with the
    // popup sitting over it.
    if (!(await askDeleteShoot()) || ed.currentShootId !== id || ed.shootModalOverlay.hidden) return;
    clearTimeout(ed.shootSaveTimer);
    deleteShootById(id);
    if (!ed.shootModalOverlay.hidden) ed.unlockBodyScroll();
    ed.shootModalOverlay.hidden = true;
    ed.editingShootId = null;
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  });

  document.getElementById('shareShootBtn').addEventListener('click', () => {
    // buildShootPdf reads from state.shoots, not the live form fields — so
    // an edit still sitting in the 2s autosave debounce (e.g. just closed
    // the expand-field editor for Directions for talent/team, then tapped
    // Share right away) would otherwise get left out of the PDF.
    ed.saveShootNow();
    if (ed.editingShootId) ed.openPdfSectionsModal(ed.editingShootId);
  });

  // A pane track (kebab-menu slide-over, app menu) is a horizontal row of
  // same-width panes moved via transform, one shown at a time — as a flex
  // row its own height still auto-sizes to the TALLEST pane regardless of
  // which one is actually showing, so switching to a shorter pane (e.g. the
  // theme picker vs the full app menu list) left blank space below its
  // content, same underlying issue as the Stats carousel. Call this after
  // every classList change that shows a different pane.
  function syncPaneTrackHeight(track) {
    const panes = [...track.children].filter(el => el.classList.contains('options-pane'));
    let idx = 0;
    if (track.classList.contains('show-fifth')) idx = 4;
    else if (track.classList.contains('show-fourth')) idx = 3;
    else if (track.classList.contains('show-third')) idx = 2;
    else if (track.classList.contains('show-second')) idx = 1;
    const active = panes[idx];
    if (active) track.style.height = active.offsetHeight + 'px';
  }
};
