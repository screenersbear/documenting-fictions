// The shelf's turntable: where each notebook stands as the shelf turns, and
// turning it to a notebook. (Loaded before app.js, which runs it.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addTurntable = function addTurntable(ed) {
  'use strict';
  Object.assign(ed, { place, stepsTo, reshape, render, go, settle });
  // ---------- The turntable ----------
  const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
  const mod = (n) => ((n % ed.N) + ed.N) % ed.N; ed.mod = mod;
  const kept = ed.store.get(ed.FRONT_KEY);
  ed.pos = kept === null ? NaN : Number(kept);
  if (!(ed.pos >= 0 && ed.pos < ed.N)) ed.pos = 1; // The Eye, the one there's always been
  const from = new URLSearchParams(location.search).get('from');
  const fromAt = ed.BOOKS.findIndex((b) => b.id === from); ed.fromAt = fromAt;
  if (fromAt >= 0) ed.pos = fromAt;
  ed.facing = null; // a book turned to face you straight on (opening or shutting)
  ed.near = null; // the book brought up close for its options (the film roll)
  ed.nearAt = { y: 0, k: 1 }; // where it is then: how far up, how much bigger
  ed.layout = ed.LAYOUTS.includes(ed.store.get(ed.LAYOUT_KEY)) ? ed.store.get(ed.LAYOUT_KEY) : 'ring';
  // The notebooks in front last, newest first: Spread lays them in that order.
  const ids = ed.BOOKS.map((b) => b.id);
  let recent = [];
  try { recent = JSON.parse(ed.store.get(ed.RECENT_KEY) || '[]').map((id) => ids.indexOf(id)).filter((i) => i >= 0); } catch (e) { recent = []; }
  function remember(i) {
    if (recent[0] === i) return;
    recent = [i, ...recent.filter((x) => x !== i)];
    ed.store.set(ed.RECENT_KEY, JSON.stringify(recent.map((x) => ids[x])));
  }
  if (fromAt >= 0) remember(fromAt);
  // Where book i lies in Spread: 0 on top (the one in front), then the ones
  // in front before it, then the rest round the ring.
  function spreadRank(i) {
    const front = mod(Math.round(ed.pos));
    const order = [front, ...recent.filter((x) => x !== front)];
    for (let k = 1; k < ed.N; k++) if (!order.includes(mod(front + k))) order.push(mod(front + k));
    return order.indexOf(i);
  }

  // Where book i stands, wherever the turning has got to: [x, y, z, yaw, depth
  // order, fog]. pos is the book in front (fractions while turning).
  function spot(i) {
    if (ed.layout === 'row') {
      // Side by side, facing you. The book swapping ends is off the screen.
      const o = mod(i - ed.pos + ed.N / 2) - ed.N / 2;
      return [o * ed.ROW_GAP * ed.W, 0, 0, 0, 100 - Math.abs(o) * 20, 0];
    }
    if (ed.layout === 'dominoes') {
      // In a line from the front book up and to the right. The front book
      // going to the back slips out of the screen low on the left and comes
      // back in high on the right, behind the others.
      const t = mod(i - ed.pos);
      const line = (u) => [ed.W * (ed.DOM.x0 + ed.DOM.dx * u), -ed.W * (ed.DOM.up + ed.DOM.dy * u), -ed.W * ed.DOM.dz * u];
      let at, order;
      if (t <= ed.N - 1) { at = line(t); order = 200 - t * 40; }
      else {
        const f = t - (ed.N - 1); // 0 at the back .. 1 at the front
        if (f < 0.5) { const g = f * 2, b = line(ed.N - 1); at = [b[0] + g * 1.7 * ed.W, b[1] - g * 1.1 * ed.W, b[2]]; order = 0; }
        else { const g = (1 - f) * 2, a = line(0); at = [a[0] - g * 1.9 * ed.W, a[1] + g * 1.3 * ed.W, a[2] + g * 0.4 * ed.W]; order = 300; }
      }
      return [at[0], at[1], at[2], ed.DOM.yaw, order, 0.16 * Math.min(1, Math.max(0, t) / (ed.N - 1))];
    }
    const r = wrap((i - ed.pos) * ed.STEP) * Math.PI / 180;
    const back = (1 - Math.cos(r)) / 2;
    return [ed.W * ed.RING_X * Math.sin(r), -ed.LIFT * ed.W * back, ed.W * ed.RING_Z * (Math.cos(r) - 1),
      -20 * (0.25 + 0.75 * (1 + Math.cos(r)) / 2) - 10 * Math.sin(r), 100 + Math.cos(r) * 100, 0.2 * back];
  }
  // What each book was last given, so only what changed is written: the
  // shelf lagged as it moved (user, 11-12).
  const fogs = ed.slots.map((s) => s.querySelector('.fog'));
  const was = ed.slots.map(() => ({ z: '', f: '' }));
  const stack = (i, z) => { if (was[i].z !== z) { ed.slots[i].style.zIndex = z; was[i].z = z; } };
  const fogTo = (i, f) => { if (was[i].f !== f) { fogs[i].style.opacity = f; was[i].f = f; } };
  // Places book i; gives back how far forward it stands (render() stacks them by it).
  function place(i) {
    const s = ed.slots[i];
    if (ed.near === i) { // up close, for its options (the film roll)
      s.style.transform = `translate3d(0px, ${ed.nearAt.y.toFixed(1)}px, 0px) scale3d(${ed.nearAt.k.toFixed(3)}, ${ed.nearAt.k.toFixed(3)}, ${ed.nearAt.k.toFixed(3)})`;
      stack(i, '400');
      fogTo(i, '0');
      return Infinity;
    }
    if (ed.layout === 'spread') { // big, overlapping, lying back; a book opening sits up to face you
      const r = spreadRank(i), [fx, fy, fw, turn] = ed.SPREAD[r];
      const vw = window.innerWidth, vh = ed.VH || window.innerHeight, u = Math.min(vw, vh * 390 / 844);
      const x = (fx - 0.5) * u, y = vh / 2 + (fy - 0.5) * u * (844 / 390) - (ed.Y || vh * 0.6), k = (fw * u) / ed.W;
      const up = ed.facing === i;
      s.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0px) rotateX(${up ? 0 : ed.SPREAD_TILT}deg) rotateZ(${up ? 0 : turn}deg) scale3d(${k.toFixed(3)}, ${k.toFixed(3)}, ${k.toFixed(3)})`;
      fogTo(i, '0');
      return 100 - r * 10;
    }
    const [x, y, z, yaw, order, fog] = spot(i);
    const tilt = ed.layout === 'row' ? 0 : ed.TILT; // the row looks at you straight on
    const upright = ed.facing === i ? tilt : 0;
    s.style.transform = `rotateX(${-tilt}deg) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${upright}deg) rotateY(${(ed.facing === i ? 0 : yaw).toFixed(2)}deg)`;
    fogTo(i, fog.toFixed(3));
    return order;
  }
  // How many books along book i is from the front, the way it should come round.
  function stepsTo(i) {
    const at = Math.round(ed.pos);
    if (ed.layout === 'dominoes') return mod(i - at); // the ones behind come forward
    if (ed.layout === 'row') return mod(i - at + ed.N / 2) - ed.N / 2;
    if (ed.layout === 'spread') return mod(i - at);
    return wrap((i - at) * ed.STEP) / ed.STEP;
  }
  // A swipe up: the next way of standing them; down: the one before.
  function reshape(by) {
    ed.layout = ed.LAYOUTS[(ed.LAYOUTS.indexOf(ed.layout) + by + ed.LAYOUTS.length) % ed.LAYOUTS.length];
    ed.store.set(ed.LAYOUT_KEY, ed.layout);
    cancelAnimationFrame(ed.anim);
    ed.pos = mod(Math.round(ed.pos));
    ed.slots.forEach((sl) => sl.classList.add('reshaping'));
    render();
    if (ed.shapeMarks) ed.shapeMarks(true); // the marks at the right edge, and the name for a moment (pages/shelf-marks.js)
    clearTimeout(reshape.t);
    reshape.t = setTimeout(() => ed.slots.forEach((sl) => sl.classList.remove('reshaping')), ed.RESHAPE_MS + 40);
    ed.store.set(ed.FRONT_KEY, String(ed.pos));
  }
  let spread = null;
  function render() {
    if (spread !== (ed.layout === 'spread')) { spread = ed.layout === 'spread'; ed.stage.classList.toggle('is-spread', spread); ed.shelf.classList.toggle('is-spread', spread); }
    const order = ed.slots.map((s, i) => place(i));
    // Which book is in front of which, 1 to 4: that only changes as two of
    // them pass, so the shelf is restacked then and not on every frame of a turn.
    order.map((o, i) => i).sort((a, b) => order[a] - order[b]).forEach((i, r) => { if (ed.near !== i) stack(i, String(r + 1)); });
    if (ed.caption) ed.caption(); // the name under the shelf (pages/shelf-caption.js)
  }
  // A finger moving the books: drawn once a frame, however often it reports.
  let soon = 0;
  const renderSoon = () => { if (!soon) soon = requestAnimationFrame(() => { soon = 0; render(); }); }; ed.renderSoon = renderSoon;

  ed.anim = 0;
  function go(target) {
    cancelAnimationFrame(ed.anim);
    const start = ed.pos, t0 = performance.now(), dur = 520;
    const end = () => { ed.pos = target; settle(); };
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      ed.pos = k < 1 ? start + (target - start) * e : target;
      render();
      if (k < 1) ed.anim = requestAnimationFrame(tick); else end();
    };
    ed.anim = requestAnimationFrame(tick);
    // A phone can hold animation frames back (the app half put away): land anyway.
    clearTimeout(go.t);
    go.t = setTimeout(() => { if (ed.pos !== target) { cancelAnimationFrame(ed.anim); end(); } }, dur + 400);
  }
  function settle() {
    ed.pos = mod(Math.round(ed.pos));
    remember(ed.pos);
    render();
    ed.store.set(ed.FRONT_KEY, String(ed.pos));
  }
};
