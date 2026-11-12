// Documenting Fictions: the shelf. Four notebooks on a turntable, each one its
// own app in its own folder. Swipe (or tap a book behind) to bring one round;
// tap the one in front and its cover swings open and its page grows to fill
// the screen, then that notebook takes over. Shutting a notebook comes back
// here (?from=<folder>) and the same thing plays backwards.
(function () {
  'use strict';

  const COLORS = { orange: '#ec701e', mango: '#ffd100', berry: '#bf0b83', fern: '#2e7a55', ocean: '#245caa', ink: '#313d45', leaf: '#2f9a55' };
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
  ];
  const N = BOOKS.length;
  // The turntable: how wide and deep the ring is (of a book's width W), and how
  // far up the books further round sit. Wider than the first shelf (0.95, 1.9,
  // 0.22) so the books have room between them.
  const SIZE = 0.43, MAX_W = 240;
  const RING_X = 1.1, RING_Z = 2.9, LIFT = 0.34;
  // The camera looks down on the ring a little (degrees), so you see over the
  // front book to the ones behind it. A book turned to face you (opening or
  // shutting) stands up straight again, so its page still fills the screen.
  const TILT = 10;
  const STEP = 360 / N;
  // Three ways to stand the books, swapped with a swipe up or down on them
  // (user, 11-12): the ring; dominoes (the front book low on the left, each
  // one behind it a little further up and to the right, all at one angle);
  // and a row facing the screen, swiped through side to side. The last one
  // used is kept.
  const LAYOUTS = ['ring', 'dominoes', 'row'];
  const LAYOUT_KEY = 'df-suite-layout';
  const DOM = { x0: -0.55, up: 0.1, dx: 0.4, dy: 0.32, dz: 0.55, yaw: -22 }; // of W, per book behind the front one (up: the whole line, a little higher than the ring)
  const ROW_GAP = 1.22; // of W, from one book to the next in the row
  const DRAG = { ring: 1.15, dominoes: 1.05, row: ROW_GAP }; // a finger this far (of W) moves the books one along
  const RESHAPE_MS = 620;
  const OPEN_MS = 900, ZOOM_MS = 760, TURN_MS = 420;
  const OVER = 12; // how far the page's white goes past every edge of the screen once it has grown
  const FRONT_KEY = 'df-suite-front';

  const shelf = document.getElementById('shelf');
  const stage = document.getElementById('stage');
  const bar = document.getElementById('shelfBar');
  const logoBtn = document.getElementById('logoBtn');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: nothing kept */ } },
  };
  const colorOf = (b) => { const c = store.get(b.key); return c && COLORS[c] ? c : b.color; };

  // ---------- Building the books ----------
  const slots = BOOKS.map((b, i) => {
    const c = colorOf(b);
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.i = i;
    slot.style.setProperty('--c', COLORS[c]);
    slot.style.setProperty('--cover', `url("${b.cover(c)}")`);
    slot.style.setProperty('--block', `url("${b.block(c)}")`);
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
  });
  // One mark for the shelf, drawn once: a roll of film (user, 11-12; it was
  // The Eye's S). Swapping in each front book's own logo as the books turned
  // made the turning lag. (The books' logos are kept above for if they come back.)
  logoBtn.innerHTML = svg('<rect x="3.6" y="6.2" width="6.8" height="12.4" rx=".9"/><path d="M2.6 6.2h8.8M2.6 18.6h8.8M6 6.2V4.3h2v1.9M10.4 8.4H21v8.2H10.4M10.4 10.4H21M10.4 14.6H21M13.4 9.4h.01M16.2 9.4h.01M19 9.4h.01M13.4 15.6h.01M16.2 15.6h.01M19 15.6h.01"/>');

  // ---------- Size ----------
  let W = 242;
  function size() {
    const vw = window.innerWidth, vh = window.innerHeight;
    // Zoomed out a little from the first shelf (vw * 0.62, 300 at most), so the
    // wider ring below still shows all four books at once.
    W = Math.round(Math.max(130, Math.min(vw * SIZE, (vh - 240) / 1.36 / 1.1, MAX_W)));
    stage.style.setProperty('--W', `${W}px`);
    // Low on the screen, where a thumb is (user, 11-12): the front book's
    // middle a little under two thirds of the way down, so its top is just
    // over the middle of the screen, its foot well clear of the bar. The
    // camera's eye moves down with it, so the books are seen from the same
    // height as before.
    const barTop = vh - bar.getBoundingClientRect().top;
    const y = Math.max(vh * 0.4, Math.min(vh * 0.64, vh - barTop - 44 - W * 0.68));
    stage.style.setProperty('--y', `${y.toFixed(1)}px`);
    stage.style.perspectiveOrigin = `50% ${(y - vh * 0.2).toFixed(1)}px`;
  }

  // ---------- The turntable ----------
  const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;
  const mod = (n) => ((n % N) + N) % N;
  const kept = store.get(FRONT_KEY);
  let pos = kept === null ? NaN : Number(kept);
  if (!(pos >= 0 && pos < N)) pos = 1; // The Eye, the one there's always been
  const from = new URLSearchParams(location.search).get('from');
  const fromAt = BOOKS.findIndex((b) => b.id === from);
  if (fromAt >= 0) pos = fromAt;
  let facing = null; // a book turned to face you straight on (opening or shutting)
  let near = null; // the book brought up close for its options (the film roll)
  let nearAt = { y: 0, k: 1 }; // where it is then: how far up, how much bigger
  let layout = LAYOUTS.includes(store.get(LAYOUT_KEY)) ? store.get(LAYOUT_KEY) : 'ring';

  // Where book i stands, wherever the turning has got to: [x, y, z, yaw, depth
  // order, fog]. pos is the book in front (fractions while turning).
  function spot(i) {
    if (layout === 'row') {
      // Side by side, facing you. The book swapping ends is off the screen.
      const o = mod(i - pos + N / 2) - N / 2;
      return [o * ROW_GAP * W, 0, 0, 0, 100 - Math.abs(o) * 20, 0];
    }
    if (layout === 'dominoes') {
      // In a line from the front book up and to the right. The front book
      // going to the back slips out of the screen low on the left and comes
      // back in high on the right, behind the others.
      const t = mod(i - pos);
      const line = (u) => [W * (DOM.x0 + DOM.dx * u), -W * (DOM.up + DOM.dy * u), -W * DOM.dz * u];
      let at, order;
      if (t <= N - 1) { at = line(t); order = 200 - t * 40; }
      else {
        const f = t - (N - 1); // 0 at the back .. 1 at the front
        if (f < 0.5) { const g = f * 2, b = line(N - 1); at = [b[0] + g * 1.7 * W, b[1] - g * 1.1 * W, b[2]]; order = 0; }
        else { const g = (1 - f) * 2, a = line(0); at = [a[0] - g * 1.9 * W, a[1] + g * 1.3 * W, a[2] + g * 0.4 * W]; order = 300; }
      }
      return [at[0], at[1], at[2], DOM.yaw, order, 0.16 * Math.min(1, Math.max(0, t) / (N - 1))];
    }
    const r = wrap((i - pos) * STEP) * Math.PI / 180;
    const back = (1 - Math.cos(r)) / 2;
    return [W * RING_X * Math.sin(r), -LIFT * W * back, W * RING_Z * (Math.cos(r) - 1),
      -20 * (0.25 + 0.75 * (1 + Math.cos(r)) / 2) - 10 * Math.sin(r), 100 + Math.cos(r) * 100, 0.2 * back];
  }
  function place(i) {
    const s = slots[i];
    if (near === i) { // up close, for its options (the film roll)
      s.style.transform = `translate3d(0px, ${nearAt.y.toFixed(1)}px, 0px) scale3d(${nearAt.k.toFixed(3)}, ${nearAt.k.toFixed(3)}, ${nearAt.k.toFixed(3)})`;
      s.style.zIndex = '400';
      s.querySelector('.fog').style.opacity = '0';
      return;
    }
    const [x, y, z, yaw, order, fog] = spot(i);
    const tilt = layout === 'row' ? 0 : TILT; // the row looks at you straight on
    const upright = facing === i ? tilt : 0;
    s.style.transform = `rotateX(${-tilt}deg) translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${upright}deg) rotateY(${(facing === i ? 0 : yaw).toFixed(2)}deg)`;
    s.style.zIndex = String(Math.round(order));
    s.querySelector('.fog').style.opacity = fog.toFixed(3);
  }
  // How many books along book i is from the front, the way it should come round.
  function stepsTo(i) {
    const at = Math.round(pos);
    if (layout === 'dominoes') return mod(i - at); // the ones behind come forward
    if (layout === 'row') return mod(i - at + N / 2) - N / 2;
    return wrap((i - at) * STEP) / STEP;
  }
  // A swipe up: the next way of standing them; down: the one before.
  function reshape(by) {
    layout = LAYOUTS[(LAYOUTS.indexOf(layout) + by + LAYOUTS.length) % LAYOUTS.length];
    store.set(LAYOUT_KEY, layout);
    cancelAnimationFrame(anim);
    pos = mod(Math.round(pos));
    slots.forEach((sl) => sl.classList.add('reshaping'));
    render();
    clearTimeout(reshape.t);
    reshape.t = setTimeout(() => slots.forEach((sl) => sl.classList.remove('reshaping')), RESHAPE_MS + 40);
    store.set(FRONT_KEY, String(pos));
  }
  function render() {
    for (let i = 0; i < N; i++) place(i);
  }

  let anim = 0;
  function go(target) {
    cancelAnimationFrame(anim);
    const start = pos, t0 = performance.now(), dur = 520;
    const end = () => { pos = target; settle(); };
    const tick = (now) => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      pos = k < 1 ? start + (target - start) * e : target;
      render();
      if (k < 1) anim = requestAnimationFrame(tick); else end();
    };
    anim = requestAnimationFrame(tick);
    // A phone can hold animation frames back (the app half put away): land anyway.
    clearTimeout(go.t);
    go.t = setTimeout(() => { if (pos !== target) { cancelAnimationFrame(anim); end(); } }, dur + 400);
  }
  function settle() {
    pos = mod(Math.round(pos));
    render();
    store.set(FRONT_KEY, String(pos));
  }

  // ---------- Hands ----------
  let drag = null;
  let busy = false;
  stage.addEventListener('pointerdown', (e) => {
    if (busy || e.button) return;
    cancelAnimationFrame(anim);
    const slot = e.target.closest('.slot');
    const tab = e.target.closest('.tab');
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, pos, lastX: e.clientX, lastT: e.timeStamp, v: 0, moved: false, slot: slot ? Number(slot.dataset.i) : -1, at: tab ? tab.dataset.at : null };
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
  });
  stage.addEventListener('pointermove', (e) => {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) > 8) {
      d.moved = true;
      d.upDown = Math.abs(dy) > Math.abs(dx); // up or down changes how they stand; across turns them
    }
    if (!d.moved || d.upDown) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * d.v + 0.3 * ((e.clientX - d.lastX) / dt);
    d.lastX = e.clientX; d.lastT = e.timeStamp;
    pos = d.pos - dx / (W * DRAG[layout]);
    render();
  });
  function letGo(e) {
    const d = drag;
    if (!d || d.id !== e.pointerId) return;
    drag = null;
    if (!d.moved) {
      if (e.type === 'pointercancel') { go(Math.round(pos)); return; }
      const front = mod(Math.round(pos));
      if (d.slot >= 0 && d.slot !== front) {
        // A tap on a book behind brings it round to the front.
        go(Math.round(pos) + stepsTo(d.slot));
        return;
      }
      if (d.slot === front) { openBook(front, d.at); return; }
      go(Math.round(pos));
      return;
    }
    if (d.upDown) {
      const dy = e.clientY - d.y;
      if (e.type === 'pointerup' && Math.abs(dy) > 36) reshape(dy < 0 ? 1 : -1);
      return;
    }
    const fling = -d.v * 260 / (W * DRAG[layout]);
    const base = Math.round(d.pos);
    go(Math.max(base - 1, Math.min(base + 1, Math.round(pos + fling))));
  }
  stage.addEventListener('pointerup', letGo);
  stage.addEventListener('pointercancel', letGo);
  document.addEventListener('keydown', (e) => {
    if (busy) return;
    if (e.key === 'ArrowRight') go(Math.round(pos) + 1);
    else if (e.key === 'ArrowLeft') go(Math.round(pos) - 1);
    else if (e.key === 'Enter' && document.activeElement === document.body) openBook(mod(Math.round(pos)));
  });
  // The film roll (user, 11-12): the notebook in front comes up close, on its
  // own, the way each notebook floated when it was its own app, with its
  // options under it: its colour (the book changes as you pick) and stickers
  // for its cover. Back up all four is there too.
  logoBtn.setAttribute('aria-label', 'Options for the notebook in front');
  const NEAR_MS = 560;
  const nearSlot = () => slots[near];
  // As big as fits above `bottom` (px down the screen), in the middle of the
  // room there, no wider than the notebooks were on their own.
  function nearFit(bottom) {
    const vw = window.innerWidth;
    const top = (parseFloat(getComputedStyle(shelf).paddingTop) || 0) + 20;
    const H = W * 1.36;
    const k = Math.max(0.6, Math.min(Math.min(vw * 0.62, 300) / W, (bottom - top - 30) / (H * 1.12)));
    const y0 = parseFloat(stage.style.getPropertyValue('--y')) || window.innerHeight * 0.6;
    nearAt = { y: top + (bottom - top) / 2 - y0, k };
  }
  function nearMove() {
    const s = nearSlot();
    s.classList.add('nearing');
    place(near);
    clearTimeout(nearMove.t);
    nearMove.t = setTimeout(() => s.classList.remove('nearing'), NEAR_MS + 40);
  }
  function openNear() {
    if (busy || near !== null || document.querySelector('.sheet-dim')) return;
    cancelAnimationFrame(anim);
    clearTimeout(go.t);
    pos = mod(Math.round(pos));
    render();
    busy = true;
    near = pos;
    nearSlot().classList.add('near');
    stage.classList.add('near');
    shelf.classList.add('away');
    showOptions();
  }
  function leaveNear() {
    const s = nearSlot();
    near = null;
    s.classList.add('nearing');
    stage.classList.add('unnear');
    stage.classList.remove('near');
    shelf.classList.remove('away');
    render();
    setTimeout(() => { s.classList.remove('nearing', 'near', 'still'); stage.classList.remove('unnear'); busy = false; }, NEAR_MS + 40);
  }
  function paintStickers(i) {
    if (window.DFStickers) window.DFStickers.paint(slots[i].querySelector('.front'), slots[i].querySelector('.sticker-flap'), BOOKS[i].id);
  }

  function showOptions(view) {
    const i = near, b = BOOKS[i];
    const St = window.DFStickers;
    const dim = document.createElement('div');
    dim.className = 'sheet-dim near';
    dim.innerHTML = `<div class="sheet opts" role="dialog" aria-modal="true" aria-label="${b.short} options"></div>`;
    const sheet = dim.firstElementChild;
    let shown = 'main';
    const drawMain = () => {
      shown = 'main';
      const now = colorOf(b);
      const mine = St ? St.list(b.id) : [];
      sheet.innerHTML = `
        <span class="opt-label">App color</span>
        <div class="opt-colors" style="--n:${b.colors.length}">${b.colors.map(([k, name]) => `<button type="button" class="opt-color" data-color="${k}" aria-pressed="${k === now}"><span class="opt-book" style="background-image:url('${b.cover(k)}')"></span><span>${name}</span></button>`).join('')}</div>
        ${St ? `<span class="opt-label">Stickers</span>
        <div class="sticker-kinds">
          <button type="button" class="sticker-kind" data-shape="circle"><span class="shape circle"></span><span>Circle</span></button>
          <button type="button" class="sticker-kind" data-shape="square"><span class="shape square"></span><span>Square</span></button>
          <button type="button" class="sticker-kind" data-shape="rect"><span class="shape rect"></span><span>Rectangle</span></button>
        </div>
        ${mine.length ? '<button type="button" class="sheet-btn" data-remove>Remove a sticker</button>' : ''}` : ''}
        <div class="opt-foot"><button type="button" class="sheet-btn" data-backup>Back up all four</button><button type="button" class="sheet-btn primary" data-close>Done</button></div>`;
    };
    const drawRemove = () => {
      shown = 'remove';
      const mine = St.list(b.id);
      if (!mine.length) { drawMain(); return; }
      sheet.innerHTML = `
        <span class="opt-label">Tap one to take it off</span>
        <div class="sticker-list">${[...mine].reverse().map((s) => `<button type="button" class="sticker-pick ${s.shape}" style="--r:${St.ratioOf(s)}" data-id="${s.id}" aria-label="Remove this sticker"><img src="${St.thumb(s)}" alt="" /></button>`).join('')}</div>
        <div class="opt-foot one"><button type="button" class="sheet-btn primary" data-back>Done</button></div>`;
    };
    (view === 'remove' ? drawRemove : drawMain)();
    document.body.appendChild(dim);
    // The book comes up into the room over the sheet.
    nearFit(sheet.offsetTop);
    nearMove();
    requestAnimationFrame(() => dim.classList.add('in'));
    const hide = () => new Promise((done) => { dim.classList.remove('in'); setTimeout(() => { dim.remove(); done(); }, 220); });
    const close = () => { hide(); leaveNear(); };
    dim.addEventListener('click', async (e) => {
      if (e.target === dim || e.target.closest('[data-close]')) { close(); return; }
      if (e.target.closest('[data-backup]')) {
        await hide();
        leaveNear();
        if (window.DFBackup) window.DFBackup.open();
        return;
      }
      const c = e.target.closest('[data-color]');
      if (c) {
        setColor(i, c.dataset.color);
        sheet.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
        return;
      }
      if (e.target.closest('[data-remove]')) { drawRemove(); nearFit(sheet.offsetTop); nearMove(); return; }
      if (e.target.closest('[data-back]')) { drawMain(); nearFit(sheet.offsetTop); nearMove(); return; }
      const gone = e.target.closest('.sticker-pick');
      if (gone) {
        const s = St.list(b.id).find((x) => x.id === gone.dataset.id);
        if (!s) return;
        try { await St.remove(s); } catch (err) { console.error(err); return; }
        paintStickers(i);
        drawRemove();
        nearFit(sheet.offsetTop);
        nearMove();
        toast('Sticker removed', 'Undo', async () => {
          await St.putBack(s);
          paintStickers(i);
          if (dim.isConnected) { (shown === 'remove' ? drawRemove : drawMain)(); nearFit(sheet.offsetTop); nearMove(); }
        });
        return;
      }
      const k = e.target.closest('[data-shape]');
      if (k && St) {
        const file = await St.pick(); // straight from the tap, or iOS won't open the picker
        if (!file) return;
        await hide();
        let bytes = null;
        try { bytes = await St.crop(file, k.dataset.shape); } catch (err) { console.error(err); toast('Could not read that photo'); }
        if (bytes) {
          const s = nearSlot();
          s.classList.add('still');
          const saved = await St.place(b.id, k.dataset.shape, bytes, s.querySelector('.front'), s.querySelector('.sticker-flap'), (footTop) => { nearFit(footTop); nearMove(); });
          s.classList.remove('still');
          if (saved) paintStickers(i);
        }
        showOptions();
      }
    });
  }
  logoBtn.addEventListener('click', openNear);

  // A word at the foot of the screen, with one thing to do about it.
  function toast(text, label, run) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span></span>${label ? '<button type="button"></button>' : ''}`;
    t.firstChild.textContent = text;
    if (label) {
      const btn = t.querySelector('button');
      btn.textContent = label;
      btn.addEventListener('click', () => { t.remove(); run(); });
    }
    document.body.append(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 250); }, 4000);
  }

  // A notebook's colour, picked on the shelf: kept where that notebook reads
  // it, and its book here repainted. The Eye keeps its colour with the rest of
  // its things (df-app-color is only its copy for the first paint), so it's
  // changed there too; on its very first launch it takes df-app-color.
  function setColor(i, c) {
    const b = BOOKS[i];
    store.set(b.key, c);
    if (b.id === 'the-eye') {
      try {
        const raw = localStorage.getItem('dailies_state_v1');
        const st = raw && JSON.parse(raw);
        if (st && typeof st === 'object') {
          st.presentation = Object.assign({}, st.presentation, { color: c });
          localStorage.setItem('dailies_state_v1', JSON.stringify(st));
        }
      } catch (e) { /* it keeps its own colour */ }
    }
    paint(i);
  }
  function paint(i) {
    const b = BOOKS[i], c = colorOf(b);
    slots[i].style.setProperty('--c', COLORS[c]);
    slots[i].style.setProperty('--cover', `url("${b.cover(c)}")`);
    slots[i].style.setProperty('--block', `url("${b.block(c)}")`);
  }

  // ---------- Opening and shutting ----------
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms));
  function leave(url) {
    busy = true;
    location.href = url;
    // Back here with the browser's back button, the shelf is usable again (see pageshow).
  }

  // The zoom that makes book i's page fill the screen: the page's white, as it
  // is drawn now (book facing you, cover open), grown past every edge by OVER.
  function zoomFor(i) {
    // Measured where everything ends up, wherever a turn has got to.
    const keep = stage.style.transform;
    stage.classList.add('measuring');
    stage.style.transform = '';
    const r = slots[i].querySelector('.page').getBoundingClientRect();
    stage.style.transform = keep;
    void stage.offsetWidth;
    stage.classList.remove('measuring');
    // The page art is white inside a thin rim of the cover: about 2.6% at the
    // outer edge and 2% top and bottom (The Eye's is the widest of the three).
    const wl = r.left, wr = r.right - r.width * 0.026, wt = r.top + r.height * 0.02, wb = r.bottom - r.height * 0.02;
    const vw = window.innerWidth, vh = window.innerHeight;
    const sx = (vw + 2 * OVER) / (wr - wl), sy = (vh + 2 * OVER) / (wb - wt);
    return `translate(${-OVER - wl * sx}px, ${-OVER - wt * sy}px) scale(${sx}, ${sy})`;
  }

  async function openBook(i, at) {
    if (busy) return;
    busy = true;
    const b = BOOKS[i];
    const url = `${b.id}/${at ? `?at=${encodeURIComponent(at)}` : ''}`;
    store.set(FRONT_KEY, String(i));
    if (still()) { leave(url); return; }
    shelf.classList.add('away');
    const s = slots[i];
    facing = i;
    s.classList.add('still', 'turning', 'opening');
    render();
    s.classList.add('open');
    await wait(OPEN_MS);
    s.classList.remove('turning');
    stage.classList.remove('zooming');
    stage.style.setProperty('--zoom-ms', `${ZOOM_MS}ms`);
    const zoom = zoomFor(i);
    stage.classList.add('zooming');
    stage.style.transform = zoom;
    await wait(ZOOM_MS);
    leave(url);
  }

  // Back from a notebook: the page is still filling the screen, and shrinks
  // back down into the book, which shuts.
  async function shutBook(i) {
    busy = true;
    store.set(FRONT_KEY, String(i));
    const s = slots[i];
    facing = i;
    s.classList.add('still', 'open');
    shelf.classList.add('away');
    render();
    void stage.offsetWidth;
    stage.style.transform = zoomFor(i);
    void stage.offsetWidth;
    await wait(60);
    stage.style.setProperty('--zoom-ms', `${ZOOM_MS}ms`);
    stage.classList.add('zooming');
    stage.style.transform = '';
    await wait(ZOOM_MS);
    stage.classList.remove('zooming');
    s.classList.add('opening', 'turning');
    s.classList.remove('open');
    shelf.classList.remove('away');
    await wait(OPEN_MS * 0.7);
    facing = null;
    render();
    await wait(TURN_MS);
    s.classList.remove('opening', 'turning', 'still');
    busy = false;
  }

  function reset() {
    busy = false;
    facing = null;
    stage.classList.remove('zooming');
    stage.style.transform = '';
    shelf.classList.remove('away');
    slots.forEach((s) => s.classList.remove('still', 'open', 'opening', 'turning'));
    render();
  }

  // The covers' letters are in their pictures, so the books wait for those
  // (and the first pages) before they show: a second and a half at most.
  function whenArtIn(ms) {
    const urls = [...new Set(BOOKS.flatMap((b) => { const c = colorOf(b); return [b.cover(c), b.block(c)]; }))];
    const one = (u) => new Promise((done) => { const im = new Image(); im.onload = im.onerror = done; im.src = u; });
    // The stickers too, on the covers before the books show.
    const stickers = window.DFStickers ? window.DFStickers.ready.then(() => {
      BOOKS.forEach((b, i) => paintStickers(i));
      return Promise.all([...stage.querySelectorAll('.stickers img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    }) : null;
    return Promise.race([Promise.all([...urls.map(one), stickers]), wait(ms)]);
  }

  // ---------- Start ----------
  store.set('df-suite-in', null); // on the shelf, not in a notebook
  size();
  render();
  window.addEventListener('resize', () => { size(); render(); });
  const quiet = new URLSearchParams(location.search).has('still');
  if (fromAt >= 0) {
    history.replaceState(null, '', location.pathname);
    if (quiet || still()) { settle(); store.set(FRONT_KEY, String(fromAt)); }
    else { busy = true; shelf.classList.add('away'); }
  }
  stage.classList.add('waiting');
  whenArtIn(1500).then(() => {
    stage.classList.remove('waiting');
    if (fromAt >= 0 && !quiet && !still()) shutBook(fromAt);
  });
  // Coming back with the browser's back button can bring the page back as it
  // was left: mid-zoom. Put it right.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    store.set('df-suite-in', null);
    BOOKS.forEach((b, i) => paint(i));
    reset();
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
