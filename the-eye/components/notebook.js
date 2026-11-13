// The notebook.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNotebook = function addNotebook(ed) {
  // ---------- The notebook ----------
  // The shut book. Tapped, it opens and zooms into Overview; a tab on its
  // side opens it further in, at that section's title page, and zooms in
  // there. Stays how it was left: shut until opened, then straight in on
  // later launches until it's shut again.
  (function setupNotebook() {
  const notebook = {  }; // what the parts of setupNotebook share
  Object.assign(notebook, { settleScreenGap });
    const BOOK_KEY = 'df-book'; notebook.BOOK_KEY = BOOK_KEY;
    const RATIO = 1000 / 1360; notebook.RATIO = RATIO; // the cover art's width over its height
    const STACK = 16; notebook.STACK = STACK;          // sheets drawn for the shut book's thickness
    const TURNED = (20 * Math.PI) / 180; notebook.TURNED = TURNED; // the shut book's turn; matches styles/notebook-shut.css
    const PERSPECTIVE = 1100; notebook.PERSPECTIVE = PERSPECTIVE;  // matches .nb in styles/notebook-shut.css
    const TAB_OUT = 0.06; notebook.TAB_OUT = TAB_OUT;      // how far the side tabs stick out, of the book's width
    const OPEN_MS = 900; notebook.OPEN_MS = OPEN_MS;       // the cover swinging open, and a moment on the spread
    const SECTION_MS = 1250; notebook.SECTION_MS = SECTION_MS;   // the same, and long enough to read a section's title
    const ZOOM_MS = 780; notebook.ZOOM_MS = ZOOM_MS;
    const overlay = document.getElementById('bookOverlay'); notebook.overlay = overlay;
    const book = document.getElementById('book'); notebook.book = book;
    const spinEl = document.getElementById('bookSpin'); notebook.spinEl = spinEl;
    notebook.timer = 0;

    // Turning the shut book by hand, the way Callback's head turns: sideways
    // spins it, up and down tips it, harder the further it goes, and it turns
    // back when let go.
    const SPIN_TO_PAGES = 1.0;  // radians towards the page edges
    const SPIN_TO_SPINE = 1.55; // and towards the spine: it rests turned the other way
    const TILT_UP = 0.42;
    const TILT_DOWN = 0.5;
    const soften = (raw, limit) => limit * Math.tanh(raw / limit); notebook.soften = soften;
    const unsoften = (value, limit) => limit * Math.atanh(Math.max(-0.999, Math.min(0.999, value / limit))); notebook.unsoften = unsoften;
    const spinLimit = value => (value < 0 ? SPIN_TO_PAGES : SPIN_TO_SPINE); notebook.spinLimit = spinLimit;
    const tiltLimit = value => (value > 0 ? TILT_UP : TILT_DOWN); notebook.tiltLimit = tiltLimit;
    notebook.spin = 0;
    notebook.spinV = 0;
    notebook.spinGoal = 0;
    notebook.tilt = 0;
    notebook.tiltV = 0;
    notebook.tiltGoal = 0;
    notebook.turn = null;
    notebook.turnedAt = 0;
    notebook.turnFrame = 0;
    notebook.turnClock = 0;
  window.EyeParts.addBookSpin(ed, notebook);
  window.EyeParts.addBookOpen(ed, notebook);

    document.documentElement.dataset.view = (document.querySelector('.tabbar .tab.active') || { dataset: { view: 'overview' } }).dataset.view;
    ed.syncPageSide();
    ed.repaginate(ed.currentScreen());
    // The handwriting arrives after the first draw, and it's a different width.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { ed.repaginate(ed.currentScreen()); ed.breakShootPages(); ed.breakShootModePages(); });
    let pagesWidth = window.innerWidth;
    function placeBook() {
      if (overlay.hidden) return;
      notebook.measure();
      if (book.classList.contains('closed')) notebook.placeTabHits();
    }
    function breakAllPages() {
      ed.repaginate(ed.currentScreen());
      ed.breakShootPages();
      ed.breakArchivePages();
      ed.breakShootModePages();
    }
    // A nudge is under way (nudgeShortScreen): what iOS says in the middle of
    // one isn't kept, only what it says once it's done.
    notebook.nudging = false;
    window.addEventListener('resize', () => {
      const gapMoved = !notebook.nudging && ed.measureScreenGap();
      placeBook();
      if (window.innerWidth === pagesWidth && !gapMoved) return;
      pagesWidth = window.innerWidth;
      breakAllPages();
    });
    function settleScreenGap() {
      if (notebook.nudging || !ed.measureScreenGap()) return false;
      placeBook();
      breakAllPages();
      return true;
    }
  window.EyeParts.addBookNudge(ed, notebook);
    let saved = null;
    let afterUpdate = false;
    try {
      saved = localStorage.getItem(BOOK_KEY);
      afterUpdate = sessionStorage.getItem('df_update_reload_tab') !== null;
    } catch (err) { /* treated as shut */ }
    // A new version swapped in mid-use carries on where it was. Any other
    // launch starts where the sun menu says: by default where you left off
    // (before there's a record of that, the book as it was left).
    const place = ed.readLastPlace();
    const resuming = !afterUpdate && ed.state.presentation.start === 'last';
    // Inside Documenting Fictions the notebook comes from the shelf already
    // open (shut only to show its Options, from the shelf's button), at the
    // tab picked there or else where the sun menu says.
    const suite = window.DF_SUITE;
    const suiteAt = suite && notebook.SCREENS.some(sc => sc.view === suite.at) ? suite.at : null;
    const startShut = suite ? false
      : afterUpdate ? saved !== 'open'
      : resuming ? (place && (place.book === 'shut' || place.book === 'open') ? place.book === 'shut' : saved !== 'open')
      : ed.state.presentation.start !== 'first';
    // A link to one shoot (?shoot=<id>, from an Overthoughts entry about it) opens it.
    const atShoot = suite && suite.get ? ed.state.shoots.find(x => x.id === suite.get('shoot')) : null;
    // Ref's + New shoot from this board (?newShootFromBoard=<link id>).
    const fromBoard = suite && suite.get ? suite.get('newShootFromBoard') : null;
    ed.resumePlace = resuming && !startShut && !suiteAt && !atShoot && !fromBoard && place ? place : null;
    if (startShut) notebook.show('closed');
    if (suiteAt) document.querySelector(`.tabbar .tab[data-view="${suiteAt}"]`).click();
    if (atShoot) setTimeout(() => ed.openShootModal(atShoot.id), 120);
    else if (fromBoard) setTimeout(() => ed.openShootFromBoard(fromBoard), 120);
    notebook.remember(startShut ? 'shut' : 'open');
    if (suite && suite.firstVisit) setTimeout(() => ed.eyeWelcome(ed.launchPopups), 400);
  })();
};
