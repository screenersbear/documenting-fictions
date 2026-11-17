// Shoot mode is one page that scrolls (round 7, 17 Nov; it was three pages
// turned with a swipe). The header stays pinned at the top: the shoot's
// name, time left and the wrap time, golden hour and the must-haves to go.
// Under it, in order: last time, Quick review, the shot list, the mood
// board (Ref's pages too) and the shooting notes.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModePage = function addShootModePage(ed) {
  Object.assign(ed, { layoutShootMode });
  const page = ed.shootModeOverlay.querySelector('.shoot-mode-modal');
  ed.shootModeBoardIn = false; // the mood board's photos are in
  ed.shootModeWantedTop = null; // where to scroll back to once they are (components/offline.js)

  // The writing sized to fit, then: back to `top`, to where it was left
  // once the photos are in, and to `show` (a new shot row, the newest photo).
  function layoutShootMode(opts = {}) {
    if (ed.shootModeOverlay.hidden) return;
    page.querySelectorAll('.shot-text').forEach(ed.autoSizeTextarea);
    ed.autoSizeTextarea(document.getElementById('shootModeShootingNotes'));
    if (Number.isFinite(opts.top)) page.scrollTop = opts.top;
    if (ed.shootModeBoardIn && ed.shootModeWantedTop !== null) {
      page.scrollTop = ed.shootModeWantedTop;
      ed.shootModeWantedTop = null;
    }
    if (opts.show && opts.show.scrollIntoView) opts.show.scrollIntoView({ block: 'nearest' });
  }
  // Where it's scrolled to is kept, so it opens there again (components/last-place.js).
  page.addEventListener('scroll', () => ed.queueLastPlace(), { passive: true });
};
