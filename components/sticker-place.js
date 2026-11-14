// Placing a new sticker (round 5, 05-sticker-placing): the book up close
// with the sticker on its cover (drag to move, pinch to size, twist to turn)
// and a sheet under it with its SHAPE and EDGE, the sticker changing as you
// pick. BACK leaves it; STICK IT ON saves it. Shape and edge are chosen
// here, never after. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addPlacing = function addPlacing(ed) {
  'use strict';
  Object.assign(ed, { stick });
  const SHAPES = [['circle', 'Circle'], ['square', 'Square'], ['rect', 'Card']];
  const EDGES = [['white', 'White border'], ['outline', 'Black outline']];
  const twoFingers = (list) => (list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0);
  const angleOf = (list) => (list.length > 1 ? (Math.atan2(list[1][1] - list[0][1], list[1][0] - list[0][0]) * 180) / Math.PI : 0);
  const middle = (list) => [list.reduce((a, p) => a + p[0], 0) / list.length, list.reduce((a, p) => a + p[1], 0) / list.length];
  // Between -180 and 180, so a saved turn reads plainly.
  const wrap = (deg) => ((((deg + 180) % 360) + 360) % 360) - 180;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const seg = (name, label, list, on) => `
    <p class="place-title" id="place${name}">${label}</p>
    <div class="place-seg" role="radiogroup" aria-labelledby="place${name}">${list.map(([key, words]) => `<button type="button" role="radio" data-${name.toLowerCase()}="${key}" aria-checked="${key === on}"><span class="seg-mark ${key}" aria-hidden="true"></span>${words}</button>`).join('')}</div>`;

  // The new sticker on the cover. app: its notebook; bytes: the photo; book:
  // that notebook's name; front/flap: its book's cover and fore-edge;
  // laidOut(top): called once the sheet is up, so the book can make room
  // above it. Resolves true once it's saved.
  function stick(app, bytes, book, front, flap, laidOut) {
    // A new sticker takes the shape and edge of the last one on this cover.
    const last = ed.listOf(app).slice(-1)[0];
    const shape = last && ed.RATIO[last.shape] && !last.printed ? last.shape : 'circle';
    const draft = { id: ed.uid(), app, shape, ratio: ed.RATIO[shape], x: 0.5, y: 0.42, size: 0.44, turn: 0, seed: Math.floor(Math.random() * 2 ** 31), bytes, type: 'image/jpeg', edge: last && last.edge === 'outline' ? 'outline' : 'white' };
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    const layerOn = front.querySelector('.stickers');
    let el = null, onFlap = null;
    // (Again after a shape or edge is picked: its look is made from both.)
    const draw = () => {
      const was = el;
      el = ed.make(draft, url);
      el.classList.add('placing');
      if (was) was.replaceWith(el); else layerOn.append(el);
      if (flap) { const old = onFlap; onFlap = ed.make(draft, url, true); if (old) old.replaceWith(onFlap); else flap.append(onFlap); }
    };
    draw();
    const layer = document.createElement('div');
    layer.className = 'place-layer';
    layer.innerHTML = `
      <p class="place-label">New sticker · ${esc(book)}</p>
      <section class="place-sheet" aria-label="Place the sticker">
        <span class="place-grip" aria-hidden="true"></span>
        <p class="place-hint">Drag to move, pinch to size, twist to turn.</p>
        ${seg('Shape', 'Shape', SHAPES, draft.shape)}
        ${seg('Edge', 'Edge', EDGES, draft.edge)}
        <div class="place-foot"><button type="button" class="sheet-btn" data-no>Back</button><button type="button" class="sheet-btn primary" data-yes>Stick it on</button></div>
      </section>`;
    document.body.append(layer);
    const sheet = layer.querySelector('.place-sheet');
    if (laidOut) laidOut(sheet.getBoundingClientRect().top);
    const clampAll = () => {
      draft.size = Math.min(1.5, Math.max(0.12, draft.size));
      draft.x = Math.min(1.1, Math.max(-0.1, draft.x)); // past an edge it folds, but it's never lost
      draft.y = Math.min(1.1, Math.max(-0.1, draft.y));
      draft.turn = wrap(draft.turn);
      el.style.setProperty('--turn', `${draft.turn}deg`);
      ed.seat(el, draft);
      if (onFlap) { onFlap.style.setProperty('--turn', `${draft.turn}deg`); ed.placeOnFlap(onFlap, draft); }
    };
    sheet.addEventListener('click', (e) => {
      const s = e.target.closest('[data-shape]'), g = e.target.closest('[data-edge]');
      if (!s && !g) return;
      if (s) Object.assign(draft, { shape: s.dataset.shape, ratio: ed.RATIO[s.dataset.shape] });
      if (g) draft.edge = g.dataset.edge;
      (s || g).parentElement.querySelectorAll('[role="radio"]').forEach((b) => b.setAttribute('aria-checked', String(b === (s || g))));
      draw();
      clampAll();
    });
    const pts = new Map();
    let grab = null;
    const start = () => {
      const list = [...pts.values()], [mx, my] = middle(list), r = front.getBoundingClientRect();
      grab = { w: r.width, h: r.height, mx, my, x: draft.x, y: draft.y, size: draft.size, turn: draft.turn, d: twoFingers(list), a: angleOf(list) };
    };
    layer.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.place-sheet')) return;
      try { layer.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      start();
    });
    layer.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      const list = [...pts.values()], [mx, my] = middle(list);
      draft.x = grab.x + (mx - grab.mx) / grab.w;
      draft.y = grab.y + (my - grab.my) / grab.h;
      if (list.length > 1 && grab.d) {
        draft.size = grab.size * (twoFingers(list) / grab.d);
        draft.turn = grab.turn + wrap(angleOf(list) - grab.a);
      }
      clampAll();
    });
    const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    // On a computer: the wheel sizes it, and with Shift turns it.
    layer.addEventListener('wheel', (e) => {
      if (e.target.closest('.place-sheet')) return;
      e.preventDefault();
      if (e.shiftKey) draft.turn += (e.deltaY || e.deltaX) < 0 ? -3 : 3;
      else draft.size *= e.deltaY < 0 ? 1.05 : 0.95;
      clampAll();
    }, { passive: false });
    clampAll();
    return new Promise((resolve) => {
      const done = (saved) => { layer.remove(); el.remove(); if (onFlap) onFlap.remove(); URL.revokeObjectURL(url); resolve(saved); };
      layer.querySelector('[data-no]').addEventListener('click', () => done(false));
      const yes = layer.querySelector('[data-yes]');
      yes.addEventListener('click', async () => {
        if (yes.disabled) return;
        yes.disabled = true;
        const s = Object.assign({}, draft, { createdAt: new Date().toISOString() });
        try {
          await ed.write((os) => os.put(s));
          ed.all.push(s);
          done(true);
        } catch (err) {
          console.error(err);
          yes.disabled = false;
          yes.textContent = 'Try again';
        }
      });
    });
  }
};
