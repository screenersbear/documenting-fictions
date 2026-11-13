// Where you left off: remembered, and opened again next time.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addLastPlace = function addLastPlace(ed) {
  Object.assign(ed, { readLastPlace, saveLastPlace, queueLastPlace });
  // ---------- Where you left off ----------
  // iOS closes a home-screen app whenever it likes, so the place is kept in
  // localStorage: the book shut or open, the section and its pages, an open
  // shoot and its page, Archive mode and its page, and the filters. Read once
  // at launch (setupNotebook); written a moment after each page change, and
  // straight away when the app goes to the background. Nothing is written
  // until the launch has put the last place back.
  const LAST_PLACE_KEY = 'df_last_place';
  let lastPlaceTimer = 0;
  ed.lastPlaceArmed = false;
  ed.resumePlace = null;
  function readLastPlace() {
    try {
      const place = JSON.parse(localStorage.getItem(LAST_PLACE_KEY) || 'null');
      return place && typeof place === 'object' ? place : null;
    } catch (e) { return null; }
  }
  function saveLastPlace() {
    clearTimeout(lastPlaceTimer);
    if (!ed.lastPlaceArmed) return;
    try {
      const shootOpen = !ed.shootModalOverlay.hidden && ed.currentShootId;
      localStorage.setItem(LAST_PLACE_KEY, JSON.stringify({
        book: document.getElementById('bookOverlay').hidden ? 'open' : 'shut',
        view: ed.currentScreen(),
        pages: ed.screenAt,
        scrollY: ed.bodyScrollLockCount > 0 ? ed.bodyScrollLockY : window.scrollY,
        archiveFilter: ed.archiveFilter,
        journalFilter: ed.journalFilter,
        statsYearFilter: ed.statsYearFilter,
        shoot: shootOpen ? { id: ed.currentShootId, page: ed.shootOnFront ? { id: 'front', sub: 0 } : { id: ed.shootPageId, sub: ed.shootSub } } : null,
        shootMode: !ed.shootModeOverlay.hidden && ed.getShootModeShootId() ? { id: ed.getShootModeShootId(), at: ed.shootModeAt } : null,
      }));
    } catch (e) { /* storage unavailable: it just opens where the sun menu's fallback says */ }
  }
  function queueLastPlace() {
    if (!ed.lastPlaceArmed) return;
    clearTimeout(lastPlaceTimer);
    lastPlaceTimer = setTimeout(saveLastPlace, 500);
  }
};
