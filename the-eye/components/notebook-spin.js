// The shut notebook: turning it round with a finger.
// (Loaded before app.js; the file it belongs to runs it.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBookSpin = function addBookSpin(ed, notebook) {
  Object.assign(notebook, { settleTurn });
    function drawTurn() {
      notebook.spinEl.style.transform = notebook.spin || notebook.tilt
        ? `translateZ(calc(var(--W) * -0.095)) rotateX(${notebook.tilt.toFixed(4)}rad) rotateY(${notebook.spin.toFixed(4)}rad) translateZ(calc(var(--W) * 0.095))`
        : '';
    }
    function stepTurn(now) {
      notebook.turnFrame = 0;
      const dt = Math.min(0.032, Math.max(0.001, (now - notebook.turnClock) / 1000));
      notebook.turnClock = now;
      const held = notebook.turn && notebook.turn.moved;
      notebook.spinV += (-(notebook.turn ? 40 : 14) * (notebook.spin - (held ? notebook.spinGoal : 0)) - (notebook.turn ? 12 : 7.5) * notebook.spinV) * dt;
      notebook.spin += notebook.spinV * dt;
      notebook.tiltV += (-(notebook.turn ? 40 : 30) * (notebook.tilt - (held ? notebook.tiltGoal : 0)) - (notebook.turn ? 12 : 10) * notebook.tiltV) * dt;
      notebook.tilt += notebook.tiltV * dt;
      if (!notebook.turn && Math.abs(notebook.spin) < 1e-3 && Math.abs(notebook.spinV) < 1e-2 && Math.abs(notebook.tilt) < 1e-3 && Math.abs(notebook.tiltV) < 1e-2) notebook.spin = notebook.spinV = notebook.tilt = notebook.tiltV = 0;
      drawTurn();
      if (notebook.turn || notebook.spin || notebook.tilt) kickTurn();
    }
    function kickTurn() {
      if (notebook.turnFrame) return;
      if (!notebook.turn && !notebook.spin && !notebook.tilt) return;
      if (!notebook.turnClock || performance.now() - notebook.turnClock > 100) notebook.turnClock = performance.now();
      notebook.turnFrame = requestAnimationFrame(stepTurn);
    }
    function settleTurn() {
      notebook.turn = null;
      notebook.spin = notebook.spinV = notebook.tilt = notebook.tiltV = 0;
      if (notebook.turnFrame) cancelAnimationFrame(notebook.turnFrame);
      notebook.turnFrame = 0;
      drawTurn();
    }
    notebook.book.addEventListener('pointerdown', (e) => {
      if (e.button || !e.isPrimary || notebook.turn) return;
      if (!notebook.book.classList.contains('closed') || notebook.book.classList.contains('placing')) return;
      if (e.target.closest('.nb-sun, .nb-sticker-stage, .nb-crop')) return;
      notebook.turn = { id: e.pointerId, x0: e.clientX, y0: e.clientY, spin0: notebook.unsoften(notebook.spin, notebook.spinLimit(notebook.spin)), tilt0: notebook.unsoften(notebook.tilt, notebook.tiltLimit(notebook.tilt)), moved: false };
    });
    notebook.book.addEventListener('pointermove', (e) => {
      if (!notebook.turn || notebook.turn.id !== e.pointerId) return;
      const dx = e.clientX - notebook.turn.x0;
      const dy = e.clientY - notebook.turn.y0;
      if (!notebook.turn.moved) {
        if (Math.hypot(dx, dy) <= 6) return;
        notebook.turn.moved = true;
        try { notebook.book.setPointerCapture(e.pointerId); } catch (err) { /* moves still arrive while over the book */ }
      }
      const perPixel = (Math.PI / (parseFloat(notebook.book.style.getPropertyValue('--W')) || 300)) * 0.55;
      const rawSpin = notebook.turn.spin0 + dx * perPixel;
      const rawTilt = notebook.turn.tilt0 - dy * perPixel;
      notebook.spinGoal = notebook.soften(rawSpin, notebook.spinLimit(rawSpin));
      notebook.tiltGoal = notebook.soften(rawTilt, notebook.tiltLimit(rawTilt));
      kickTurn();
    });
    const letGoOfBook = (e) => {
      if (!notebook.turn || notebook.turn.id !== e.pointerId) return;
      if (notebook.turn.moved) notebook.turnedAt = performance.now();
      const moved = notebook.turn.moved;
      notebook.turn = null;
      if (moved) kickTurn();
    };
    notebook.book.addEventListener('pointerup', letGoOfBook);
    notebook.book.addEventListener('pointercancel', letGoOfBook);
    // Letting go after a turn isn't a tap on the cover or a tab.
    notebook.book.addEventListener('click', (e) => {
      if (performance.now() - notebook.turnedAt < 350 && e.target.closest('.nb-hit')) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    document.getElementById('bookStack').innerHTML =
      Array.from({ length: notebook.STACK }, (_, i) => `<i style="--i:${i + 1}"></i>`).join('') + `<b style="--i:${notebook.STACK + 1}"></b>`;
};
