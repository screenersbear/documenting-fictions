// Documenting Fictions: the shelf. Four notebooks on a turntable, each one its
// own app in its own folder. Swipe (or tap a book behind) to bring one round;
// tap the one in front and its cover swings open and its page grows to fill
// the screen, then that notebook takes over. Shutting a notebook comes back
// here (?from=<folder>) and the same thing plays backwards.
(function () {
  'use strict';
  const ed = {}; // what the shelf's parts share (the files it runs below)
  Object.assign(ed, { size });

  const COLORS = { orange: '#ec701e', mango: '#ffd100', berry: '#bf0b83', fern: '#2e7a55', ocean: '#245caa', ink: '#313d45', leaf: '#2f9a55' }; ed.COLORS = COLORS;
  // A cover's picture for --cover or --block, as a whole address: a url() in a
  // --property is read from the stylesheet that uses it (in styles/), not
  // from this page.
  const artUrl = (path) => `url("${new URL(path, document.baseURI).href}")`; ed.artUrl = artUrl;
  const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

  // Tabs as they sit on each notebook's fore-edge: [label, top %, height %, width (of W), depth (of T), light?, where it opens]
  const BOOKS = [
    {
      id: 'ref', name: 'ref, do something', short: 'Ref', icon: 'ref/icons/icon-180.png', key: 'ref-notebook-book', color: 'ocean', colors: [['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']], light: '#ffd103',
      cover: (c) => `ref/art/${c}-cover.webp`, block: (c) => `ref/art/${c}-block.webp`,
      tabs: [['Mood boards', 15, 33.5, .11, .2, true, 'boards'], ['Tags', 50, 33.8, .115, -.2, false, 'tags']],
      logo: svg('<path d="M7.5 20.5v-17h5.2a4.4 4.4 0 0 1 0 8.8H7.5M12.4 12.3l5 8.2"/>'),
    },
    {
      id: 'the-eye', name: 'The Eye', short: 'The Eye', icon: 'the-eye/icon-180.png', key: 'df-app-color', color: 'mango', colors: [['mango', 'Mango'], ['orange', 'Orange'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']], light: '#fff0ae', italic: true,
      cover: (c) => `the-eye/art/df-${c}-cover.webp`, block: (c) => `the-eye/art/df-${c}-block.webp`,
      tabs: [['Overview', 16, 13.6, .1, .3, true, 'overview'], ['Shoots', 30.6, 13.6, .105, .15, false, 'shoots'], ['Weekly', 45.2, 13.6, .11, 0, true, 'journal'], ['Archive', 59.8, 13.6, .115, -.15, false, 'archive'], ['Stats', 74.4, 13.6, .12, -.3, true, 'stats']],
      logo: svg('<path d="M18 3.5H9.2a3 3 0 0 0-3 3v4.6M6 20.5h8.8a3 3 0 0 0 3-3v-4.6M8.7 6.6l6.6 10.8"/>'),
    },
    {
      id: 'contact-sheet', name: 'Contact Sheet', short: 'Contact Sheet', icon: 'contact-sheet/icons/icon-180.png', key: 'contact-sheet-book', color: 'orange', colors: [['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']], light: '#fee2d5',
      cover: (c) => `contact-sheet/art/${c}-cover.webp`, block: (c) => `contact-sheet/art/${c}-block.webp`,
      tabs: [['Table of contents', 21.7, 26.7, .085, .2, false, 'contents'], ['New chapter', 49.6, 25.9, .09, -.2, true, 'new']],
      logo: svg('<rect x="2.3" y="7.2" width="5.6" height="9.6" rx=".7"/><rect x="9.2" y="7.2" width="5.6" height="9.6" rx=".7"/><rect x="16.1" y="7.2" width="5.6" height="9.6" rx=".7"/><path d="M2.3 15.2l3.4-3 2.2 1.6M9.2 12.6l5.6-3.1M16.1 15.4l2.4-1.9 3.2 1.9"/><circle cx="19.3" cy="10.2" r=".8"/>'),
    },
    {
      id: 'overthoughts', name: 'Overthoughts', short: 'Overthoughts', icon: 'overthoughts/icons/icon-180.png', key: 'overthoughts-book', color: 'leaf', colors: [['leaf', 'Leaf'], ['orange', 'Orange'], ['mango', 'Mango'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['ink', 'Black']], light: '#d4ecdb',
      cover: (c) => `overthoughts/art/${c}-cover.webp`, block: (c) => `overthoughts/art/${c}-block.webp`,
      tabs: [['Entries', 15, 33.5, .11, .2, true, 'entries'], ['Reviews', 50, 33.8, .115, -.2, false, 'reviews']],
      logo: svg('<path d="M8.2 15.8a3.4 3.4 0 0 1-.5-6.8 4.5 4.5 0 0 1 8.6-1.5 3.5 3.5 0 0 1 2 8.3z"/><circle cx="6.6" cy="19" r="1.2"/><circle cx="4" cy="21.3" r=".6"/>'),
    },
  ]; ed.BOOKS = BOOKS;
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
  // Three ways to stand the books, swapped with a swipe up or down on them
  // (user, 11-12): the ring; dominoes (the front book low on the left, each
  // one behind it a little further up and to the right, all at one angle);
  // and a row facing the screen, swiped through side to side. The last one
  // used is kept.
  const LAYOUTS = ['ring', 'dominoes', 'row']; ed.LAYOUTS = LAYOUTS;
  const LAYOUT_KEY = 'df-suite-layout'; ed.LAYOUT_KEY = LAYOUT_KEY;
  const DOM = { x0: -0.55, up: 0.1, dx: 0.4, dy: 0.32, dz: 0.55, yaw: -22 }; ed.DOM = DOM; // of W, per book behind the front one (up: the whole line, a little higher than the ring)
  const ROW_GAP = 1.22; ed.ROW_GAP = ROW_GAP; // of W, from one book to the next in the row
  const DRAG = { ring: 1.15, dominoes: 1.05, row: ROW_GAP }; ed.DRAG = DRAG; // a finger this far (of W) moves the books one along
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
  const logoBtn = document.getElementById('logoBtn'); ed.logoBtn = logoBtn;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: nothing kept */ } },
  }; ed.store = store;
  const colorOf = (b) => { const c = store.get(b.key); return c && COLORS[c] ? c : b.color; }; ed.colorOf = colorOf;

  // ---------- Building the books ----------
  const slots = BOOKS.map((b, i) => {
    const c = colorOf(b);
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.i = i;
    slot.style.setProperty('--c', COLORS[c]);
    slot.style.setProperty('--cover', artUrl(b.cover(c)));
    slot.style.setProperty('--block', artUrl(b.block(c)));
    slot.style.setProperty('--d', `${-1.7 * i}s`);
    const tabs = b.tabs.map(([label, top, h, w, z, light, at]) =>
      `<div class="tab" data-at="${at}" style="top:${top}%;height:${h}%;width:calc(var(--W) * ${w});background:${light ? b.light : '#334045'};color:${light ? '#334045' : '#fff'};transform:translateZ(calc(var(--T) * ${z}))"><span${b.italic ? ' style="font-style:italic"' : ''}>${label}</span></div>`).join('');
    slot.innerHTML = `<div class="ground"></div><div class="float"><div class="book">
      <div class="face back"></div><div class="spine"></div><div class="top"></div><div class="edge"></div>
      <div class="face page"></div>${tabs}
      <div class="leaf"><div class="face front" role="img" aria-label="${b.name}"><div class="stickers"></div></div><div class="face inside"></div><div class="face fog"></div><div class="lip"></div><div class="sticker-flap"></div></div>
    </div></div>`;
    slot.querySelector('.float').style.animationDelay = `${-1.7 * i}s`;
    slot.querySelector('.ground').style.animationDelay = `${-1.7 * i}s`;
    stage.append(slot);
    return slot;
  }); ed.slots = slots;
  // One mark for the shelf, drawn once: a roll of film (user, 11-12; it was
  // The Eye's S). Swapping in each front book's own logo as the books turned
  // made the turning lag. (The books' logos are kept above for if they come back.)
  logoBtn.innerHTML = svg('<rect x="3.6" y="6.2" width="6.8" height="12.4" rx=".9"/><path d="M2.6 6.2h8.8M2.6 18.6h8.8M6 6.2V4.3h2v1.9M10.4 8.4H21v8.2H10.4M10.4 10.4H21M10.4 14.6H21M13.4 9.4h.01M16.2 9.4h.01M19 9.4h.01M13.4 15.6h.01M16.2 15.6h.01M19 15.6h.01"/>');

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
    // over the middle of the screen, its foot well clear of the bar. The
    // camera's eye moves down with it, so the books are seen from the same
    // height as before.
    const barTop = window.innerHeight - bar.getBoundingClientRect().top; // from the laid-out bottom, where the bar is held
    const y = Math.max(vh * 0.4, Math.min(vh * 0.64, vh - barTop - 44 - ed.W * 0.68));
    stage.style.setProperty('--y', `${y.toFixed(1)}px`);
    stage.style.perspectiveOrigin = `50% ${(y - vh * 0.2).toFixed(1)}px`;
  }
  window.ShelfParts.addTurntable(ed);
  window.ShelfParts.addHands(ed);
  window.ShelfParts.addOptions(ed);
  window.ShelfParts.addToast(ed);
  window.ShelfParts.addOpening(ed);

  // The covers' letters are in their pictures, so the books wait for those
  // (and the first pages) before they show: a second and a half at most.
  function whenArtIn(ms) {
    const urls = [...new Set(BOOKS.flatMap((b) => { const c = colorOf(b); return [b.cover(c), b.block(c)]; }))];
    const one = (u) => new Promise((done) => { const im = new Image(); im.onload = im.onerror = done; im.src = u; });
    // The stickers too, on the covers before the books show.
    const stickers = window.DFStickers ? window.DFStickers.ready.then(() => {
      BOOKS.forEach((b, i) => ed.paintStickers(i));
      return Promise.all([...stage.querySelectorAll('.stickers img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    }) : null;
    return Promise.race([Promise.all([...urls.map(one), stickers]), ed.wait(ms)]);
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
