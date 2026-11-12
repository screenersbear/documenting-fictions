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
      id: 'ref', name: 'ref, do something', key: 'ref-notebook-book', color: 'ocean', light: '#ffd103',
      cover: (c) => `ref/art/${c}-cover.webp`, block: (c) => `ref/art/${c}-block.webp`,
      tabs: [['Mood boards', 15, 33.5, .11, .2, true, 'boards'], ['Tags', 50, 33.8, .115, -.2, false, 'tags']],
      logo: svg('<path d="M7.5 20.5v-17h5.2a4.4 4.4 0 0 1 0 8.8H7.5M12.4 12.3l5 8.2"/>'),
    },
    {
      id: 'the-eye', name: 'The Eye', key: 'df-app-color', color: 'mango', light: '#fff0ae', italic: true,
      cover: (c) => `the-eye/art/df-${c}-cover.webp`, block: (c) => `the-eye/art/df-${c}-block.webp`,
      tabs: [['Overview', 16, 16.6, .105, .3, true, 'overview'], ['Shoots', 33.55, 16.6, .11, .1, false, 'shoots'], ['Archive', 51.1, 16.6, .115, -.1, true, 'archive'], ['Stats', 68.65, 16.6, .12, -.3, false, 'stats']],
      logo: svg('<path d="M18 3.5H9.2a3 3 0 0 0-3 3v4.6M6 20.5h8.8a3 3 0 0 0 3-3v-4.6M8.7 6.6l6.6 10.8"/>'),
    },
    {
      id: 'contact-sheet', name: 'Contact Sheet', key: 'contact-sheet-book', color: 'orange', light: '#fee2d5',
      cover: (c) => `contact-sheet/art/${c}-cover.webp`, block: (c) => `contact-sheet/art/${c}-block.webp`,
      tabs: [['Table of contents', 21.7, 26.7, .085, .2, false, 'contents'], ['New chapter', 49.6, 25.9, .09, -.2, true, 'new']],
      logo: svg('<rect x="2.3" y="7.2" width="5.6" height="9.6" rx=".7"/><rect x="9.2" y="7.2" width="5.6" height="9.6" rx=".7"/><rect x="16.1" y="7.2" width="5.6" height="9.6" rx=".7"/><path d="M2.3 15.2l3.4-3 2.2 1.6M9.2 12.6l5.6-3.1M16.1 15.4l2.4-1.9 3.2 1.9"/><circle cx="19.3" cy="10.2" r=".8"/>'),
    },
    {
      id: 'overthoughts', name: 'Overthoughts', key: 'overthoughts-book', color: 'leaf', light: '#d4ecdb',
      cover: (c) => `overthoughts/art/${c}-cover.webp`, block: (c) => `overthoughts/art/${c}-block.webp`,
      tabs: [['Entries', 15, 22.6, .1, .25, true, 'entries'], ['Weekly log', 38.6, 22.6, .105, 0, false, 'week'], ['Reviews', 62.2, 22.6, .11, -.25, true, 'reviews']],
      logo: svg('<path d="M8.2 15.8a3.4 3.4 0 0 1-.5-6.8 4.5 4.5 0 0 1 8.6-1.5 3.5 3.5 0 0 1 2 8.3z"/><circle cx="6.6" cy="19" r="1.2"/><circle cx="4" cy="21.3" r=".6"/>'),
    },
  ];
  const N = BOOKS.length;
  const STEP = 360 / N;
  const OPEN_MS = 900, ZOOM_MS = 760, TURN_MS = 420;
  const OVER = 12; // how far the page's white goes past every edge of the screen once it has grown
  const FRONT_KEY = 'df-suite-front';

  const shelf = document.getElementById('shelf');
  const stage = document.getElementById('stage');
  const dotsEl = document.getElementById('dots');
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
      <div class="leaf"><div class="face front" role="img" aria-label="${b.name}"></div><div class="face inside"></div><div class="face fog"></div><div class="lip"></div></div>
    </div></div>`;
    slot.querySelector('.float').style.animationDelay = `${-1.7 * i}s`;
    slot.querySelector('.ground').style.animationDelay = `${-1.7 * i}s`;
    stage.append(slot);
    return slot;
  });
  dotsEl.innerHTML = BOOKS.map(() => '<span class="dot"></span>').join('');
  const dots = [...dotsEl.children];

  // ---------- Size ----------
  let W = 242;
  function size() {
    const vw = window.innerWidth, vh = window.innerHeight;
    W = Math.round(Math.max(150, Math.min(vw * 0.62, (vh - 240) / 1.36 / 1.1, 300)));
    stage.style.setProperty('--W', `${W}px`);
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

  function place(i) {
    const r = wrap((i - pos) * STEP) * Math.PI / 180;
    const back = (1 - Math.cos(r)) / 2;
    const x = W * 0.95 * Math.sin(r), y = -0.22 * W * back, z = W * 1.9 * (Math.cos(r) - 1);
    const yaw = facing === i ? 0 : -20 * (0.25 + 0.75 * (1 + Math.cos(r)) / 2) - 10 * Math.sin(r);
    const s = slots[i];
    s.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateY(${yaw.toFixed(2)}deg)`;
    s.style.zIndex = String(Math.round(100 + Math.cos(r) * 100));
    s.querySelector('.fog').style.opacity = (0.2 * back).toFixed(3);
  }
  let shownFront = -1;
  function render() {
    for (let i = 0; i < N; i++) place(i);
    const at = mod(Math.round(pos));
    dots.forEach((d, k) => d.classList.toggle('on', k === at));
    if (at !== shownFront) showLogo(at);
  }
  function showLogo(at) {
    const first = shownFront < 0;
    shownFront = at;
    const put = () => {
      logoBtn.innerHTML = BOOKS[at].logo;
      logoBtn.setAttribute('aria-label', `${BOOKS[at].name}: options`);
      logoBtn.classList.remove('swap');
    };
    if (first) { put(); return; }
    logoBtn.classList.add('swap');
    clearTimeout(showLogo.t);
    showLogo.t = setTimeout(put, 180);
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
    const dx = e.clientX - d.x;
    if (!d.moved && Math.hypot(dx, e.clientY - d.y) > 6) d.moved = true;
    if (!d.moved) return;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = 0.7 * d.v + 0.3 * ((e.clientX - d.lastX) / dt);
    d.lastX = e.clientX; d.lastT = e.timeStamp;
    pos = d.pos - dx / (W * 1.15);
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
        go(Math.round(pos) + wrap((d.slot - Math.round(pos)) * STEP) / STEP);
        return;
      }
      if (d.slot === front) { openBook(front, d.at); return; }
      go(Math.round(pos));
      return;
    }
    const fling = -d.v * 260 / (W * 1.15);
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
  logoBtn.addEventListener('click', () => {
    if (busy) return;
    const b = BOOKS[mod(Math.round(pos))];
    leave(`${b.id}/?options`);
  });

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

  // ---------- Start ----------
  store.set('df-suite-in', null); // on the shelf, not in a notebook
  size();
  render();
  window.addEventListener('resize', () => { size(); render(); });
  if (fromAt >= 0) {
    const quiet = new URLSearchParams(location.search).has('still');
    history.replaceState(null, '', location.pathname);
    if (quiet || still()) { settle(); store.set(FRONT_KEY, String(fromAt)); }
    else shutBook(fromAt);
  }
  // Coming back with the browser's back button can bring the page back as it
  // was left: mid-zoom. Put it right.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    store.set('df-suite-in', null);
    BOOKS.forEach((b, i) => {
      const c = colorOf(b);
      slots[i].style.setProperty('--c', COLORS[c]);
      slots[i].style.setProperty('--cover', `url("${b.cover(c)}")`);
      slots[i].style.setProperty('--block', `url("${b.block(c)}")`);
    });
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
