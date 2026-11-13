// Changing a shoot's title.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptionsChangeTitle = function addShootOptionsChangeTitle(ed) {
  // ---------- Change shoot title (kebab menu slide-over) ----------
  document.getElementById('changeTitleOptionBtn').addEventListener('click', () => {
    const s = ed.state.shoots.find(x => x.id === ed.optionsShootId);
    const input = document.getElementById('shootTitleRenameInput');
    input.value = s ? (s.title || '') : '';
    ed.shootOptionsPaneTrack.classList.add('show-third');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
    ed.focusPaneInput(input);
  });

  document.getElementById('titleOptionsBackBtn').addEventListener('click', () => {
    ed.shootOptionsPaneTrack.classList.remove('show-third');
    ed.syncPaneTrackHeight(ed.shootOptionsPaneTrack);
  });

  function saveTitleOption() {
    const id = ed.optionsShootId;
    const newTitle = document.getElementById('shootTitleRenameInput').value.trim();
    ed.closeShootOptions();
    if (!id) return;
    const idx = ed.state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    ed.state.shoots[idx] = { ...ed.state.shoots[idx], title: newTitle };
    ed.saveState();
    ed.renderAll();
  }

  document.getElementById('saveTitleOptionBtn').addEventListener('click', saveTitleOption);

  document.getElementById('shootTitleRenameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTitleOption();
  });
};
