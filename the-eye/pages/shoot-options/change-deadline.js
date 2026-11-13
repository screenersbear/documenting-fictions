// Changing a shoot's deadline.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptionsChangeDeadline = function addShootOptionsChangeDeadline(ed) {
  // ---------- Change deadline (kebab menu slide-over) ----------
  document.getElementById('changeDeadlineOptionBtn').addEventListener('click', () => {
    const s = ed.state.shoots.find(x => x.id === ed.optionsShootId);
    const input = document.getElementById('shootDeadlineRenameInput');
    input.value = s ? (s.deadline || '') : '';
    ed.shootOptionsPaneTrack.classList.add('show-fifth');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
    ed.focusPaneInput(input);
  });

  document.getElementById('deadlineOptionsBackBtn').addEventListener('click', () => {
    ed.shootOptionsPaneTrack.classList.remove('show-fifth');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
  });

  function saveDeadlineOption() {
    const id = ed.optionsShootId;
    const newDeadline = document.getElementById('shootDeadlineRenameInput').value;
    ed.closeShootOptions();
    if (!id) return;
    const idx = ed.state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    ed.state.shoots[idx] = { ...ed.state.shoots[idx], deadline: newDeadline };
    ed.saveState();
    ed.renderAll();
  }

  document.getElementById('saveDeadlineOptionBtn').addEventListener('click', saveDeadlineOption);
};
