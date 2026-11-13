// Shoot mode: the mood board, going in and coming out.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootMode = function addShootMode(ed) {
  Object.assign(ed, { renderShootModeMoodboard, openShootMode, exitShootMode });
  let shootModeBoardDraw = 0; // the latest drawing of the mood board wins
  let shootModeBoardUrls = []; // its Ref board pages, let go of when it's drawn again
  function renderShootModeMoodboard(shoot) {
    const term = ed.moodboardTerm(shoot.category);
    document.getElementById('shootModeMoodboardHeading').textContent = term;
    document.getElementById('shootModeMoodEmpty').textContent = `No ${term.toLowerCase()} images for this shoot.`;
    const grid = document.getElementById('shootModeMoodboard');
    // Another shoot's photos go at once; this one's stay up until the new
    // set is ready, then the two swap in one go (no in-between layout).
    if (grid.dataset.shoot !== shoot.id) grid.innerHTML = '';
    grid.dataset.shoot = shoot.id;
    const draw = ++shootModeBoardDraw;
    ed.shootModeBoardIn = false;
    const urls = [];
    return Promise.all([ed.idbGetImages(shoot.id), ed.refApi ? ed.refBoardsFor(shoot.id, urls).catch(() => []) : []]).then(([images, boards]) => {
      // The shoot's own photos, then the pages of any boards from Ref (each
      // opening its own board's pages, read only).
      const tiles = images.map((img, idx) => ({ src: img.src, open: () => ed.openImageViewer(images, idx, shoot.id, () => renderShootModeMoodboard(shoot), false) }));
      boards.forEach(b => b.pages.forEach((src, i) => tiles.push({ src, open: () => ed.openImageViewer(b.pages.map(u => ({ src: u, caption: '' })), i, null, null, false) })));
      // A grid per row of three, so a page can break between rows.
      const rows = [];
      let row = null;
      tiles.forEach((tile, idx) => {
        if (idx % 3 === 0) {
          row = document.createElement('div');
          row.className = 'moodboard-grid shoot-mode-moodboard-row';
          rows.push(row);
        }
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${tile.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', tile.open);
        row.appendChild(thumb);
      });
      // Their shapes are wanted to size them to fill the board's page.
      const imgs = rows.flatMap(r => [...r.querySelectorAll('img')]);
      return Promise.all(imgs.map(img => (img.decode ? img.decode().catch(() => {}) : null))).then(() => {
        if (draw !== shootModeBoardDraw) { urls.forEach(u => URL.revokeObjectURL(u)); return; }
        shootModeBoardUrls.forEach(u => URL.revokeObjectURL(u));
        shootModeBoardUrls = urls;
        document.getElementById('shootModeMoodEmpty').hidden = tiles.length !== 0;
        grid.replaceChildren(...rows);
        ed.shootModeBoardIn = true;
        ed.breakShootModePages();
        ed.shootModeWanted = null;
      });
    }).catch(() => {
      if (draw !== shootModeBoardDraw) return;
      grid.innerHTML = '';
      document.getElementById('shootModeMoodEmpty').hidden = false;
      ed.shootModeBoardIn = true;
      ed.breakShootModePages();
      ed.shootModeWanted = null;
    });
  }

  function openShootMode(shootId) {
    // Close (and thus autosave) the edit form BEFORE looking the shoot up —
    // autosaveShoot() replaces state.shoots[idx] with a new merged object
    // rather than mutating it in place, so a reference grabbed beforehand
    // would be left pointing at a detached, stale copy. Every edit made in
    // shoot mode writes straight through this reference, so it has to be
    // the live one or ticks/edits made here would silently not persist.
    if (!ed.shootModalOverlay.hidden) ed.closeShootModal();
    const shoot = ed.state.shoots.find(s => s.id === shootId);
    if (!shoot) { ed.setShootModeShootId(null); return false; }
    ed.setShootModeShootId(shootId);
    document.getElementById('shootModeTitle').textContent = ed.shootDisplayName(shoot);
    ed.renderShootModeShots(shoot);
    renderShootModeMoodboard(shoot);
    document.getElementById('shootModeShootingNotes').value = shoot.shootingNotes || '';
    ed.showShootModeLastTime(shoot);
    ed.startShootModeClock();
    ed.shootModeOverlay.hidden = false;
    // renderShootModeShots() ran while shootModeOverlay was still hidden, so
    // every row measured zero height and kept its one-line default — same
    // trap as openShootModal, same fix: re-size once there's real layout
    // (breakShootModePages sizes them before it cuts the pages).
    ed.breakShootModePages({ at: 0, force: true });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ed.breakShootModePages({ force: true });
      });
    });
    return true;
  }

  function exitShootMode() {
    ed.setShootModeShootId(null);
    ed.stopShootModeClock();
    ed.shootCoordsAsked = false;
    ed.clearTurn(ed.shootModeOverlay.querySelector('.nb-turn-layer'));
    ed.shootModeFlows = null;
    ed.shootModeWanted = null;
    ed.shootModeShowDue = null;
    ed.shootModeOverlay.hidden = true;
  }
};
