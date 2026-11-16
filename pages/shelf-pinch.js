// Pinch to zoom on the shelf (round 7, 09-pinch-close-up, 16 Nov): two
// fingers apart bring the notebooks close, the front one filling most of the
// screen and the others cut by the edges; together again (or a tap on the
// paper, pages/shelf-hands.js) and they ease back to how they stood. It
// follows the fingers, then settles, with no bounce; with Reduce Motion it
// crossfades instead. While close, a tap on the front book still opens it and
// a swipe still turns the shelf (shelf-hands.js goes by ed.closeK). On a
// computer, a trackpad pinch does the same. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addPinch = function addPinch(ed) {
  'use strict';
  Object.assign(ed, { unpinch, pinchOff });
  ed.closeT = 0; // 0: as they stand; 1: close
  ed.closeK = 1; // how much bigger they are drawn now
  const SETTLE_MS = 320, FADE_MS = 250;
  const fingers = new Map();
  let pinch = null;
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const screenH = () => ed.VH || window.innerHeight;

  // How much bigger close is: the front book about 85% of the screen's width,
  // and no more than 55% of its height.
  const most = () => Math.max(1, Math.min(window.innerWidth * 0.85 / ed.W, screenH() * 0.55 / (ed.W * 1.36)));
  // t of the way close: bigger by k, the front book's middle moved from where
  // it stands (ed.Y) to just under the middle of the screen.
  function transformAt(t) {
    const k = 1 + (most() - 1) * t;
    const cx = window.innerWidth / 2, y = ed.Y + (screenH() * 0.52 - ed.Y) * t;
    return { k, css: t > 0 ? `translate(${(cx - k * cx).toFixed(1)}px, ${(y - k * ed.Y).toFixed(1)}px) scale(${k.toFixed(4)})` : '' };
  }
  function show(t, settling) {
    const { k, css } = transformAt(t);
    ed.closeT = t;
    ed.closeK = k;
    ed.stage.classList.toggle('settling', settling);
    ed.stage.style.transform = css;
    ed.shelf.classList.toggle('close', t > 0);
    if (ed.placeWaiting) ed.placeWaiting();
  }
  async function settle(to) {
    clearTimeout(settle.t);
    if (still()) {
      ed.stage.classList.add('fading');
      await ed.wait(FADE_MS);
      show(to, false);
      ed.stage.classList.remove('fading');
      return;
    }
    show(to, true);
    settle.t = setTimeout(() => ed.stage.classList.remove('settling'), SETTLE_MS + 40);
  }
  // Back to how they stand (now: at once, as Options brings a book up).
  function unpinch(now) {
    if (!ed.closeT) return;
    if (now) show(0, false); else settle(0);
  }
  // Opening a book from close: the opening takes the shelf from here.
  function pinchOff() {
    fingers.clear();
    pinch = null;
    ed.closeT = 0;
    ed.closeK = 1;
    ed.shelf.classList.remove('close');
  }

  // ---------- Two fingers ----------
  const apart = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  ed.stage.addEventListener('pointerdown', (e) => {
    if (ed.busy || ed.near !== null || e.pointerType === 'mouse') return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (fingers.size !== 2) return;
    if (ed.dropDrag) ed.dropDrag(); // two fingers: not a turn or a tap
    clearTimeout(settle.t);
    ed.stage.classList.remove('settling');
    pinch = { d: apart(), t: ed.closeT, now: ed.closeT };
  });
  ed.stage.addEventListener('pointermove', (e) => {
    if (!fingers.has(e.pointerId)) return;
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!pinch || fingers.size < 2) return;
    const m = most(), k = Math.max(1, Math.min(m, (1 + (m - 1) * pinch.t) * apart() / pinch.d));
    pinch.now = m > 1 ? (k - 1) / (m - 1) : 0;
    if (!still()) show(pinch.now, false);
  });
  // Where a pinch settles: from where they stood, a quarter of the way is
  // enough to come close; from close, a quarter of the way back.
  const aim = (p) => (p.t ? (p.now < 0.75 ? 0 : 1) : (p.now > 0.25 ? 1 : 0));
  function lift(e) {
    if (!fingers.delete(e.pointerId) || !pinch) return;
    const p = pinch;
    pinch = null;
    settle(aim(p));
  }
  ed.stage.addEventListener('pointerup', lift);
  ed.stage.addEventListener('pointercancel', lift);

  // A trackpad pinch (the browser sends it as a wheel with ctrl held).
  let wheel = null;
  ed.stage.addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    if (ed.busy || ed.near !== null) return;
    if (!wheel) wheel = { t: ed.closeT, now: ed.closeT };
    clearTimeout(wheel.end);
    wheel.now = Math.max(0, Math.min(1, wheel.now - e.deltaY * 0.02));
    if (!still()) show(wheel.now, false);
    wheel.end = setTimeout(() => { const w = wheel; wheel = null; settle(aim(w)); }, 160);
  }, { passive: false });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && ed.closeT && !ed.busy) unpinch(); });
  window.addEventListener('resize', () => { if (ed.closeT) show(ed.closeT, false); });
};
