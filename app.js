// Documenting Fictions: the shelf. Four notebooks on a turntable, each one its
// own app in its own folder. Swipe (or tap a book behind) to bring one round;
// tap the one in front and its cover swings open and its page grows to fill
// the screen, then that notebook takes over. Shutting a notebook comes back
// here (?from=<folder>) and the same thing plays backwards.
(function () {
  'use strict';
  const ed = {}; // what the shelf's parts share (the files it runs below)
  Object.assign(ed, { size });

  // The seven colours (components/colors.js) and the four notebooks (components/books.js).
  const COLORS = window.ShelfColors; ed.COLORS = COLORS;
  const BOOKS = window.ShelfBooks; ed.BOOKS = BOOKS;
  // A first page's picture for --block, as a whole address: a url() in a
  // --property is read from the stylesheet that uses it (in styles/), not
  // from this page.
  const artUrl = (path) => `url("${new URL(path, document.baseURI).href}")`;
  const N = BOOKS.length; ed.N = N;
  // The turntable: how wide and deep the ring is (of a book's width W), and how
  // far up the books further round sit. Wider than the first shelf (0.95, 1.9,
  // 0.22) so the books have room between them.
  const SIZE = 0.43, MAX_W = 240;
  const RING_X = 1.1, RING_Z = 2.9, LIFT = 0.34; ed.RING_X = RING_X; ed.RING_Z = RING_Z; ed.LIFT = LIFT;
  // The camera looks down on the ring a little (degrees), so you see over the
  // front book to the ones behind it. A book turned to face you (opening or
  // shutting) stands up straight again, so its page still fills the screen.
  const TILT = 10; ed.TILT = TILT;
  const STEP = 360 / N; ed.STEP = STEP;
  // Four ways to stand the books, swapped with a swipe up or down on them
  // (user, 11-12): the ring; dominoes (the front book low on the left, each
  // one behind it a little further up and to the right, all at one angle);
  // a row facing the screen, swiped through side to side; and Spread (round
  // 2): big and overlapping, lying back like covers spread on a table, the
  // one in front on top. The last one used is kept.
  const LAYOUTS = ['ring', 'dominoes', 'row', 'spread']; ed.LAYOUTS = LAYOUTS;
  // Spread, from the top book down, on a 390 x 844 screen (larger screens
  // keep its shape in the middle): [middle x, middle y, width, turn degrees].
  const SPREAD = [[0.254, 0.671, 0.692, -4], [0.823, 0.697, 0.641, 5], [0.167, 0.296, 0.692, -3], [0.808, 0.315, 0.641, 4]]; ed.SPREAD = SPREAD;
  const SPREAD_TILT = 16; ed.SPREAD_TILT = SPREAD_TILT; // each lies back this far (degrees)
  const RECENT_KEY = 'df-suite-recent'; ed.RECENT_KEY = RECENT_KEY; // the notebooks in front last, newest first (Spread's order)
  const LAYOUT_KEY = 'df-suite-layout'; ed.LAYOUT_KEY = LAYOUT_KEY;
  const DOM = { x0: -0.55, up: 0.1, dx: 0.4, dy: 0.32, dz: 0.55, yaw: -22 }; ed.DOM = DOM; // of W, per book behind the front one (up: the whole line, a little higher than the ring)
  const ROW_GAP = 1.22; ed.ROW_GAP = ROW_GAP; // of W, from one book to the next in the row
  const DRAG = { ring: 1.15, dominoes: 1.05, row: ROW_GAP, spread: 1.2 }; ed.DRAG = DRAG; // a finger this far (of W) moves the books one along
  const RESHAPE_MS = 620; ed.RESHAPE_MS = RESHAPE_MS;
  const OPEN_MS = 900, ZOOM_MS = 760, TURN_MS = 420; ed.OPEN_MS = OPEN_MS; ed.ZOOM_MS = ZOOM_MS; ed.TURN_MS = TURN_MS;
  const OVER = 12; ed.OVER = OVER; // how far the page's white goes past every edge of the screen once it has grown
  const FRONT_KEY = 'df-suite-front'; ed.FRONT_KEY = FRONT_KEY;

  const shelf = document.getElementById('shelf'); ed.shelf = shelf;
  const stage = document.getElementById('stage'); ed.stage = stage;
  const bar = document.getElementById('shelfBar');
  // Installed on an iPhone, iOS can open the page a status bar short at the
  // bottom and put it right a moment later (see fitScreen below). The books
  // are placed from the real screen, known from the first moment, so they
  // don't jump when it does.
  const root = document.documentElement; ed.root = root;
  const iPhoneApp = /iPhone|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches); ed.iPhoneApp = iPhoneApp;
  const screenH = () => {
    if (!iPhoneApp) return window.innerHeight;
    return Math.abs(window.innerWidth - screen.width) < 2 ? screen.height : screen.width;
  };
  ed.optionsBtn = document.getElementById('optionsBtn');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: nothing kept */ } },
  }; ed.store = store;
  const colorOf = (b) => { const c = store.get(b.key); return c && Object.prototype.hasOwnProperty.call(COLORS, c) ? c : b.color; }; ed.colorOf = colorOf;

  // ---------- Building the books ----------
  // A book's colour: its cover (--c), what's drawn on it (--p), its light
  // tabs (--c25) and its first page.
  function paint(i) {
    const b = BOOKS[i], c = colorOf(b), s = slots[i];
    s.style.setProperty('--c', COLORS[c].band);
    s.style.setProperty('--p', COLORS[c].partner);
    s.style.setProperty('--c25', COLORS[c].light);
    s.style.setProperty('--block', artUrl(b.block(c)));
  }
  ed.paint = paint;
  const slots = BOOKS.map((b, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.i = i;
    slot.style.setProperty('--d', `${-1.7 * i}s`);
    const tabs = b.tabs.map(([label, top, h, w, z, light, at]) =>
      `<div class="tab${light ? ' light' : ''}" data-at="${at}" style="top:${top}%;height:${h}%;width:calc(var(--W) * ${w});transform:translateZ(calc(var(--T) * ${z}))"><span>${label}</span></div>`).join('');
    // The cover: flat colour with grain, the notebook's mark big in the
    // middle, its name near the foot, and any stickers.
    slot.innerHTML = `<div class="ground"></div><div class="float"><div class="book">
      <div class="face back"></div><div class="spine"></div><div class="top"></div><div class="foot"></div><div class="edge"></div>
      <div class="face page"></div>${tabs}
      <div class="leaf"><div class="face front" role="img" aria-label="${b.name}"><svg class="cover-mark" viewBox="0 0 24 24" aria-hidden="true">${b.mark}</svg><span class="cover-name">${b.short}</span><div class="stickers"></div></div><div class="face inside"></div><div class="face fog"></div><div class="lip"></div><div class="sticker-flap"></div></div>
    </div></div>`;
    slot.querySelector('.float').style.animationDelay = `${-1.7 * i}s`;
    slot.querySelector('.ground').style.animationDelay = `${-1.7 * i}s`;
    stage.append(slot);
    return slot;
  }); ed.slots = slots;
  BOOKS.forEach((b, i) => paint(i));

  // ---------- Size ----------
  ed.W = 242;
  function size() {
    const vw = window.innerWidth, vh = screenH();
    // Zoomed out a little from the first shelf (vw * 0.62, 300 at most), so the
    // wider ring below still shows all four books at once.
    ed.W = Math.round(Math.max(130, Math.min(vw * SIZE, (vh - 240) / 1.36 / 1.1, MAX_W)));
    stage.style.setProperty('--W', `${ed.W}px`);
    // Low on the screen, where a thumb is (user, 11-12): the front book's
    // middle a little under two thirds of the way down, so its top is just
    // over the middle of the screen, its foot well clear of its name under
    // it (64px, so its shadow fits). The camera's eye moves down with it, so
    // the books are seen from the same height as before.
    const barTop = window.innerHeight - bar.getBoundingClientRect().top; // from the laid-out bottom, where the bar is held
    const y = Math.max(vh * 0.4, Math.min(vh * 0.64, vh - barTop - 64 - ed.W * 0.68));
    stage.style.setProperty('--y', `${y.toFixed(1)}px`);
    ed.Y = y; ed.VH = vh; // where the books' middles are, and the screen's height (Spread places from them)
    stage.style.perspectiveOrigin = `50% ${(y - vh * 0.2).toFixed(1)}px`;
  }
  window.ShelfParts.addTurntable(ed);
  window.ShelfParts.addHands(ed);
  window.ShelfParts.addCaption(ed);
  window.ShelfParts.addShapeMarks(ed);
  window.ShelfParts.addOptions(ed);
  window.ShelfParts.addToast(ed);
  window.ShelfParts.addOpening(ed);

  // The books wait for their names' type, their first pages and their
  // stickers before they show: a second and a half at most.
  function whenArtIn(ms) {
    const urls = [...new Set(BOOKS.map((b) => b.block(colorOf(b))))];
    const one = (u) => new Promise((done) => { const im = new Image(); im.onload = im.onerror = done; im.src = u; });
    const type = document.fonts ? document.fonts.load('700 12px Figtree').catch(() => {}) : null;
    const stickers = window.DFStickers ? window.DFStickers.ready.then(() => {
      BOOKS.forEach((b, i) => ed.paintStickers(i));
      return Promise.all([...stage.querySelectorAll('.stickers img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    }) : null;
    return Promise.race([Promise.all([...urls.map(one), type, stickers]), ed.wait(ms)]);
  }
  window.ShelfParts.addScreenFit(ed);

  // ---------- Start ----------
  store.set('df-suite-in', null); // on the shelf, not in a notebook
  size();
  ed.render();
  window.addEventListener('resize', () => { size(); ed.render(); });
  const quiet = new URLSearchParams(location.search).has('still');
  if (ed.fromAt >= 0) {
    history.replaceState(null, '', location.pathname);
    if (quiet || ed.still()) { ed.settle(); store.set(FRONT_KEY, String(ed.fromAt)); }
    else { ed.busy = true; shelf.classList.add('away'); }
  }
  // index.html hid the bar from the first paint while a book comes back;
  // .away hides it from here (until the book has shut), so it never shows
  // for a moment and then fades.
  requestAnimationFrame(() => document.documentElement.classList.remove('arriving'));
  stage.classList.add('waiting');
  whenArtIn(1500).then(() => {
    stage.classList.remove('waiting');
    if (ed.fromAt >= 0 && !quiet && !ed.still()) ed.shutBook(ed.fromAt);
  });
  // Coming back with the browser's back button can bring the page back as it
  // was left: mid-zoom. Put it right.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    store.set('df-suite-in', null);
    BOOKS.forEach((b, i) => ed.paint(i));
    ed.reset();
  });

  // Each notebook looks after its own offline copy. Registering them all from
  // here means any of them opens without a connection once the shelf has been
  // seen online, even one that's never been opened.
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
      setTimeout(() => {
        BOOKS.forEach((b) => navigator.serviceWorker.register(`${b.id}/sw.js`, { scope: `${b.id}/` }).catch(() => {}));
      }, 3000);
    });
  }
})();
