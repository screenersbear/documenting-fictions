// Hands on the shelf: a finger or the mouse turns it, a tap brings a notebook
// round or opens the one in front (in Spread, any one); up or down changes
// how they stand; the arrow keys too. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addHands = function addHands(ed) {
  'use strict';
  // ---------- Hands ----------
  let drag = null;
  ed.busy = false;
  ed.stage.addEventListener('pointerdown', (e) => {
    if (ed.busy || e.button) return;
    cancelAnimationFrame(ed.anim);
    const slot = e.target.closest('.slot');
    const tab = e.target.closest('.tab');
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pos: ed.pos, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false, slot: slot ? Number(slot.dataset.i) : -1, at: tab ? tab.dataset.at : null };
    try { ed.stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  ed.stage.addEventListener('pointermove', (e) => {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 8) {
      d.moved = true;
      d.upDown = Math.abs(dy) > Math.abs(dx); // up or down changes how they stand; across turns them
    }
    if (!d.moved || d.upDown || ed.layout === 'spread') return; // Spread doesn't turn: tap the one you want
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * d.v + 0.3 * ((e.clientX - d.lastX) / dt);
    d.lastX = e.clientX; d.lastT = e.timeStamp;
    ed.pos = d.pos - dx / (ed.W * ed.DRAG[ed.layout]);
    ed.renderSoon();
  });
  function letGo(e) {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    drag = null;
    if (!d.moved) {
      if (e.type === 'pointercancel') { ed.go(Math.round(ed.pos)); return; }
      const front = ed.mod(Math.round(ed.pos));
      if (ed.layout === 'spread' && d.slot >= 0) { ed.openBook(d.slot, null); return; } // any cover opens
      if (d.slot >= 0 && d.slot !== front) {
        // A tap on a book behind brings it round to the front.
        ed.go(Math.round(ed.pos) + ed.stepsTo(d.slot));
        return;
      }
      if (d.slot === front) { ed.openBook(front, d.at); return; }
      ed.go(Math.round(ed.pos));
      return;
    }
    if (d.upDown) {
      const dy = e.clientY - d.y;
      if (e.type === 'pointerup' && Math.abs(dy) > 36) ed.reshape(dy < 0 ? 1 : -1);
      return;
    }
    if (ed.layout === 'spread') return;
    const fling = -d.v * 260 / (ed.W * ed.DRAG[ed.layout]);
    const base = Math.round(d.pos);
    ed.go(Math.max(base - 1, Math.min(base + 1, Math.round(ed.pos + fling))));
  }
  ed.stage.addEventListener('pointerup', letGo);
  ed.stage.addEventListener('pointercancel', letGo);
  document.addEventListener('keydown', (e) => {
    if (ed.busy) return;
    if (e.key === 'ArrowRight') ed.go(Math.round(ed.pos) + 1);
    else if (e.key === 'ArrowLeft') ed.go(Math.round(ed.pos) - 1);
    else if (e.key === 'Enter' && document.activeElement === document.body) ed.openBook(ed.mod(Math.round(ed.pos)));
  });
};
