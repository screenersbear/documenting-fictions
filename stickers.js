// Documenting Fictions: stickers on the notebooks' covers, on the shelf
// (user, 11-12). One kind of sticker for all four notebooks, kept here in one
// place, df-stickers, each one marked with the notebook it's on: a photo cut
// to a circle, square or rectangle, a little creased (the look Ref's had),
// stuck on the cover so it swings open with it. Past an edge it folds over:
// shaded where it bends, and on the right it runs on across the edge of the
// pages. Newest on top.
//
// Each notebook used to keep its own (Ref in its database, Contact Sheet as
// printed pictures in its meta, The Eye with its shoots); those are copied in
// here once, the first time the shelf opens with this, and left where they
// were.
//
//   df-stickers / stickers  { id, app, shape, ratio, x, y, size, seed, bytes, type, printed, createdAt }
//     x, y: its middle, as a share of the cover's width and height; size: its
//     width, as a share of the cover's width; ratio: width over height;
//     bytes: the photo (an ArrayBuffer: Safari's stored Blobs break when a
//     record is saved again); printed: the photo already has its paper edge
//     (Contact Sheet's prints), so none is drawn round it.
(function () {
  'use strict';
  const DB = 'df-stickers', STORE = 'stickers';
  const MOVED = 'df-stickers-moved';
  const COVER = 1000 / 1360; // the cover's width over its height
  const RATIO = { circle: 1, square: 1, rect: 1.5 };
  const ratioOf = (s) => (s.shape === 'rect' && s.ratio > 0 ? s.ratio : RATIO[s.shape] || 1);
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  // ---------- Keeping them ----------
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
    r.onsuccess = () => {
      const d = r.result;
      d.onversionchange = () => { d.close(); dbp = null; }; // a restore from backup.js
      ok(d);
    };
    r.onerror = () => { dbp = null; no(r.error); };
  }));
  async function write(fn) {
    const d = await open();
    return new Promise((ok, no) => {
      const t = d.transaction(STORE, 'readwrite');
      fn(t.objectStore(STORE));
      t.oncomplete = () => ok();
      t.onerror = t.onabort = () => no(t.error || new Error("The sticker wasn't saved."));
    });
  }
  async function readAll() {
    const d = await open();
    return new Promise((ok, no) => {
      const q = d.transaction(STORE).objectStore(STORE).getAll();
      q.onsuccess = () => ok(q.result || []);
      q.onerror = () => no(q.error);
    });
  }

  let all = [];
  const listOf = (app) => all.filter((s) => s.app === app).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));

  // ---------- The notebooks' own, copied in once ----------
  // Opens a notebook's database only if it's there: opening one that isn't
  // would make an empty one, which its notebook would then trip over.
  const openOld = (name) => new Promise((ok) => {
    let r;
    try { r = indexedDB.open(name); } catch (e) { ok(null); return; }
    r.onupgradeneeded = () => { try { r.transaction.abort(); } catch (e) { /* fine */ } };
    r.onsuccess = () => ok(r.result);
    r.onerror = (e) => { if (e && e.preventDefault) e.preventDefault(); ok(null); };
    r.onblocked = () => ok(null);
  });
  const get = (d, store, key) => new Promise((ok) => {
    try {
      if (!d.objectStoreNames.contains(store)) { ok(null); return; }
      const os = d.transaction(store).objectStore(store);
      const q = key === undefined ? os.getAll() : os.get(key);
      q.onsuccess = () => ok(q.result);
      q.onerror = () => ok(null);
    } catch (e) { ok(null); }
  });
  async function bytesOf(v) {
    if (!v) return null;
    if (v instanceof ArrayBuffer) return { bytes: v };
    if (ArrayBuffer.isView(v)) return { bytes: v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) };
    if (v instanceof Blob) return { bytes: await v.arrayBuffer(), type: v.type };
    if (typeof v === 'string') { const b = await (await fetch(v)).blob(); return { bytes: await b.arrayBuffer(), type: b.type }; }
    return null;
  }
  async function moveIn() {
    let ls = null;
    try { ls = localStorage; if (ls.getItem(MOVED)) return; } catch (e) { return; }
    const found = [];
    const add = async (app, s, photo, extra) => {
      try {
        const got = await bytesOf(photo);
        if (!got || !got.bytes || !got.bytes.byteLength) return;
        if (!['circle', 'square', 'rect'].includes(s.shape) || ![s.x, s.y, s.size].every(Number.isFinite)) return;
        found.push(Object.assign({
          id: `${app}-${s.id || uid()}`, app, shape: s.shape, x: s.x, y: s.y, size: s.size,
          seed: Number.isFinite(s.seed) ? s.seed : undefined, bytes: got.bytes, type: got.type || 'image/jpeg',
          createdAt: s.createdAt || new Date(Date.now() - 1e6 + found.length * 1000).toISOString(),
        }, extra));
      } catch (e) { console.warn('A sticker could not be copied over', e); }
    };
    // Ref: its database's stickers store; the photo as bytes, rectangles 3:2.
    const ref = await openOld('ref-notebook');
    if (ref) {
      for (const s of (await get(ref, 'stickers')) || []) await add('ref', s, s.bytes, s.shape === 'rect' ? { ratio: 1.5 } : {});
      ref.close();
    }
    // Contact Sheet: printed pictures in its meta; the plain print (no creases), which has its own paper edge.
    const cs = await openOld('contact-sheet');
    if (cs) {
      const row = await get(cs, 'meta', 'stickers');
      for (const s of (row && Array.isArray(row.value) ? row.value : [])) await add('contact-sheet', s, s.plain || s.image, { ratio: s.ratio > 0 ? s.ratio : undefined, printed: true });
      cs.close();
    }
    // The Eye: with its shoots in localStorage, the photos in starky-moodboards.
    let eyeList = [];
    try { const st = JSON.parse(ls.getItem('dailies_state_v1') || 'null'); eyeList = (st && st.presentation && Array.isArray(st.presentation.stickers)) ? st.presentation.stickers : []; } catch (e) { /* none */ }
    if (eyeList.length) {
      const eye = await openOld('starky-moodboards');
      if (eye) {
        for (const s of eyeList) {
          const imgs = await get(eye, 'images', `${s.id}__sticker`);
          const first = Array.isArray(imgs) ? imgs[0] : null;
          await add('the-eye', s, first && (first.src || first.blob || first), s.shape === 'rect' && s.ratio > 0 ? { ratio: s.ratio } : {});
        }
        eye.close();
      }
    }
    if (found.length) await write((os) => found.forEach((s) => os.put(s)));
    ls.setItem(MOVED, '1');
  }

  const ready = (async () => {
    try { await moveIn(); } catch (e) { console.warn('Stickers were not copied over', e); }
    try { all = await readAll(); } catch (e) { console.warn('Stickers could not be read', e); all = []; }
    return all;
  })();

  // ---------- Drawing them ----------
  function randomFrom(seed) { // seeded, so a sticker keeps its own creases from one launch to the next
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const seedOf = (s) => (Number.isFinite(s.seed) ? s.seed : [...String(s.id)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7));
  const creases = new Map();
  function creaseArt(seed, aspect) { // aspect: height over width
    const key = `${seed}:${aspect.toFixed(3)}`;
    if (creases.has(key)) return creases.get(key);
    const W = 480, H = Math.round(W * aspect), r = randomFrom(seed);
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    // Soft shadows lying on the paper, mostly around its edge.
    for (let i = 0, n = 3 + Math.floor(r() * 3); i < n; i++) {
      const side = Math.floor(r() * 4), along = r();
      const x = side === 0 ? 0 : side === 1 ? W : along * W, y = side === 2 ? 0 : side === 3 ? H : along * H;
      const rad = W * (0.18 + r() * 0.24);
      const shade = g.createRadialGradient(x, y, 0, x, y, rad);
      shade.addColorStop(0, `rgba(58, 50, 42, ${0.13 + r() * 0.12})`);
      shade.addColorStop(1, 'rgba(58, 50, 42, 0)');
      g.fillStyle = shade;
      g.fillRect(0, 0, W, H);
    }
    // Creases: soft, wide bends rather than lines, each a gentle curve from an
    // edge drawn only as blurred light and shade either side of it.
    const edgePoint = (side) => { const t = 0.1 + r() * 0.8; return [[t * W, 0], [W, t * H], [t * W, H], [0, t * H]][side]; };
    const soft = (path, width, blur, color, dx, dy) => { // a stroke's shadow only, blurred
      const far = W * 4;
      g.save();
      g.lineCap = 'round'; g.lineJoin = 'round';
      g.lineWidth = width;
      g.strokeStyle = '#000';
      g.shadowColor = color;
      g.shadowBlur = blur;
      g.shadowOffsetX = far + dx; g.shadowOffsetY = dy;
      g.translate(-far, 0);
      path();
      g.stroke();
      g.restore();
    };
    for (let i = 0, n = 2 + Math.floor(r() * 3); i < n; i++) {
      const side = Math.floor(r() * 4);
      const [ax, ay] = edgePoint(side);
      let [bx, by] = edgePoint((side + 1 + Math.floor(r() * 3)) % 4);
      const reach = 0.45 + r() * 0.55;
      bx = ax + (bx - ax) * reach; by = ay + (by - ay) * reach;
      const len = Math.hypot(bx - ax, by - ay), nx = -(by - ay) / len, ny = (bx - ax) / len;
      const bow = (r() - 0.5) * len * 0.18;
      const cx = (ax + bx) / 2 + nx * bow, cy = (ay + by) / 2 + ny * bow;
      const path = () => { g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); };
      const depth = 0.55 + r() * 0.45;
      const spread = W * (0.035 + r() * 0.035);
      const sx = nx > 0 ? 1 : -1, sy = ny > 0 ? 1 : -1; // the shaded side falls away from the light, top left
      const ox = sx * Math.abs(nx), oy = sy * Math.abs(ny);
      soft(path, spread * 0.9, spread * 1.3, `rgba(52, 44, 38, ${0.16 * depth})`, ox * spread * 0.6, oy * spread * 0.6);
      soft(path, spread * 0.35, spread * 0.6, `rgba(52, 44, 38, ${0.1 * depth})`, ox * spread * 0.25, oy * spread * 0.25);
      soft(path, spread * 0.7, spread * 1.1, `rgba(255, 255, 255, ${0.32 * depth})`, -ox * spread * 0.55, -oy * spread * 0.55);
    }
    const url = c.toDataURL('image/png');
    c.width = c.height = 0;
    creases.set(key, url);
    return url;
  }

  const urls = new Map();
  const urlOf = (s) => {
    if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: s.type || 'image/jpeg' })));
    return urls.get(s.id);
  };
  function make(s, src, onFlap) {
    const el = document.createElement('div');
    el.className = `sticker ${s.shape}${s.printed ? ' printed' : ''}`;
    el.style.setProperty('--r', String(ratioOf(s)));
    el.innerHTML = `<img class="photo" alt="" draggable="false" /><img class="crease" alt="" draggable="false" />${onFlap ? '' : '<i class="fold r" hidden></i><i class="fold l" hidden></i><i class="fold t" hidden></i><i class="fold b" hidden></i>'}`;
    el.querySelector('.photo').src = src;
    el.querySelector('.crease').src = creaseArt(seedOf(s), 1 / ratioOf(s));
    (onFlap ? placeOnFlap : seat)(el, s);
    return el;
  }
  // Where it sits, and the shading wherever it bends over an edge.
  const BEND = 0.075; // how far in the bend's shading reaches, of the cover's width
  function seat(el, s) {
    el.style.left = `${s.x * 100}%`;
    el.style.top = `${s.y * 100}%`;
    el.style.width = `${s.size * 100}%`;
    const w = s.size, h = (s.size / ratioOf(s)) / COVER;
    const left = s.x - w / 2, top = s.y - h / 2;
    const across = (BEND / w) * 100, down = ((BEND / COVER) / h) * 100;
    const set = (cls, on, css) => { const f = el.querySelector(`.fold.${cls}`); f.hidden = !on; if (on) Object.assign(f.style, css); };
    set('r', left + w > 1, { left: `${((1 - left) / w) * 100 - across}%`, width: `${across}%` });
    set('l', left < 0, { left: `${(-left / w) * 100}%`, width: `${across}%` });
    set('b', top + h > 1, { top: `${((1 - top) / h) * 100 - down}%`, height: `${down}%` });
    set('t', top < 0, { top: `${(-top / h) * 100}%`, height: `${down}%` });
  }
  function placeOnFlap(el, s) {
    el.style.left = `calc(${s.x - 1} * var(--W))`;
    el.style.top = `calc(${s.y} * var(--H))`;
    el.style.width = `calc(${s.size} * var(--W))`;
  }
  // A book's stickers: on its cover (front: the cover's face, holding a
  // .stickers layer) and round its fore-edge (flap).
  function paint(front, flap, app) {
    let layer = front.querySelector('.stickers');
    if (!layer) { layer = document.createElement('div'); layer.className = 'stickers'; front.append(layer); }
    const list = listOf(app);
    layer.replaceChildren(...list.map((s) => make(s, urlOf(s))));
    if (flap) flap.replaceChildren(...list.map((s) => make(s, urlOf(s), true)));
  }

  // ---------- A new one ----------
  // A photo from the library, straight from the tap (or iOS won't open it).
  function pick() {
    return new Promise((done) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.append(input);
      let settled = false;
      const end = (f) => { if (settled) return; settled = true; input.remove(); done(f || null); };
      input.addEventListener('change', () => end(input.files && input.files[0]));
      input.addEventListener('cancel', () => end(null));
      input.click();
    });
  }
  const twoFingers = (list) => (list.length > 1 ? Math.hypot(list[0][0] - list[1][0], list[0][1] - list[1][1]) : 0);
  const middle = (list) => [list.reduce((a, p) => a + p[0], 0) / list.length, list.reduce((a, p) => a + p[1], 0) / list.length];
  const foot = (no, yes) => `<div class="place-foot"><button type="button" class="sheet-btn" data-no>${no}</button><button type="button" class="sheet-btn primary" data-yes>${yes}</button></div>`;
  const loadImage = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Could not read that photo')); im.src = url; });
  const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Could not read that photo'))), type, q));

  // Fit the photo in the shape: drag and pinch it behind the window. Resolves
  // with the picture's bytes, or null if cancelled.
  async function crop(file, shape) {
    const ratio = RATIO[shape], aspect = 1 / ratio;
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const fit = Math.min(1, 2000 / Math.max(img.naturalWidth, img.naturalHeight));
    const pic = document.createElement('canvas');
    pic.width = Math.round(img.naturalWidth * fit);
    pic.height = Math.round(img.naturalHeight * fit);
    const pg = pic.getContext('2d');
    pg.imageSmoothingQuality = 'high';
    pg.drawImage(img, 0, 0, pic.width, pic.height);
    return new Promise((resolve) => {
      const layer = document.createElement('div');
      layer.className = 'crop-layer';
      layer.innerHTML = `<div class="crop-win ${shape}"></div>${foot('Cancel', 'Okay')}`;
      layer.prepend(pic);
      document.body.append(layer);
      const box = layer.getBoundingClientRect();
      const footTop = layer.querySelector('.place-foot').getBoundingClientRect().top - box.top;
      const ww = Math.min(box.width - 48, (footTop - 48) / aspect, 420), wh = ww * aspect;
      const wx = (box.width - ww) / 2, wy = (footTop - wh) / 2;
      Object.assign(layer.querySelector('.crop-win').style, { left: `${wx}px`, top: `${wy}px`, width: `${ww}px`, height: `${wh}px` });
      const least = Math.max(ww / pic.width, wh / pic.height);
      let k = least, tx = wx + (ww - pic.width * k) / 2, ty = wy + (wh - pic.height * k) / 2;
      const draw = () => {
        k = Math.min(least * 6, Math.max(least, k));
        tx = Math.min(wx, Math.max(wx + ww - pic.width * k, tx));
        ty = Math.min(wy, Math.max(wy + wh - pic.height * k, ty));
        pic.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      };
      draw();
      const pts = new Map();
      let grab = null;
      const start = () => {
        const list = [...pts.values()], [mx, my] = middle(list);
        grab = { k, px: (mx - tx) / k, py: (my - ty) / k, d: twoFingers(list) };
      };
      layer.addEventListener('pointerdown', (e) => {
        if (e.target.closest('.place-foot')) return;
        try { layer.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        start();
      });
      layer.addEventListener('pointermove', (e) => {
        if (!pts.has(e.pointerId)) return;
        pts.set(e.pointerId, [e.clientX, e.clientY]);
        const list = [...pts.values()], [mx, my] = middle(list);
        if (list.length > 1 && grab.d) k = grab.k * (twoFingers(list) / grab.d);
        tx = mx - grab.px * k; ty = my - grab.py * k;
        draw();
      });
      const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
      layer.addEventListener('pointerup', up);
      layer.addEventListener('pointercancel', up);
      layer.addEventListener('wheel', (e) => { e.preventDefault(); k *= e.deltaY < 0 ? 1.05 : 0.95; draw(); }, { passive: false });
      const finish = (bytes) => { layer.remove(); pic.width = pic.height = 0; resolve(bytes); };
      layer.querySelector('[data-no]').addEventListener('click', () => finish(null));
      layer.querySelector('[data-yes]').addEventListener('click', async () => {
        const sw = ww / k, sh = wh / k, out = Math.min(1000, Math.round(sw));
        const c = document.createElement('canvas');
        c.width = out; c.height = Math.round(out * aspect);
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(pic, (wx - tx) / k, (wy - ty) / k, sw, sh, 0, 0, c.width, c.height);
        try { finish(await (await toBlob(c, 'image/jpeg', 0.88)).arrayBuffer()); } catch (err) { finish(null); }
        c.width = c.height = 0;
      });
    });
  }

  // The new sticker on the cover, to drag and pinch until Okay or Cancel.
  // front/flap: that book's; laidOut(footTop): called once the buttons are
  // up, so the book can make room for them. Resolves true once it's saved.
  function stick(app, shape, bytes, front, flap, laidOut) {
    const draft = { id: uid(), app, shape, ratio: RATIO[shape], x: 0.5, y: 0.42, size: 0.44, seed: Math.floor(Math.random() * 2 ** 31), bytes, type: 'image/jpeg' };
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/jpeg' }));
    const layerOn = front.querySelector('.stickers');
    const el = make(draft, url);
    const onFlap = make(draft, url, true);
    layerOn.append(el);
    if (flap) flap.append(onFlap);
    const layer = document.createElement('div');
    layer.className = 'place-layer';
    layer.innerHTML = foot('Cancel', 'Okay');
    document.body.append(layer);
    if (laidOut) laidOut(layer.querySelector('.place-foot').getBoundingClientRect().top);
    const clampAll = () => {
      draft.size = Math.min(1.5, Math.max(0.12, draft.size));
      draft.x = Math.min(1.1, Math.max(-0.1, draft.x)); // past an edge it folds, but it's never lost
      draft.y = Math.min(1.1, Math.max(-0.1, draft.y));
      seat(el, draft);
      placeOnFlap(onFlap, draft);
    };
    const pts = new Map();
    let grab = null;
    const start = () => {
      const list = [...pts.values()], [mx, my] = middle(list), r = front.getBoundingClientRect();
      grab = { w: r.width, h: r.height, mx, my, x: draft.x, y: draft.y, size: draft.size, d: twoFingers(list) };
    };
    layer.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.place-foot')) return;
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
      if (list.length > 1 && grab.d) draft.size = grab.size * (twoFingers(list) / grab.d);
      clampAll();
    });
    const up = (e) => { if (pts.delete(e.pointerId) && pts.size) start(); };
    layer.addEventListener('pointerup', up);
    layer.addEventListener('pointercancel', up);
    layer.addEventListener('wheel', (e) => { e.preventDefault(); draft.size *= e.deltaY < 0 ? 1.05 : 0.95; clampAll(); }, { passive: false });
    return new Promise((resolve) => {
      const done = (saved) => { layer.remove(); el.remove(); onFlap.remove(); URL.revokeObjectURL(url); resolve(saved); };
      layer.querySelector('[data-no]').addEventListener('click', () => done(false));
      const yes = layer.querySelector('[data-yes]');
      yes.addEventListener('click', async () => {
        if (yes.disabled) return;
        yes.disabled = true;
        const s = Object.assign({}, draft, { createdAt: new Date().toISOString() });
        try {
          await write((os) => os.put(s));
          all.push(s);
          done(true);
        } catch (err) {
          console.error(err);
          yes.disabled = false;
          yes.textContent = 'Try again';
        }
      });
    });
  }

  async function remove(s) {
    await write((os) => os.delete(s.id));
    all = all.filter((x) => x.id !== s.id);
  }
  async function putBack(s) {
    await write((os) => os.put(s));
    if (!all.some((x) => x.id === s.id)) all.push(s);
  }

  window.DFStickers = { ready, list: listOf, paint, pick, crop, place: stick, remove, putBack, thumb: urlOf, ratioOf };
})();
