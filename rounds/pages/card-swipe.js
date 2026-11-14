// A finger on Today's top card: it follows along, turning a little; let go
// far enough (or flicked) and it's swiped away, done. Let go short and it
// slides back. A tap, or Enter, opens the move. The section swipe on the
// page stands down while a finger is on the card.
const MS = 240, FADE_MS = 150, EASE = 'cubic-bezier(.4, 0, .2, 1)';
const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const held = (dx) => `translate3d(${dx}px, 0px, 0px) rotate(${(dx / 24).toFixed(2)}deg)`;

export function wireCard(card, { onOpen, onSwipe }) {
  let d = null, swiped = 0;
  card.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.stopPropagation();
    d = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, moved: false, vx: 0, lastX: e.clientX, lastT: performance.now() };
  });
  card.addEventListener('pointermove', (e) => {
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 10) return;
      if (Math.abs(dy) > Math.abs(dx)) { d = null; return; } // scrolling the page
      d.moved = true;
      try { card.setPointerCapture(e.pointerId); } catch {}
    }
    const now = performance.now();
    d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
    d.lastX = e.clientX;
    d.lastT = now;
    d.dx = dx;
    card.style.transform = held(dx);
  });
  const end = (e) => {
    if (!d || e.pointerId !== d.id) return;
    const g = d;
    d = null;
    if (!g.moved) return; // a tap: the click opens it
    swiped = performance.now();
    const flick = Math.abs(g.vx) > 0.6 && Math.sign(g.vx) === Math.sign(g.dx);
    if (e.type === 'pointerup' && (Math.abs(g.dx) > card.offsetWidth * 0.3 || flick)) onSwipe(Math.sign(g.dx), g.dx);
    else settleBack(card, g.dx);
  };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
  card.addEventListener('click', () => { if (performance.now() - swiped > 350) onOpen(); });
  card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } });
}

function settleBack(card, dx) {
  card.style.transform = '';
  if (!still()) card.animate([{ transform: held(dx) }, { transform: held(0) }], { duration: MS, easing: EASE });
}

// The card leaves: off to the side it was swiped (dir), from dx along; or
// for LATER (dir 0) down a little, fading. With Reduce Motion it fades.
export function cardAway(card, dir, dx = 0) {
  const to = dir ? `translate3d(${dir * (card.offsetWidth + 80)}px, 0px, 0px) rotate(${dir * 12}deg)` : 'translate3d(0px, 32px, 0px)';
  const frames = still() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: held(dx), opacity: 1 }, { transform: to, opacity: dir ? 1 : 0 }];
  const a = card.animate(frames, { duration: still() ? FADE_MS : MS, easing: EASE, fill: 'forwards' });
  return new Promise((done) => { a.onfinish = done; setTimeout(done, MS + 200); });
}
