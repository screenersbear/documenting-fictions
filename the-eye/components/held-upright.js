// Held upright: what the app sees while the phone is sideways and the page is turned back upright.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addHeldUpright = function addHeldUpright(ed) {
  Object.assign(ed, { isSectionCollapsed, setSectionCollapsed, updateStatusSwatchDisplay });
  // ---------- held upright: what the app sees while it's turned back ----------
  // Turned sideways, the page is turned back upright (index.html decides it,
  // styles/notebook-shoot-mode.css turns the body). Everything the app reads about where a finger
  // or a box is, and how big the screen is, is then read the way up the page
  // is, so the swipes, drags and page breaks work as they do upright. Upright,
  // every reading goes straight through.
  (function setupTurnShim() {
    const root = document.documentElement;
    const turnNow = () => (root.classList.contains('nb-turned') ? (root.dataset.turn === '-90' ? -90 : 90) : 0);
    const W = () => Math.min(screen.width, screen.height);
    const H = () => Math.max(screen.width, screen.height);
    const wrapXY = (proto) => {
      const gx = Object.getOwnPropertyDescriptor(proto, 'clientX');
      const gy = Object.getOwnPropertyDescriptor(proto, 'clientY');
      if (!gx || !gy || !gx.get || !gy.get) return;
      Object.defineProperty(proto, 'clientX', {
        configurable: true,
        enumerable: gx.enumerable,
        get() { const t = turnNow(); if (!t) return gx.get.call(this); const vy = gy.get.call(this); return t === 90 ? W() - vy : vy; },
      });
      Object.defineProperty(proto, 'clientY', {
        configurable: true,
        enumerable: gy.enumerable,
        get() { const t = turnNow(); if (!t) return gy.get.call(this); const vx = gx.get.call(this); return t === 90 ? vx : H() - vx; },
      });
    };
    try { wrapXY(MouseEvent.prototype); } catch (e) { /* the readings stay as they are */ }
    try { if (window.Touch) wrapXY(Touch.prototype); } catch (e) { /* the readings stay as they are */ }
    const mapRect = (r, t) => (t === 90
      ? new DOMRect(W() - r.bottom, r.left, r.height, r.width)
      : new DOMRect(r.top, H() - r.right, r.height, r.width));
    const rectOf = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function getBoundingClientRect() {
      const r = rectOf.call(this);
      const t = turnNow();
      return t ? mapRect(r, t) : r;
    };
    const rectsOf = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function getClientRects() {
      const list = rectsOf.call(this);
      const t = turnNow();
      return t ? Array.from(list, r => mapRect(r, t)) : list;
    };
    ['innerWidth', 'innerHeight'].forEach((key) => {
      const d = Object.getOwnPropertyDescriptor(window, key) || Object.getOwnPropertyDescriptor(Object.getPrototypeOf(window), key);
      if (!d || !d.get) return;
      try {
        Object.defineProperty(window, key, {
          configurable: true,
          enumerable: true,
          get() { if (!turnNow()) return d.get.call(window); return key === 'innerWidth' ? W() : H(); },
        });
      } catch (e) { /* the readings stay as they are */ }
    });
    if (window.VisualViewport) {
      const proto = VisualViewport.prototype;
      [['width', W], ['height', H], ['offsetLeft', () => 0], ['offsetTop', () => 0]].forEach(([key, value]) => {
        const d = Object.getOwnPropertyDescriptor(proto, key);
        if (!d || !d.get) return;
        try {
          Object.defineProperty(proto, key, {
            configurable: true,
            enumerable: d.enumerable,
            get() { return turnNow() ? value() : d.get.call(this); },
          });
        } catch (e) { /* the readings stay as they are */ }
      });
    }
    // The upright safe areas, kept for a launch that starts sideways.
    const probe = document.createElement('div');
    probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)';
    document.body.appendChild(probe);
    const keepSafeAreas = () => {
      if (turnNow()) return;
      const cs = getComputedStyle(probe);
      try { localStorage.setItem('df_safe_areas', JSON.stringify({ top: parseFloat(cs.paddingTop) || 0, bottom: parseFloat(cs.paddingBottom) || 0 })); } catch (e) { /* not kept */ }
    };
    keepSafeAreas();
    window.addEventListener('resize', keepSafeAreas);
  })();
  const isTurned = () => document.documentElement.classList.contains('nb-turned'); ed.isTurned = isTurned;

  const STORAGE_KEY = 'dailies_state_v1'; ed.STORAGE_KEY = STORAGE_KEY;
  const IDB_NAME = 'starky-moodboards'; ed.IDB_NAME = IDB_NAME;
  // Boards from Ref (see "Boards from Ref" further down). Up here, since a
  // save or a render at startup can ask about them before that part has run.
  const refApi = window.DFData && window.DFData.linksWhere ? window.DFData : null; ed.refApi = refApi;
  ed.refBoardShootIds = new Set(); // shoots with a board on them: no "needs a mood board" for those
  ed.refFreezeTimer = 0;
  ed.refBoardsReady = Promise.resolve(); // once it's known which shoots have one (the daily report waits for it)

  const IDB_STORE = 'images'; ed.IDB_STORE = IDB_STORE;
  const COLLAPSED_SECTIONS_KEY = 'dailies_collapsed_sections_v1';

  // Shared collapsed/expanded tracking for every "tuck-able" heading in the
  // app (Overview's Today/Upcoming/Upcoming deadlines, Shoots' status groups,
  // and any future ones) — persisted so nesting survives tab switches and
  // full app restarts alike.
  function loadCollapsedSections() {
    try {
      const raw = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveCollapsedSections() {
    try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsedSections])); } catch (e) {}
  }

  const collapsedSections = loadCollapsedSections();
  // The notebook's pages don't fold any more: forget what was folded on them.
  [...collapsedSections].filter(k => /^(overview|shoots|archive|journal|shoot|stats):/.test(k)).forEach(k => collapsedSections.delete(k));
  saveCollapsedSections();

  function isSectionCollapsed(key) {
    return collapsedSections.has(key);
  }

  function setSectionCollapsed(key, collapsed) {
    if (collapsed) collapsedSections.add(key);
    else collapsedSections.delete(key);
    saveCollapsedSections();
  }

  // The key `rescheduled` is what's saved in shoots and backup files, so it
  // stays as is; only the label shown to the user is "Postponed".
  // Order matters: isPostCaptureStatus treats everything from 'captured'
  // onward (bar Postponed/Canceled) as post-capture, so the video edit steps
  // sit between 'captured' and 'delivered'. Which category sees which keys is
  // decided by PHOTO_ONLY_STATUSES / VIDEO_ONLY_STATUSES below.
  const STATUS_LABELS = {
    prospect: 'Prospect',
    planning: 'Active planning',
    waiting_to_shoot: 'Shoot ready',
    captured: 'Captured',
    waiting_for_selects: 'Waiting for selects', // photo only
    editing: 'Editing',                         // photo only
    rough_cut: 'Rough cut',                     // video only
    client_review: 'Client review',             // video only
    revisions: 'Revisions',                     // video only
    delivered: 'Delivered',
    rescheduled: 'Postponed',
    canceled: 'Canceled',
  }; ed.STATUS_LABELS = STATUS_LABELS;

  // Keeps the visible "Status: X" swatch button in sync with the real
  // (invisible) #shootStatus select underneath it — call after anything
  // changes that select's value.
  function updateStatusSwatchDisplay() {
    const value = document.getElementById('shootStatus').value;
    document.getElementById('statusSwatchDisplay').textContent = `Status: ${STATUS_LABELS[value] || ''}`;
  }

  // Every status from Captured onward (both the photo and the video edit
  // steps), minus the off-track Postponed/Canceled. Excludes these shoots from
  // upcoming/today/day-after/7-day/shoot-mode, and includes them in the
  // reflection badge, the weekly Journal log and the fun facts — a single list
  // so a new post-capture status only has to be added once. Must agree with
  // isPostCaptureStatus, which is order-based on STATUS_LABELS.
  const POST_CAPTURE_STATUSES = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered']; ed.POST_CAPTURE_STATUSES = POST_CAPTURE_STATUSES;
};
