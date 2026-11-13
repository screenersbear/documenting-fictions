// After an export: ask, then double-check, then delete.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfAfterExport = function addPdfAfterExport(ed) {
  Object.assign(ed, { askExportArchiveSaved, openExportDeleteAsk });
  // ---- Post-export delete flow: ask, then double-confirm, then delete ----
  let exportPendingDeleteShoots = [];
  // The shoots of an archive showing in the in-app PDF preview (no Web
  // Share), until that preview is closed and askExportArchiveSaved runs.
  ed.exportArchiveAwaitingSave = null;

  // Only offers the clean-up once the user says the PDF made it somewhere
  // safe — answering "Not saved" leaves every shoot where it is.
  function askExportArchiveSaved() {
    const shoots = ed.exportArchiveAwaitingSave;
    ed.exportArchiveAwaitingSave = null;
    ed.askConfirm({
      title: 'Did it save?',
      text: 'Only remove shoots from the app once the PDF archive is saved somewhere you can find it, like Files.',
      cancelLabel: 'Not saved',
      confirmLabel: 'It saved',
    }).then(saved => { if (saved) openExportDeleteAsk(shoots); });
  }

  function openExportDeleteAsk(shoots) {
    exportPendingDeleteShoots = shoots;
    document.getElementById('exportDeleteAskCount').textContent = `${shoots.length} shoot${shoots.length === 1 ? '' : 's'}`;
    document.getElementById('exportDeleteAskOverlay').hidden = false;
  }

  document.getElementById('exportDeleteAskNoBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteAskOverlay').hidden = true;
    exportPendingDeleteShoots = [];
  });

  document.getElementById('exportDeleteAskOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportDeleteAskOverlay')) {
      document.getElementById('exportDeleteAskOverlay').hidden = true;
      exportPendingDeleteShoots = [];
    }
  });

  const exportDeleteConfirmModal = document.getElementById('exportDeleteConfirmModal');
  const exportDeleteConfirmTitle = document.getElementById('exportDeleteConfirmTitle');
  const exportDeleteConfirmText = document.getElementById('exportDeleteConfirmText');
  const exportDeleteConfirmActions = document.getElementById('exportDeleteConfirmActions');
  const exportDeleteConfirmOkBtn = document.getElementById('exportDeleteConfirmOkBtn');

  document.getElementById('exportDeleteAskYesBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteAskOverlay').hidden = true;
    const n = exportPendingDeleteShoots.length;
    exportDeleteConfirmModal.classList.add('danger-state');
    exportDeleteConfirmTitle.textContent = 'Delete these shoots for good?';
    exportDeleteConfirmText.textContent = `This permanently removes ${n} shoot${n === 1 ? '' : 's'} and every photo attached to ${n === 1 ? 'it' : 'them'}: cover photos, talent photos, mood boards, and final images. They're in the PDF you just exported, but this app copy of them can't be recovered once deleted.`;
    exportDeleteConfirmActions.hidden = false;
    exportDeleteConfirmOkBtn.hidden = true;
    document.getElementById('exportDeleteConfirmOverlay').hidden = false;
  });

  document.getElementById('exportDeleteConfirmCancelBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteConfirmOverlay').hidden = true;
    exportPendingDeleteShoots = [];
  });

  document.getElementById('exportDeleteConfirmYesBtn').addEventListener('click', () => {
    const shoots = exportPendingDeleteShoots;
    shoots.forEach(s => ed.deleteShootById(s.id));
    ed.renderAll();
    exportDeleteConfirmModal.classList.remove('danger-state');
    exportDeleteConfirmTitle.textContent = 'Shoots deleted.';
    exportDeleteConfirmText.textContent = 'Your archive PDF still has everything. Good luck out there!';
    exportDeleteConfirmActions.hidden = true;
    exportDeleteConfirmOkBtn.hidden = false;
    exportPendingDeleteShoots = [];
  });

  exportDeleteConfirmOkBtn.addEventListener('click', () => {
    document.getElementById('exportDeleteConfirmOverlay').hidden = true;
  });

  document.getElementById('completeShootBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = false;
  });

  document.getElementById('completeShootPromptCancelBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = true;
  });

  document.getElementById('completeShootPromptConfirmBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = true;
    clearTimeout(ed.shootSaveTimer);
    const data = ed.gatherShootFormData();
    data.archived = true;
    const idx = ed.state.shoots.findIndex(x => x.id === ed.currentShootId);
    let shoot;
    if (idx === -1) {
      shoot = { id: ed.currentShootId, ...data };
      ed.state.shoots.push(shoot);
    } else {
      shoot = { ...ed.state.shoots[idx], ...data };
      ed.state.shoots[idx] = shoot;
    }
    ed.saveState();
    if (!ed.shootModalOverlay.hidden) ed.unlockBodyScroll();
    ed.shootModalOverlay.hidden = true;
    ed.editingShootId = null;
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
    ed.showToast('You did it! Revisit this shoot in your archive.');
  });

  document.getElementById('unarchiveShootBtn').addEventListener('click', () => {
    clearTimeout(ed.shootSaveTimer);
    const data = ed.gatherShootFormData();
    data.archived = false;
    const idx = ed.state.shoots.findIndex(x => x.id === ed.currentShootId);
    if (idx !== -1) ed.state.shoots[idx] = { ...ed.state.shoots[idx], ...data };
    ed.saveState();
    if (!ed.shootModalOverlay.hidden) ed.unlockBodyScroll();
    ed.shootModalOverlay.hidden = true;
    ed.editingShootId = null;
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  });

  document.getElementById('addShootBtn').addEventListener('click', () => ed.openShootModal(null));
};
