// Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.

// ---- components/colors.js ----
// The seven notebook colours (DESIGN.md 4.2), as the shelf paints them: each
// one's band colour (a cover), its partner (what's drawn on the cover: the
// name and the mark), its light step (a quarter of it on paper: the light
// side tabs) and its name in the Options sheet. (Loaded before app.js.)
window.ShelfColors = {
  orange: { band: '#FF8A3D', partner: '#313D45', light: '#FBDEC8', name: 'Orange' },
  mango: { band: '#FFD100', partner: '#313D45', light: '#FBF0B9', name: 'Mango' },
  berry: { band: '#CC2E8A', partner: '#E2E600', light: '#EEC7DC', name: 'Berry' },
  fern: { band: '#13803F', partner: '#FFD100', light: '#C0DCC9', name: 'Fern' },
  ocean: { band: '#0A4FD6', partner: '#FFAFAB', light: '#BECFEF', name: 'Ocean' },
  leaf: { band: '#14BFA0', partner: '#A1062A', light: '#C0EBE1', name: 'Leaf' },
  ink: { band: '#313D45', partner: '#FFD100', light: '#C8CBCA', name: 'Black' },
};
;

// ---- components/books.js ----
// The four notebooks on the shelf: where each one lives, where it keeps its
// colour, the mark on its cover, the line about it under the shelf, and the
// tabs on its fore-edge. (Loaded before app.js.)
(function () {
  'use strict';
  // The marks (DESIGN.md 7), drawn in the cover's partner colour (--p) with
  // paper or white.
  const P = 'style="fill:var(--p)"';
  const MARKS = {
    ref: `<rect width="12" height="12" ${P}/><rect x="12" width="12" height="12" fill="#FFFFFF"/><rect y="12" width="12" height="12" fill="#FFFFFF"/><rect x="12" y="12" width="12" height="12" ${P}/>`,
    eye: '<circle cx="12" cy="12" r="10.25" fill="none" stroke-width="3.5" style="stroke:var(--p)"/><circle cx="12" cy="12" r="4" fill="#FAFAF7"/>',
    layouts: `<rect x="1" y="4" width="6.5" height="16" ${P}/><rect x="8.75" y="6.4" width="6.5" height="13.6" fill="#FAFAF7"/><rect x="16.5" y="8.6" width="6.5" height="11.4" ${P}/>`,
    overthoughts: `<circle cx="12" cy="6.5" r="5.5" fill="#FAFAF7"/><circle cx="12" cy="17.5" r="5.5" fill="#FAFAF7"/><circle cx="6.5" cy="12" r="5.5" fill="#FAFAF7"/><circle cx="17.5" cy="12" r="5.5" fill="#FAFAF7"/><circle cx="12" cy="12" r="2.6" ${P}/>`,
  };
  // colors: the ones its Options sheet offers, its own first.
  // tabs: [label, top %, height %, width (of W), depth (of T), light?, where it opens]
  window.ShelfBooks = [
    {
      id: 'ref', name: 'ref, do something', short: 'Ref', line: 'Tag photos, build mood boards', key: 'ref-notebook-book', color: 'ocean',
      colors: ['ocean', 'orange', 'mango', 'berry', 'fern', 'leaf', 'ink'], mark: MARKS.ref,
      block: (c) => `ref/art/${c}-block.webp`,
      tabs: [['Mood boards', 5.7, 17.7, .11, .2, true, 'boards'], ['Tags', 24.4, 17.7, .115, -.2, false, 'tags']],
    },
    {
      id: 'the-eye', name: 'The Eye', short: 'The Eye', line: 'Plan and run your shoots', key: 'df-app-color', color: 'mango',
      colors: ['mango', 'orange', 'berry', 'fern', 'ocean', 'leaf', 'ink'], mark: MARKS.eye,
      block: (c) => `the-eye/art/df-${c}-block.webp`,
      tabs: [['Overview', 4.4, 18.2, .1, .3, true, 'overview'], ['Shoots', 23.3, 18.2, .105, .15, false, 'shoots'], ['Reflections', 42.2, 18.2, .11, 0, true, 'journal'], ['Archive', 61.5, 18.2, .115, -.15, false, 'archive'], ['Stats', 80.4, 18.2, .12, -.3, true, 'stats']],
    },
    {
      id: 'contact-sheet', name: 'Layouts', short: 'Layouts', line: 'Lay out carousels and Stories', key: 'contact-sheet-book', color: 'berry',
      colors: ['berry', 'orange', 'mango', 'fern', 'ocean', 'leaf', 'ink'], mark: MARKS.layouts,
      block: (c) => `contact-sheet/art/${c}-block.webp`,
      tabs: [['All layouts', 5.7, 26, .085, .2, true, 'contents'], ['New layout', 32.5, 20, .09, -.2, false, 'new']],
    },
    {
      id: 'overthoughts', name: 'Overthoughts', short: 'Overthoughts', line: 'Think things over', key: 'overthoughts-book', color: 'leaf',
      colors: ['leaf', 'orange', 'mango', 'berry', 'fern', 'ocean', 'ink'], mark: MARKS.overthoughts,
      block: (c) => `overthoughts/art/${c}-block.webp`,
      tabs: [['Entries', 5.7, 17.7, .11, .2, true, 'entries'], ['Reviews', 24.4, 17.7, .115, -.2, false, 'reviews']],
    },
  ];
})();
;

// ---- data/sticker-store.js ----
// Keeping the shelf's stickers: their own database (df-stickers), and the
// notebooks' old stickers copied in once. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addStickerStore = function addStickerStore(ed) {
  'use strict';
  Object.assign(ed, { write });
  // ---------- Keeping them ----------
  let dbp = null;
  const open = () => dbp || (dbp = new Promise((ok, no) => {
    const r = indexedDB.open(ed.DB, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(ed.STORE)) r.result.createObjectStore(ed.STORE, { keyPath: 'id' }); };
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
      const t = d.transaction(ed.STORE, 'readwrite');
      fn(t.objectStore(ed.STORE));
      t.oncomplete = () => ok();
      t.onerror = t.onabort = () => no(t.error || new Error("The sticker wasn't saved."));
    });
  }
  async function readAll() {
    const d = await open();
    return new Promise((ok, no) => {
      const q = d.transaction(ed.STORE).objectStore(ed.STORE).getAll();
      q.onsuccess = () => ok(q.result || []);
      q.onerror = () => no(q.error);
    });
  }

  ed.all = [];
  const listOf = (app) => ed.all.filter((s) => s.app === app).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))); ed.listOf = listOf;

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
    try { ls = localStorage; if (ls.getItem(ed.MOVED)) return; } catch (e) { return; }
    const found = [];
    const add = async (app, s, photo, extra) => {
      try {
        const got = await bytesOf(photo);
        if (!got || !got.bytes || !got.bytes.byteLength) return;
        if (!['circle', 'square', 'rect'].includes(s.shape) || ![s.x, s.y, s.size].every(Number.isFinite)) return;
        found.push(Object.assign({
          id: `${app}-${s.id || ed.uid()}`, app, shape: s.shape, x: s.x, y: s.y, size: s.size,
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
    ls.setItem(ed.MOVED, '1');
  }

  const ready = (async () => {
    try { await moveIn(); } catch (e) { console.warn('Stickers were not copied over', e); }
    try { ed.all = await readAll(); } catch (e) { console.warn('Stickers could not be read', e); ed.all = []; }
    return ed.all;
  })(); ed.ready = ready;
};
;

// ---- components/sticker-art.js ----
// Drawing a sticker: its picture, its vinyl, its edge, and where it sits on a
// cover (folding over an edge). (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addStickerArt = function addStickerArt(ed) {
  'use strict';
  Object.assign(ed, { make, seat, placeOnFlap, paint });
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
  // The vinyl (round 4): every sticker looks like printed vinyl stuck on,
  // mostly flat with a fine grain, small wrinkles gathering toward its edges,
  // a satin sheen on their ridges, one faint fold and a soft gloss. Each
  // layer is a picture made once per sticker (its seed keeps it the same),
  // laid over the photo in soft light, so a flat patch is mid grey and the
  // photo keeps its colours and darks. Shelf only: never on photos in the apps.
  const svgSrc = (w, h, body, box = `0 0 ${w} ${h}`, fit = '') => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${box}"${fit}>${body}</svg>`)}`;
  const lit = (light) => `<filter id="f" x="0" y="0" width="100%" height="100%">${light}</filter><rect width="100%" height="100%" filter="url(#f)"/>`;
  const vinyls = new Map();
  function vinylArt(seed, aspect) { // aspect: height over width
    const key = `${seed}:${aspect.toFixed(3)}`;
    if (vinyls.has(key)) return vinyls.get(key);
    const w = 110, h = Math.max(20, Math.round(w * aspect)), n = Math.abs(seed % 9973), r = randomFrom(seed);
    const wrinkles = `<feTurbulence type="fractalNoise" baseFrequency=".045 .085" numOctaves="4" seed="${n + 5}" result="n0"/><feGaussianBlur in="n0" stdDeviation=".35" result="n"/>`;
    // One curving fold, edge to edge, at low strength.
    const across = r() < 0.5, a = 15 + r() * 70, b = 15 + r() * 70, c1 = 25 + r() * 25, c2 = 50 + r() * 25, bend = (r() - 0.5) * 30;
    const d = across
      ? `M-2 ${a.toFixed(1)} C${c1.toFixed(1)} ${(a + bend).toFixed(1)} ${c2.toFixed(1)} ${(b - bend).toFixed(1)} 102 ${b.toFixed(1)}`
      : `M${a.toFixed(1)} -2 C${(a + bend).toFixed(1)} ${c1.toFixed(1)} ${(b - bend).toFixed(1)} ${c2.toFixed(1)} ${b.toFixed(1)} 102`;
    const art = {
      grain: svgSrc(w, h, lit(`<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${n}" result="n"/><feDiffuseLighting in="n" surfaceScale=".7" diffuseConstant=".65" lighting-color="#FFFFFF"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting>`)),
      wrinkle: svgSrc(w, h, lit(`${wrinkles}<feDiffuseLighting in="n" surfaceScale="3.2" diffuseConstant=".78" lighting-color="#FFFFFF"><feDistantLight azimuth="225" elevation="40"/></feDiffuseLighting>`)),
      sheen: svgSrc(w, h, lit(`${wrinkles}<feSpecularLighting in="n" surfaceScale="3.2" specularConstant=".8" specularExponent="30" lighting-color="#FFFFFF" result="s"><feDistantLight azimuth="225" elevation="35"/></feSpecularLighting><feColorMatrix in="s" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  .33 .33 .33 0 0"/>`)),
      fold: svgSrc(w, h, `<filter id="w" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter><filter id="t" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter><path d="${d}" fill="none" stroke="rgba(0,0,0,.07)" stroke-width="18" filter="url(#w)" transform="translate(4 3)"/><path d="${d}" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2" filter="url(#t)"/><path d="${d}" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2.6" filter="url(#t)" transform="translate(-2 -1.6)"/>`, '0 0 100 100', ' preserveAspectRatio="none"'),
    };
    vinyls.set(key, art);
    return art;
  }

  const urls = new Map();
  const urlOf = (s) => {
    if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: s.type || 'image/jpeg' })));
    return urls.get(s.id);
  }; ed.urlOf = urlOf;
  function make(s, src, onFlap) {
    const el = document.createElement('div');
    el.className = `sticker ${s.shape}${s.printed ? ' printed' : ''}${s.edge === 'outline' ? ' outline' : ''}`;
    el.style.setProperty('--r', String(ed.ratioOf(s)));
    el.style.setProperty('--turn', `${Number(s.turn) || 0}deg`);
    const v = vinylArt(seedOf(s), 1 / ed.ratioOf(s));
    const layer = (cls) => `<img class="vinyl ${cls}" src="${v[cls]}" alt="" draggable="false" />`;
    el.innerHTML = `<img class="photo" alt="" draggable="false" />${layer('grain')}${layer('wrinkle')}${layer('sheen')}${layer('fold')}<i class="gloss"></i>${onFlap ? '' : '<i class="bend r" hidden></i><i class="bend l" hidden></i><i class="bend t" hidden></i><i class="bend b" hidden></i>'}`;
    el.querySelector('.photo').src = src;
    (onFlap ? placeOnFlap : seat)(el, s);
    return el;
  }
  // Where it sits, and the shading wherever it bends over an edge.
  const BEND = 0.075; // how far in the bend's shading reaches, of the cover's width
  function seat(el, s) {
    el.style.left = `${s.x * 100}%`;
    el.style.top = `${s.y * 100}%`;
    el.style.width = `${s.size * 100}%`;
    const w = s.size, h = (s.size / ed.ratioOf(s)) / ed.COVER;
    const left = s.x - w / 2, top = s.y - h / 2;
    const across = (BEND / w) * 100, down = ((BEND / ed.COVER) / h) * 100;
    const set = (cls, on, css) => { const f = el.querySelector(`.bend.${cls}`); f.hidden = !on; if (on) Object.assign(f.style, css); };
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
    const list = ed.listOf(app);
    layer.replaceChildren(...list.map((s) => make(s, urlOf(s))));
    if (flap) flap.replaceChildren(...list.map((s) => make(s, urlOf(s), true)));
  }
};
;

// ---- components/sticker-new.js ----
// A new sticker: a photo picked and read (placing it: components/sticker-place.js);
// taking one off, and putting it back. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addNewSticker = function addNewSticker(ed) {
  'use strict';
  Object.assign(ed, { pick, photo, remove, putBack });
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
  const loadImage = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Could not read that photo')); im.src = url; });
  const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Could not read that photo'))), type, q));

  // The whole photo, no bigger than it's ever shown (round 5: its shape is
  // picked while placing it, and the photo fills that shape from the middle).
  async function photo(file) {
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const fit = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * fit));
    c.height = Math.max(1, Math.round(img.naturalHeight * fit));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    try { return await (await toBlob(c, 'image/jpeg', 0.88)).arrayBuffer(); } finally { c.width = c.height = 0; }
  }

  async function remove(s) {
    await ed.write((os) => os.delete(s.id));
    ed.all = ed.all.filter((x) => x.id !== s.id);
  }
  async function putBack(s) {
    await ed.write((os) => os.put(s));
    if (!ed.all.some((x) => x.id === s.id)) ed.all.push(s);
  }
};
;

// ---- components/sticker-place.js ----
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
;

// ---- components/stickers.js ----
// Documenting Fictions: stickers on the notebooks' covers, on the shelf
// (user, 11-12). One kind of sticker for all four notebooks, kept here in one
// place, df-stickers, each one marked with the notebook it's on: a photo in
// a circle, square or card (rect), in vinyl (the look Ref's had, round 4),
// stuck on the cover so it swings open with it. Past an edge it folds over:
// shaded where it bends, and on the right it runs on across the edge of the
// pages. Newest on top.
//
// Each notebook used to keep its own (Ref in its database, Contact Sheet as
// printed pictures in its meta, The Eye with its shoots); those are copied in
// here once, the first time the shelf opens with this, and left where they
// were.
//
//   df-stickers / stickers  { id, app, shape, ratio, x, y, size, turn, seed, bytes, type, printed, edge, createdAt }
//     x, y: its middle, as a share of the cover's width and height; size: its
//     width, as a share of the cover's width; turn: degrees, clockwise (round 5;
//     missing on older ones, which stand straight); ratio: width over height;
//     bytes: the photo, filling the shape from its middle (round 5 keeps it
//     whole; older ones were cut to their shape) (an ArrayBuffer: Safari's stored Blobs break when a
//     record is saved again); printed: the photo already has its paper edge
//     (Contact Sheet's prints), so none is drawn round it; edge: 'white' (or
//     missing) for the white die-cut edge, 'outline' for a thin ink line;
//     seed: picked when it's made, so its vinyl's wrinkles and fold never change.
(function () {
  'use strict';
  const ed = {}; // what the stickers' parts share (the files it runs below)
  const DB = 'df-stickers', STORE = 'stickers'; ed.DB = DB; ed.STORE = STORE;
  const MOVED = 'df-stickers-moved'; ed.MOVED = MOVED;
  const COVER = 1000 / 1360; ed.COVER = COVER; // the cover's width over its height
  const RATIO = { circle: 1, square: 1, rect: 1.5 }; ed.RATIO = RATIO;
  const ratioOf = (s) => (s.shape === 'rect' && s.ratio > 0 ? s.ratio : RATIO[s.shape] || 1); ed.ratioOf = ratioOf;
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; ed.uid = uid;
  window.StickerParts.addStickerStore(ed);
  window.StickerParts.addStickerArt(ed);
  window.StickerParts.addNewSticker(ed);
  window.StickerParts.addPlacing(ed);

  window.DFStickers = { ready: ed.ready, list: ed.listOf, paint: ed.paint, pick: ed.pick, photo: ed.photo, place: ed.stick, remove: ed.remove, putBack: ed.putBack, thumb: ed.urlOf, ratioOf };
})();
;

// ---- pages/shelf-turntable.js ----
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
;

// ---- pages/shelf-hands.js ----
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
;

// ---- pages/shelf-caption.js ----
// Under the shelf: the name of the notebook in front, a line about it, a dot
// for each notebook (the one in front long), and Options for it. Changed as
// the shelf turns. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addCaption = function addCaption(ed) {
  'use strict';
  const name = document.getElementById('frontName');
  const line = document.getElementById('frontLine');
  const dots = document.getElementById('frontDots');
  dots.innerHTML = ed.BOOKS.map(() => '<span></span>').join('');
  // Options (round 5): a disc in the front notebook's colour, three dots in
  // its partner colour shrinking left to right.
  ed.optionsBtn.className = 'opts-disc';
  ed.optionsBtn.innerHTML = '<i></i><i></i><i></i>';
  let shown = '';
  // Called on every frame of a turn (pages/shelf-turntable.js render), so it
  // only writes when the book in front (or its colour) changes.
  ed.caption = function caption() {
    const at = ed.mod(Math.round(ed.pos));
    const b = ed.BOOKS[at], c = ed.COLORS[ed.colorOf(b)];
    if (`${at} ${c.band}` === shown) return;
    shown = `${at} ${c.band}`;
    ed.optionsBtn.style.setProperty('--disc', c.band);
    ed.optionsBtn.style.setProperty('--dots', c.partner);
    name.textContent = b.short;
    line.textContent = b.line;
    [...dots.children].forEach((d, i) => d.classList.toggle('on', i === at));
    ed.optionsBtn.setAttribute('aria-label', `Options for ${b.short}`);
  };
};
;

// ---- pages/shelf-marks.js ----
// The marks at the shelf's right edge (round 2): one for each way the books
// can stand, the one in use long, so the swipe up or down can be found. After
// a swipe its name shows beside them for a moment. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addShapeMarks = function addShapeMarks(ed) {
  'use strict';
  const NAMES = { ring: 'Ring', dominoes: 'Dominoes', row: 'Row', spread: 'Spread' };
  const marks = document.createElement('div');
  marks.className = 'shape-marks';
  marks.setAttribute('role', 'img');
  marks.innerHTML = ed.LAYOUTS.map(() => '<i></i>').join('');
  const name = document.createElement('span');
  name.className = 'shape-name';
  name.setAttribute('aria-live', 'polite');
  ed.shelf.append(marks, name);
  let hide = 0;
  // say: a swipe just changed it, so its name shows for 1.5 s.
  ed.shapeMarks = function shapeMarks(say) {
    const at = ed.LAYOUTS.indexOf(ed.layout);
    [...marks.children].forEach((m, i) => m.classList.toggle('on', i === at));
    marks.setAttribute('aria-label', `Arrangement: ${NAMES[ed.layout].toLowerCase()}, ${at + 1} of ${ed.LAYOUTS.length}`);
    if (!say) return;
    name.textContent = NAMES[ed.layout];
    name.classList.add('in');
    clearTimeout(hide);
    hide = setTimeout(() => name.classList.remove('in'), 1500);
  };
  ed.shapeMarks(false);
};
;

// ---- pages/shelf-options.js ----
// The notebook in front up close, with its options under it: its colour,
// stickers for its cover, and Back up all four. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addOptions = function addOptions(ed) {
  'use strict';
  Object.assign(ed, { paintStickers });
  // Options (the ring button under the shelf): the notebook in front comes up
  // close, on its own, with its options under it: its colour (the book
  // changes as you pick) and stickers for its cover. Back up all four is
  // there too.
  const NEAR_MS = 560;
  const glyph = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const CLOSE = glyph('<path d="M6 6l12 12M18 6L6 18"/>');
  const TRASH = glyph('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>');
  const PLUS = glyph('<path d="M12 5v14M5 12h14"/>');
  const nearSlot = () => ed.slots[ed.near];
  // As big as fits above `bottom` (px down the screen), in the middle of the
  // room there, no wider than the notebooks were on their own.
  function nearFit(bottom) {
    const vw = window.innerWidth;
    const top = (parseFloat(getComputedStyle(ed.shelf).paddingTop) || 0) + 20;
    const H = ed.W * 1.36;
    const k = Math.max(0.6, Math.min(Math.min(vw * 0.62, 300) / ed.W, (bottom - top - 30) / (H * 1.12)));
    const y0 = parseFloat(ed.stage.style.getPropertyValue('--y')) || window.innerHeight * 0.6;
    ed.nearAt = { y: top + (bottom - top) / 2 - y0, k };
  }
  function nearMove() {
    const s = nearSlot();
    s.classList.add('nearing');
    ed.place(ed.near);
    clearTimeout(nearMove.t);
    nearMove.t = setTimeout(() => s.classList.remove('nearing'), NEAR_MS + 40);
  }
  function openNear() {
    if (ed.busy || ed.near !== null || document.querySelector('.sheet-dim')) return;
    cancelAnimationFrame(ed.anim);
    clearTimeout(ed.go.t);
    ed.pos = ed.mod(Math.round(ed.pos));
    ed.render();
    ed.busy = true;
    ed.near = ed.pos;
    nearSlot().classList.add('near');
    ed.stage.classList.add('near');
    ed.shelf.classList.add('away');
    showOptions();
  }
  function leaveNear() {
    const s = nearSlot();
    ed.near = null;
    s.classList.add('nearing');
    ed.stage.classList.add('unnear');
    ed.stage.classList.remove('near');
    ed.shelf.classList.remove('away');
    ed.render();
    setTimeout(() => { s.classList.remove('nearing', 'near', 'still'); ed.stage.classList.remove('unnear'); ed.busy = false; }, NEAR_MS + 40);
  }
  function paintStickers(i) {
    if (window.DFStickers) window.DFStickers.paint(ed.slots[i].querySelector('.front'), ed.slots[i].querySelector('.sticker-flap'), ed.BOOKS[i].id);
  }

  function showOptions(view) {
    const i = ed.near, b = ed.BOOKS[i];
    const St = window.DFStickers;
    const dim = document.createElement('div');
    dim.className = 'sheet-dim near';
    dim.innerHTML = `<div class="sheet opts" role="dialog" aria-modal="true" aria-label="Options for ${b.short}"></div>`;
    const sheet = dim.firstElementChild;
    let shown = 'main';
    const drawMain = () => {
      shown = 'main';
      const now = ed.colorOf(b);
      const mine = St ? St.list(b.id) : [];
      sheet.innerHTML = `
        <div class="sheet-head"><h2>${b.short}</h2><button type="button" class="ring-btn" data-close aria-label="Close"><span>${CLOSE}</span></button></div>
        <span class="opt-label" id="optColorLabel">Notebook color</span>
        <div class="opt-colors" role="radiogroup" aria-labelledby="optColorLabel">${b.colors.map((k) => `<button type="button" class="opt-color" role="radio" data-color="${k}" aria-checked="${k === now}" style="--sw:${ed.COLORS[k].band};--sp:${ed.COLORS[k].partner}"><span class="opt-swatch"></span><span>${ed.COLORS[k].name}</span></button>`).join('')}</div>
        ${St ? `<div class="opt-label-row"><span class="opt-label">Stickers</span>${mine.length ? `<button type="button" class="label-btn" data-remove>${TRASH}Remove one</button>` : ''}</div>
        <button type="button" class="add-sticker" data-add>${PLUS}Add a sticker</button>
        <p class="opt-note">Pick a photo, then its shape and edge as you place it.</p>` : ''}
        <div class="opt-foot"><button type="button" class="sheet-btn" data-backup>Back up all four</button><button type="button" class="sheet-btn primary" data-close>Done</button></div>`;
    };
    const drawRemove = () => {
      shown = 'remove';
      const mine = St.list(b.id);
      if (!mine.length) { drawMain(); return; }
      sheet.innerHTML = `
        <div class="sheet-head"><h2>Remove a sticker</h2></div>
        <span class="opt-label opt-hint">Tap one to take it off</span>
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
        sheet.querySelectorAll('[data-color]').forEach((x) => x.setAttribute('aria-checked', String(x === c)));
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
        ed.toast('Sticker removed', 'Undo', async () => {
          await St.putBack(s);
          paintStickers(i);
          if (dim.isConnected) { (shown === 'remove' ? drawRemove : drawMain)(); nearFit(sheet.offsetTop); nearMove(); }
        });
        return;
      }
      // Add a sticker (round 5): a photo, then the placing screen, where its
      // shape and edge are picked (components/sticker-place.js).
      if (e.target.closest('[data-add]') && St) {
        const file = await St.pick(); // straight from the tap, or iOS won't open the picker
        if (!file) return;
        await hide();
        let bytes = null;
        try { bytes = await St.photo(file); } catch (err) { console.error(err); ed.toast('Could not read that photo'); }
        if (bytes) {
          const s = nearSlot();
          s.classList.add('still');
          const saved = await St.place(b.id, bytes, b.short, s.querySelector('.front'), s.querySelector('.sticker-flap'), (top) => { nearFit(top); nearMove(); });
          s.classList.remove('still');
          if (saved) paintStickers(i);
        }
        showOptions();
      }
    });
  }
  ed.optionsBtn.addEventListener('click', openNear);

  // A notebook's colour, picked on the shelf: kept where that notebook reads
  // it, and its book here repainted. The Eye keeps its colour with the rest of
  // its things (df-app-color is only its copy for the first paint), so it's
  // changed there too; on its very first launch it takes df-app-color.
  function setColor(i, c) {
    const b = ed.BOOKS[i];
    ed.store.set(b.key, c);
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
    ed.paint(i);
  }
};
;

// ---- components/toast.js ----
// The toast: a word at the foot of the screen, with one thing to do about it.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addToast = function addToast(ed) {
  'use strict';
  Object.assign(ed, { toast });
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
};
;

// ---- pages/shelf-open.js ----
// Opening a notebook from the shelf, and shutting it back onto the shelf:
// the cover swings, the page grows to fill the screen. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addOpening = function addOpening(ed) {
  'use strict';
  Object.assign(ed, { openBook, shutBook, reset });
  // ---------- Opening and shutting ----------
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches; ed.still = still;
  const wait = (ms) => new Promise((done) => setTimeout(done, ms)); ed.wait = wait;
  function leave(url) {
    ed.busy = true;
    location.href = url;
    // Back here with the browser's back button, the shelf is usable again (see pageshow).
  }

  // The zoom that makes book i's page fill the screen: the page's white, as it
  // is drawn now (book facing you, cover open), grown past every edge by OVER.
  function zoomFor(i) {
    // Measured where everything ends up, wherever a turn has got to.
    const keep = ed.stage.style.transform;
    ed.stage.classList.add('measuring');
    ed.stage.style.transform = '';
    const r = ed.slots[i].querySelector('.page').getBoundingClientRect();
    ed.stage.style.transform = keep;
    void ed.stage.offsetWidth;
    ed.stage.classList.remove('measuring');
    // The page art is white inside a thin rim of the cover: about 2.6% at the
    // outer edge and 2% top and bottom (The Eye's is the widest of the three).
    const wl = r.left, wr = r.right - r.width * 0.026, wt = r.top + r.height * 0.02, wb = r.bottom - r.height * 0.02;
    const vw = window.innerWidth, vh = window.innerHeight;
    const sx = (vw + 2 * ed.OVER) / (wr - wl), sy = (vh + 2 * ed.OVER) / (wb - wt);
    return `translate(${-ed.OVER - wl * sx}px, ${-ed.OVER - wt * sy}px) scale(${sx}, ${sy})`;
  }

  async function openBook(i, at) {
    if (ed.busy) return;
    ed.busy = true;
    const b = ed.BOOKS[i];
    const url = `${b.id}/${at ? `?at=${encodeURIComponent(at)}` : ''}`;
    ed.store.set(ed.FRONT_KEY, String(i));
    if (still()) { leave(url); return; }
    ed.shelf.classList.add('away');
    const s = ed.slots[i];
    ed.facing = i;
    s.classList.add('still', 'turning', 'opening');
    ed.render();
    s.classList.add('open');
    await wait(ed.OPEN_MS);
    s.classList.remove('turning');
    ed.stage.classList.remove('zooming');
    ed.stage.style.setProperty('--zoom-ms', `${ed.ZOOM_MS}ms`);
    const zoom = zoomFor(i);
    ed.stage.classList.add('zooming');
    ed.stage.style.transform = zoom;
    await wait(ed.ZOOM_MS);
    leave(url);
  }

  // Back from a notebook: the page is still filling the screen, and shrinks
  // back down into the book, which shuts.
  async function shutBook(i) {
    ed.busy = true;
    ed.store.set(ed.FRONT_KEY, String(i));
    const s = ed.slots[i];
    ed.facing = i;
    s.classList.add('still', 'open');
    ed.shelf.classList.add('away');
    ed.render();
    void ed.stage.offsetWidth;
    ed.stage.style.transform = zoomFor(i);
    void ed.stage.offsetWidth;
    await wait(60);
    ed.stage.style.setProperty('--zoom-ms', `${ed.ZOOM_MS}ms`);
    ed.stage.classList.add('zooming');
    ed.stage.style.transform = '';
    await wait(ed.ZOOM_MS);
    ed.stage.classList.remove('zooming');
    s.classList.add('opening', 'turning');
    s.classList.remove('open');
    ed.shelf.classList.remove('away');
    await wait(ed.OPEN_MS * 0.7);
    ed.facing = null;
    ed.render();
    await wait(ed.TURN_MS);
    s.classList.remove('opening', 'turning', 'still');
    ed.busy = false;
  }

  function reset() {
    ed.busy = false;
    ed.facing = null;
    ed.stage.classList.remove('zooming');
    ed.stage.style.transform = '';
    ed.shelf.classList.remove('away');
    ed.slots.forEach((s) => s.classList.remove('still', 'open', 'opening', 'turning'));
    ed.render();
  }
};
;

// ---- components/screen-fit.js ----
// Fits the shelf to the iPhone's screen when it's installed on the home screen.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addScreenFit = function addScreenFit(ed) {
  'use strict';
  // ---------- iPhone home-screen app ----------
  // Right after it opens, iOS 26 can leave the screen about a status bar
  // short at the bottom, and it draws nothing pinned below that edge: the
  // film roll then sat that much higher than the bar's icon in the notebooks.
  // Put right the notebooks' way (ref/components/screen-fit.js): iOS is made to measure again
  // by making the page a moment taller and scrolling a pixel and back. If it
  // stays short, the bar comes down by that much less instead. The bar waits
  // unseen until then (html.settled), so it never shows high and drops.
  let probe = null;
  // How far short of the screen's real bottom iOS has its bottom edge, in px (0 when it's right).
  function screenGap() {
    if (!probe) {
      probe = document.createElement('div');
      probe.setAttribute('aria-hidden', 'true');
      probe.style.cssText = 'position: fixed; left: 0; bottom: 0; width: 1px; height: 0; visibility: hidden; pointer-events: none; padding-top: env(safe-area-inset-top);';
      document.body.appendChild(probe);
    }
    const portrait = Math.abs(window.innerWidth - screen.width) < 2;
    const real = portrait ? screen.height : screen.width;
    ed.root.style.setProperty('--screen-h', `${Math.round(real)}px`);
    const under = parseFloat(getComputedStyle(probe).paddingTop) > 0;
    const gap = Math.round(real - probe.getBoundingClientRect().bottom);
    // Drawn under the status bar, the page's top is the screen's top, so any
    // gap is missing screen. Below it, one bar's height is normal and twice
    // that means a bar's height is missing.
    if (under) return gap > 8 && gap < 120 ? gap : 0;
    return gap > 76 && gap < 150 ? Math.round(gap / 2) : 0;
  }
  const pause = (ms) => new Promise((r) => setTimeout(r, ms)); // timers: animation frames stop while the app is put away
  let nudging = false;
  async function fitScreen() {
    if (nudging) return;
    nudging = true;
    if (screenGap()) ed.root.classList.remove('settled'); // short again (coming back): out of sight while it's put right
    for (let i = 0; i < 3 && screenGap(); i++) {
      ed.root.classList.add('ios-nudge');
      await pause(30);
      const y = window.scrollY;
      window.scrollTo(0, y + 1);
      await pause(40);
      window.scrollTo(0, y);
      await pause(120);
      ed.root.classList.remove('ios-nudge');
      await pause(200);
    }
    let gap = screenGap();
    // iOS can fall short again the moment the page can't scroll. If so, it's
    // left scrollable: the shelf is pinned, so nothing moves, and the
    // touchmove below keeps a finger from scrolling it.
    if (gap > 0) {
      ed.root.classList.add('ios-hold');
      await pause(40);
      window.scrollTo(0, 1);
      await pause(60);
      window.scrollTo(0, 0);
      await pause(200);
      gap = screenGap();
      if (gap > 0) ed.root.classList.remove('ios-hold');
    }
    ed.root.classList.toggle('is-short', gap > 0);
    if (gap > 0) ed.root.style.setProperty('--short-by', `${gap}px`);
    else ed.root.style.removeProperty('--short-by');
    nudging = false;
    ed.size();
    ed.render();
    ed.root.classList.add('settled');
  }
  if (!ed.iPhoneApp) ed.root.classList.add('settled');
  else setTimeout(() => ed.root.classList.add('settled'), 3500); // whatever happens, it shows
  if (ed.iPhoneApp) {
    let soonTimer = 0; // load, pageshow and coming back can all land together
    const soon = (ms) => { clearTimeout(soonTimer); soonTimer = setTimeout(fitScreen, ms); };
    window.addEventListener('load', () => soon(120));
    window.addEventListener('pageshow', () => soon(80));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(80); });
    window.addEventListener('orientationchange', () => soon(300));
    document.addEventListener('touchmove', (e) => {
      if (!ed.root.classList.contains('ios-hold') || e.touches.length > 1) return;
      for (let el = e.target; el && el !== document.body; el = el.parentElement) {
        const st = getComputedStyle(el);
        if (/auto|scroll/.test(st.overflowY) && el.scrollHeight > el.clientHeight) return;
        if (st.touchAction === 'none') return;
      }
      e.preventDefault();
    }, { passive: false });
  }
};
;

// ---- app.js ----
// Documenting Fictions: the shelf. Four notebooks on a turntable, each one its
// own app in its own folder. Swipe (or tap a book behind) to bring one round;
// tap the one in front and its cover swings open and its page grows to fill
// the screen, then that notebook takes over. Shutting a notebook comes back
// here (?from=<folder>) and the same thing plays backwards.
(function () {
  'use strict';
  const ed = {}; // what the shelf's parts share (the files it runs below)
  Object.assign(ed, { size });

  // The seven colours (components/colors.js) and the four notebooks (components/books.js).
  const COLORS = window.ShelfColors; ed.COLORS = COLORS;
  const BOOKS = window.ShelfBooks; ed.BOOKS = BOOKS;
  // A first page's picture for --block, as a whole address: a url() in a
  // --property is read from the stylesheet that uses it (in styles/), not
  // from this page.
  const artUrl = (path) => `url("${new URL(path, document.baseURI).href}")`;
  const N = BOOKS.length; ed.N = N;
  // The turntable: how wide and deep the ring is (of a book's width W), and how
  // far up the books further round sit. Wider than the first shelf (0.95, 1.9,
  // 0.22) so the books have room between them.
  const SIZE = 0.43, MAX_W = 240;
  const RING_X = 1.1, RING_Z = 2.9, LIFT = 0.34; ed.RING_X = RING_X; ed.RING_Z = RING_Z; ed.LIFT = LIFT;
  // The camera looks down on the ring a little (degrees), so you see over the
  // front book to the ones behind it. A book turned to face you (opening or
  // shutting) stands up straight again, so its page still fills the screen.
  const TILT = 10; ed.TILT = TILT;
  const STEP = 360 / N; ed.STEP = STEP;
  // Four ways to stand the books, swapped with a swipe up or down on them
  // (user, 11-12): the ring; dominoes (the front book low on the left, each
  // one behind it a little further up and to the right, all at one angle);
  // a row facing the screen, swiped through side to side; and Spread (round
  // 2): big and overlapping, lying back like covers spread on a table, the
  // one in front on top. The last one used is kept.
  const LAYOUTS = ['ring', 'dominoes', 'row', 'spread']; ed.LAYOUTS = LAYOUTS;
  // Spread, from the top book down, on a 390 x 844 screen (larger screens
  // keep its shape in the middle): [middle x, middle y, width, turn degrees].
  const SPREAD = [[0.254, 0.671, 0.692, -4], [0.823, 0.697, 0.641, 5], [0.167, 0.296, 0.692, -3], [0.808, 0.315, 0.641, 4]]; ed.SPREAD = SPREAD;
  const SPREAD_TILT = 16; ed.SPREAD_TILT = SPREAD_TILT; // each lies back this far (degrees)
  const RECENT_KEY = 'df-suite-recent'; ed.RECENT_KEY = RECENT_KEY; // the notebooks in front last, newest first (Spread's order)
  const LAYOUT_KEY = 'df-suite-layout'; ed.LAYOUT_KEY = LAYOUT_KEY;
  const DOM = { x0: -0.55, up: 0.1, dx: 0.4, dy: 0.32, dz: 0.55, yaw: -22 }; ed.DOM = DOM; // of W, per book behind the front one (up: the whole line, a little higher than the ring)
  const ROW_GAP = 1.22; ed.ROW_GAP = ROW_GAP; // of W, from one book to the next in the row
  const DRAG = { ring: 1.15, dominoes: 1.05, row: ROW_GAP, spread: 1.2 }; ed.DRAG = DRAG; // a finger this far (of W) moves the books one along
  const RESHAPE_MS = 620; ed.RESHAPE_MS = RESHAPE_MS;
  const OPEN_MS = 900, ZOOM_MS = 760, TURN_MS = 420; ed.OPEN_MS = OPEN_MS; ed.ZOOM_MS = ZOOM_MS; ed.TURN_MS = TURN_MS;
  const OVER = 12; ed.OVER = OVER; // how far the page's white goes past every edge of the screen once it has grown
  const FRONT_KEY = 'df-suite-front'; ed.FRONT_KEY = FRONT_KEY;

  const shelf = document.getElementById('shelf'); ed.shelf = shelf;
  const stage = document.getElementById('stage'); ed.stage = stage;
  const bar = document.getElementById('shelfBar');
  // Installed on an iPhone, iOS can open the page a status bar short at the
  // bottom and put it right a moment later (see fitScreen below). The books
  // are placed from the real screen, known from the first moment, so they
  // don't jump when it does.
  const root = document.documentElement; ed.root = root;
  const iPhoneApp = /iPhone|iPod/.test(navigator.userAgent) && (navigator.standalone === true || matchMedia('(display-mode: standalone)').matches); ed.iPhoneApp = iPhoneApp;
  const screenH = () => {
    if (!iPhoneApp) return window.innerHeight;
    return Math.abs(window.innerWidth - screen.width) < 2 ? screen.height : screen.width;
  };
  ed.optionsBtn = document.getElementById('optionsBtn');
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode: nothing kept */ } },
  }; ed.store = store;
  const colorOf = (b) => { const c = store.get(b.key); return c && Object.prototype.hasOwnProperty.call(COLORS, c) ? c : b.color; }; ed.colorOf = colorOf;

  // ---------- Building the books ----------
  // A book's colour: its cover (--c), what's drawn on it (--p), its light
  // tabs (--c25) and its first page.
  function paint(i) {
    const b = BOOKS[i], c = colorOf(b), s = slots[i];
    s.style.setProperty('--c', COLORS[c].band);
    s.style.setProperty('--p', COLORS[c].partner);
    s.style.setProperty('--c25', COLORS[c].light);
    s.style.setProperty('--block', artUrl(b.block(c)));
  }
  ed.paint = paint;
  const slots = BOOKS.map((b, i) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.dataset.i = i;
    slot.style.setProperty('--d', `${-1.7 * i}s`);
    const tabs = b.tabs.map(([label, top, h, w, z, light, at]) =>
      `<div class="tab${light ? ' light' : ''}" data-at="${at}" style="top:${top}%;height:${h}%;width:calc(var(--W) * ${w});transform:translateZ(calc(var(--T) * ${z}))"><span>${label}</span></div>`).join('');
    // The cover: flat colour with grain, the notebook's mark big in the
    // middle, its name near the foot, and any stickers.
    slot.innerHTML = `<div class="ground"></div><div class="float"><div class="book">
      <div class="face back"></div><div class="spine"></div><div class="top"></div><div class="foot"></div><div class="edge"></div>
      <div class="face page"></div>${tabs}
      <div class="leaf"><div class="face front" role="img" aria-label="${b.name}"><svg class="cover-mark" viewBox="0 0 24 24" aria-hidden="true">${b.mark}</svg><span class="cover-name">${b.short}</span><div class="stickers"></div></div><div class="face inside"></div><div class="face fog"></div><div class="lip"></div><div class="sticker-flap"></div></div>
    </div></div>`;
    slot.querySelector('.float').style.animationDelay = `${-1.7 * i}s`;
    slot.querySelector('.ground').style.animationDelay = `${-1.7 * i}s`;
    stage.append(slot);
    return slot;
  }); ed.slots = slots;
  BOOKS.forEach((b, i) => paint(i));

  // ---------- Size ----------
  ed.W = 242;
  function size() {
    const vw = window.innerWidth, vh = screenH();
    // Zoomed out a little from the first shelf (vw * 0.62, 300 at most), so the
    // wider ring below still shows all four books at once.
    ed.W = Math.round(Math.max(130, Math.min(vw * SIZE, (vh - 240) / 1.36 / 1.1, MAX_W)));
    stage.style.setProperty('--W', `${ed.W}px`);
    // Low on the screen, where a thumb is (user, 11-12): the front book's
    // middle a little under two thirds of the way down, so its top is just
    // over the middle of the screen, its foot well clear of its name under
    // it (64px, so its shadow fits). The camera's eye moves down with it, so
    // the books are seen from the same height as before.
    const barTop = window.innerHeight - bar.getBoundingClientRect().top; // from the laid-out bottom, where the bar is held
    const y = Math.max(vh * 0.4, Math.min(vh * 0.64, vh - barTop - 64 - ed.W * 0.68));
    stage.style.setProperty('--y', `${y.toFixed(1)}px`);
    ed.Y = y; ed.VH = vh; // where the books' middles are, and the screen's height (Spread places from them)
    stage.style.perspectiveOrigin = `50% ${(y - vh * 0.2).toFixed(1)}px`;
  }
  window.ShelfParts.addTurntable(ed);
  window.ShelfParts.addHands(ed);
  window.ShelfParts.addCaption(ed);
  window.ShelfParts.addShapeMarks(ed);
  window.ShelfParts.addOptions(ed);
  window.ShelfParts.addToast(ed);
  window.ShelfParts.addOpening(ed);

  // The books wait for their names' type, their first pages and their
  // stickers before they show: a second and a half at most.
  function whenArtIn(ms) {
    const urls = [...new Set(BOOKS.map((b) => b.block(colorOf(b))))];
    const one = (u) => new Promise((done) => { const im = new Image(); im.onload = im.onerror = done; im.src = u; });
    const type = document.fonts ? document.fonts.load('700 12px Figtree').catch(() => {}) : null;
    const stickers = window.DFStickers ? window.DFStickers.ready.then(() => {
      BOOKS.forEach((b, i) => ed.paintStickers(i));
      return Promise.all([...stage.querySelectorAll('.stickers img')].map((im) => (im.decode ? im.decode().catch(() => {}) : null)));
    }) : null;
    return Promise.race([Promise.all([...urls.map(one), type, stickers]), ed.wait(ms)]);
  }
  window.ShelfParts.addScreenFit(ed);

  // ---------- Start ----------
  store.set('df-suite-in', null); // on the shelf, not in a notebook
  size();
  ed.render();
  window.addEventListener('resize', () => { size(); ed.render(); });
  const quiet = new URLSearchParams(location.search).has('still');
  if (ed.fromAt >= 0) {
    history.replaceState(null, '', location.pathname);
    if (quiet || ed.still()) { ed.settle(); store.set(FRONT_KEY, String(ed.fromAt)); }
    else { ed.busy = true; shelf.classList.add('away'); }
  }
  // index.html hid the bar from the first paint while a book comes back;
  // .away hides it from here (until the book has shut), so it never shows
  // for a moment and then fades.
  requestAnimationFrame(() => document.documentElement.classList.remove('arriving'));
  stage.classList.add('waiting');
  whenArtIn(1500).then(() => {
    stage.classList.remove('waiting');
    if (ed.fromAt >= 0 && !quiet && !ed.still()) ed.shutBook(ed.fromAt);
  });
  // Coming back with the browser's back button can bring the page back as it
  // was left: mid-zoom. Put it right.
  window.addEventListener('pageshow', (e) => {
    if (!e.persisted) return;
    store.set('df-suite-in', null);
    BOOKS.forEach((b, i) => ed.paint(i));
    ed.reset();
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
;

// ---- shared/data/basics.js ----
// Documenting Fictions: the data helpers every notebook shares. This file:
// IndexedDB made a little plainer, plus small helpers (dates, ids, where the
// notebooks are). Loaded first; the files after it are in df-data.js's list.
//
// The master copies are in shared/data/ in the suite; tools/sync.py copies
// them into each notebook's data/shared/ folder, so a notebook copied out on
// its own still has them. Edit those, then run the sync.
//
// Each notebook keeps its own database, named for it: ref-notebook,
// contact-sheet, the-eye's starky-moodboards (its photos; its shoots are in
// localStorage, dailies_state_v1) and overthoughts. What one notebook hands
// another (a Ref board sent to a shoot in The Eye) goes in a database of its
// own, df-links, as a link saying where it came from and where it went:
// { id, fromApp, fromId, toApp, toId, type, createdAt }.
//
// The files share their inner helpers through window.DFDataParts; what the
// notebooks use is window.DFData, put together last by df-data.js.
(function () {
  'use strict';
  const parts = (window.DFDataParts = {});

  // ---------- IndexedDB, a little plainer ----------
  const ask = (r) => new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); });
  const finish = (tx) => new Promise((ok, no) => {
    tx.oncomplete = () => ok();
    tx.onabort = tx.onerror = () => no(tx.error || new Error("That wasn't saved."));
  });
  function open(name, version, upgrade) {
    return new Promise((ok, no) => {
      const r = indexedDB.open(name, version);
      if (upgrade) r.onupgradeneeded = (e) => upgrade(r.result, e.oldVersion, r.transaction);
      r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); ok(db); };
      r.onerror = () => no(r.error);
      r.onblocked = () => no(new Error("Close this app's other tabs and try again."));
    });
  }
  // Every row of a store, with its key (stores with keys of their own and stores without).
  function rows(db, store) {
    return new Promise((ok, no) => {
      const out = [];
      const r = db.transaction(store).objectStore(store).openCursor();
      r.onsuccess = () => { const c = r.result; if (!c) { ok(out); return; } out.push([c.key, c.value]); c.continue(); };
      r.onerror = () => no(r.error);
    });
  }
  const getOne = (db, store, key) => ask(db.transaction(store).objectStore(store).get(key));
  async function putMany(db, store, list) { // list of values, or [key, value] pairs for stores without a keyPath
    const tx = db.transaction(store, 'readwrite');
    const os = tx.objectStore(store);
    list.forEach((v) => { if (os.keyPath) os.put(v); else os.put(v[1], v[0]); });
    return finish(tx);
  }
  async function deleteOne(db, store, key) { const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(key); return finish(tx); }
  const hasText = (v) => typeof v === 'string' && v.trim() !== '';
  const nowIso = () => new Date().toISOString();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };
  // ---------- Where the notebooks are ----------
  const inSuite = () => !!window.DF_SUITE;
  // A link into another notebook of the suite (null on its own).
  const notebookUrl = (id, params) => (inSuite() ? `../${id}/${params ? `?${new URLSearchParams(params)}` : ''}` : null);

  Object.assign(parts, {
    ask, finish, open, rows, getOne, putMany, deleteOne, hasText, nowIso, todayStr, uid, store,
    inSuite, notebookUrl
  });
})();
;

// ---- shared/data/files.js ----
// Handing a file over: saving one to the phone or computer, and picking files
// to bring in.
(function () {
  'use strict';
  const parts = window.DFDataParts;

  // ---------- Handing a file over ----------
  // The share sheet where there is one (Save to Files on a phone), else a download.
  async function saveFile(file, { share = true } = {}) {
    if (share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: file.name }); return 'shared'; } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'downloaded';
  }
  // Asks for files (as many as wanted); resolves with them, [] if none.
  function pickFiles(accept = 'application/json,.json') {
    return new Promise((ok) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = accept; input.multiple = true; input.style.display = 'none';
      input.addEventListener('change', () => { ok(input.files ? [...input.files] : []); input.remove(); });
      document.body.appendChild(input);
      input.click();
    });
  }
  // Asks for a file; resolves with it, or null if none was picked.
  function pickFile(accept = 'application/json,.json') {
    return new Promise((ok) => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = accept; input.style.display = 'none';
      input.addEventListener('change', () => { ok(input.files && input.files[0] ? input.files[0] : null); input.remove(); });
      document.body.appendChild(input);
      input.click();
    });
  }

  Object.assign(parts, { saveFile, pickFiles, pickFile });
})();
;

// ---- shared/data/overthoughts.js ----
// Overthoughts' own database, and a shoot's reflection kept there. (The
// reflection helpers are from before reflections stayed in The Eye; unused.)
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { finish, open, rows, hasText, nowIso, todayStr } = parts;

  // ---------- Overthoughts' own database ----------
  const OT = 'overthoughts';
  let otOpening = null;
  function overthoughts() {
    if (!otOpening) {
      otOpening = open(OT, 1, (db) => {
        const entries = db.createObjectStore('entries', { keyPath: 'id' });
        entries.createIndex('kind', 'kind');
        entries.createIndex('shootId', 'shootId');
        db.createObjectStore('images'); // an entry's photos, keyed by its id: [{ src, caption }], as The Eye's Journal kept them
        db.createObjectStore('reviews', { keyPath: 'id' }); // 'month-2026-11', 'year-2026'
        const links = db.createObjectStore('links', { keyPath: 'id' });
        links.createIndex('from', ['fromApp', 'fromId']);
        links.createIndex('to', ['toApp', 'toId']);
      }).then((db) => {
        db.onclose = () => { otOpening = null; };
        return db;
      });
      otOpening.catch(() => { otOpening = null; });
    }
    return otOpening;
  }
  const linkId = (fromApp, fromId, toApp, toId) => `${fromApp}:${fromId}>${toApp}:${toId}`;
  const reflectionId = (shootId) => `reflection-${shootId}`;
  // ---------- A shoot's reflection, from The Eye ----------
  // `shoot` is The Eye's shoot; `name` how The Eye shows it. Every shoot that's
  // been shot gets an entry (an empty one waits for its reflection), so the
  // weekly log can list the week's shoots the way The Eye's Journal did.
  function reflectionFromShoot(shoot, name, was, at) {
    const base = was || {};
    return {
      ...base,
      id: reflectionId(shoot.id),
      kind: 'reflection',
      shootId: shoot.id,
      shootName: name || base.shootName || 'Untitled shoot',
      date: shoot.date || base.date || todayStr(),
      shootStatus: shoot.status || '',
      archived: !!shoot.archived,
      wentRight: shoot.whatWentRight || '',
      couldBeBetter: shoot.couldBeBetter || '',
      takeaway: shoot.lessonsLearned || '',
      tags: base.tags || [],
      from: 'the-eye',
      editedIn: 'the-eye',
      createdAt: base.createdAt || shoot.capturedAt || nowIso(),
      updatedAt: at || shoot.reflectionUpdatedAt || base.updatedAt || nowIso(),
    };
  }
  async function saveReflections(list) { // [{ shoot, name, at }]: at, when it was changed (now, from The Eye)
    if (!list.length) return;
    const db = await overthoughts();
    const before = new Map((await rows(db, 'entries')).filter(([, e]) => e.kind === 'reflection').map(([, e]) => [e.id, e]));
    const entries = [], links = [];
    list.forEach(({ shoot, name, at }) => {
      const e = reflectionFromShoot(shoot, name, before.get(reflectionId(shoot.id)), at);
      entries.push(e);
      links.push({ id: linkId('the-eye', shoot.id, OT, e.id), fromApp: 'the-eye', fromId: shoot.id, toApp: OT, toId: e.id, type: 'reflection', createdAt: (before.get(e.id) && before.get(e.id).createdAt) || nowIso() });
    });
    const tx = db.transaction(['entries', 'links'], 'readwrite');
    entries.forEach((e) => tx.objectStore('entries').put(e));
    links.forEach((l) => tx.objectStore('links').put(l));
    return finish(tx);
  }
  // A shoot deleted in The Eye: its entry goes too, unless something was
  // written in it (then it stays, as the only copy of those words).
  async function dropReflections(shootIds) {
    const db = await overthoughts();
    const ids = new Set(shootIds.map(reflectionId));
    const gone = (await rows(db, 'entries')).map(([, e]) => e)
      .filter((e) => ids.has(e.id) && !hasText(e.wentRight) && !hasText(e.couldBeBetter) && !hasText(e.takeaway));
    if (!gone.length) return;
    const links = (await rows(db, 'links')).map(([, l]) => l).filter((l) => gone.some((e) => e.id === l.toId));
    const tx = db.transaction(['entries', 'links'], 'readwrite');
    gone.forEach((e) => tx.objectStore('entries').delete(e.id));
    links.forEach((l) => tx.objectStore('links').delete(l.id));
    return finish(tx);
  }
  async function reflections() {
    const db = await overthoughts();
    return (await rows(db, 'entries')).map(([, e]) => e).filter((e) => e.kind === 'reflection');
  }

  Object.assign(parts, { overthoughts, linkId, reflectionId, saveReflections, dropReflections, reflections });
})();
;

// ---- shared/data/the-eye.js ----
// The Eye's own data, read from where it keeps it: its shoots in
// localStorage, its photos in its database.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { open, rows, hasText, nowIso, todayStr, store } = parts;

  // ---------- The Eye's own data, read from where it keeps it ----------
  const EYE_STATE = 'dailies_state_v1';
  const EYE_IDB = 'starky-moodboards';
  // Version 1: the upgrade only runs when the database is first made, so the store is always new.
  const openEyePhotos = () => open(EYE_IDB, 1, (db) => db.createObjectStore('images'));
  function eyeState() {
    const raw = store.get(EYE_STATE);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }
  const eyeShootName = (s, mode) => {
    const t = (s.talents || []).find((x) => hasText(x.name));
    const talent = t ? t.name : '';
    return mode === 'title' ? (s.title || talent || 'Untitled shoot') : (talent || s.title || 'Untitled shoot');
  };
  // The same file The Eye's own "Back up all data" makes, so its Restore reads it.
  async function eyeBackupFile() {
    const state = eyeState();
    if (!state) return null;
    const db = await openEyePhotos();
    const images = Object.fromEntries(await rows(db, 'images'));
    db.close();
    const payload = { version: 1, exportedAt: nowIso(), state, images };
    return new File([JSON.stringify(payload)], `starky-backup-${todayStr()}.json`, { type: 'application/json' });
  }
  // The Eye's backup file (or the reflections file it saves for Overthoughts), read.
  async function readEyeFile(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't from The Eye."); }
    if (!data || !data.state || !Array.isArray(data.state.shoots)) throw new Error("That file isn't from The Eye.");
    return { state: data.state, images: data.images || {} };
  }

  Object.assign(parts, { openEyePhotos, eyeState, eyeShootName, eyeBackupFile, readEyeFile });
})();
;

// ---- shared/data/journal-move.js ----
// The Journal moves from The Eye to Overthoughts, once.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const {
    finish, rows, getOne, hasText, nowIso, todayStr, store, overthoughts, reflectionId,
    saveReflections, openEyePhotos, eyeState, eyeShootName
  } = parts;

  // ---------- The Journal moves to Overthoughts (once) ----------
  // Copies, never moves: The Eye's own Journal and reflections stay where they
  // were (and in its backups). Nothing is marked done until every copy has
  // been read back and matches.
  const MOVED_KEY = 'overthoughts-journal-moved';
  const journalMoved = () => !!store.get(MOVED_KEY);
  function journalToMove(from) {
    const st = from ? from.state : eyeState();
    if (!st) return { entries: [], shoots: [], state: null };
    const entries = (Array.isArray(st.journalEntries) ? st.journalEntries : []).filter((e) => e && e.id && !e.sourceShootId);
    const post = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'];
    const shoots = (Array.isArray(st.shoots) ? st.shoots : []).filter((s) => s && s.id && (post.includes(s.status) || hasText(s.whatWentRight) || hasText(s.couldBeBetter) || hasText(s.lessonsLearned)));
    return { entries, shoots, state: st };
  }
  const somethingToMove = () => { const m = journalToMove(); return m.entries.length + m.shoots.length > 0; };
  function freeFromJournal(e) {
    const day = /^\d{4}-\d{2}-\d{2}/.test(e.createdAt || '') ? e.createdAt.slice(0, 10) : todayStr();
    return {
      id: e.id, kind: 'free', date: day, title: e.title || '', body: e.body || '', tags: Array.isArray(e.tags) ? e.tags : [],
      takeaway: '', shootId: null, from: 'the-eye', createdAt: e.createdAt || nowIso(), updatedAt: e.updatedAt || e.createdAt || nowIso(),
    };
  }
  // `from`: The Eye's backup file, read ({ state, images }), for a copy of
  // Overthoughts that isn't beside The Eye. Can be brought in more than once:
  // nothing already here is ever written over.
  async function moveJournal(from) {
    if (!from && journalMoved()) return { already: true };
    const { entries, shoots, state } = journalToMove(from);
    const db = await overthoughts();
    const have = new Map((await rows(db, 'entries')).map(([, e]) => [e.id, e]));
    // Photos on the Journal's entries.
    let photos = [];
    if (entries.length && from) {
      photos = entries.map((e) => [e.id, (from.images || {})[`${e.id}__journal`]]).filter(([, v]) => Array.isArray(v) && v.length);
    } else if (entries.length) {
      const eye = await openEyePhotos();
      photos = (await Promise.all(entries.map(async (e) => [e.id, await getOne(eye, 'images', `${e.id}__journal`)]))).filter(([, v]) => Array.isArray(v) && v.length);
      eye.close();
    }
    const free = entries.filter((e) => !have.has(e.id)).map(freeFromJournal); // a second run never overwrites what's been written since
    const tx = db.transaction(['entries', 'images', 'links'], 'readwrite');
    free.forEach((e) => tx.objectStore('entries').put(e));
    photos.filter(([id]) => !have.has(id)).forEach(([id, v]) => tx.objectStore('images').put(v, id));
    await finish(tx);
    await saveReflections(shoots.filter((s) => !have.has(reflectionId(s.id))).map((s) => ({ shoot: s, name: eyeShootName(s, state && state.titleDisplayMode) })));
    // Read it all back before calling it done.
    const after = new Map((await rows(db, 'entries')).map(([, e]) => [e.id, e]));
    const pics = new Map(await rows(db, 'images'));
    const wrong = [];
    entries.forEach((e) => {
      const got = after.get(e.id);
      if (!got || (!have.has(e.id) && (got.body !== (e.body || '') || got.title !== (e.title || '')))) wrong.push(e.id);
    });
    photos.forEach(([id, v]) => { if (!have.has(id) && (!pics.has(id) || pics.get(id).length !== v.length)) wrong.push(id); });
    shoots.forEach((s) => {
      const got = after.get(reflectionId(s.id));
      if (!got || (!have.has(got.id) && (got.takeaway !== (s.lessonsLearned || '') || got.wentRight !== (s.whatWentRight || '') || got.couldBeBetter !== (s.couldBeBetter || '')))) wrong.push(s.id);
    });
    if (wrong.length) throw new Error(`${wrong.length} of them didn't copy over properly, so nothing was marked as moved. The Eye still has all of it.`);
    if (!from) store.set(MOVED_KEY, nowIso());
    return { entries: entries.length, reflections: shoots.filter((s) => hasText(s.whatWentRight) || hasText(s.couldBeBetter) || hasText(s.lessonsLearned)).length };
  }

  Object.assign(parts, { journalMoved, somethingToMove, moveJournal });
})();
;

// ---- shared/data/json-backup.js ----
// A whole database as one file (JSON), and back.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { finish, open, rows, nowIso, todayStr } = parts;

  // ---------- A whole database as one file, and back ----------
  // Photos (Blobs) go in as data URLs, so the file is plain JSON. Built in
  // pieces, so a big notebook never has to be one string in memory.
  const blobToDataUrl = (b) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => no(r.error); r.readAsDataURL(b); });
  async function pack(v) {
    if (v instanceof Blob) return { __blob: await blobToDataUrl(v), type: v.type, name: v.name || undefined, lastModified: v.lastModified || undefined };
    if (v instanceof ArrayBuffer) return { __buf: await blobToDataUrl(new Blob([v])) };
    if (ArrayBuffer.isView(v)) return { __view: v.constructor.name, __buf: await blobToDataUrl(new Blob([v])) };
    if (v instanceof Date) return { __date: v.toISOString() };
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await pack(x)); return out; }
    if (v && typeof v === 'object') { const out = {}; for (const k of Object.keys(v)) out[k] = await pack(v[k]); return out; }
    return v;
  }
  async function unpack(v) {
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await unpack(x)); return out; }
    if (v && typeof v === 'object') {
      if (typeof v.__blob === 'string') {
        const b = await (await fetch(v.__blob)).blob();
        return v.name ? new File([b], v.name, { type: v.type || b.type, lastModified: v.lastModified || Date.now() }) : new Blob([b], { type: v.type || b.type });
      }
      if (typeof v.__buf === 'string') {
        const buf = await (await (await fetch(v.__buf)).blob()).arrayBuffer();
        return v.__view && typeof self[v.__view] === 'function' ? new self[v.__view](buf) : buf;
      }
      if (typeof v.__date === 'string') return new Date(v.__date);
      const out = {}; for (const k of Object.keys(v)) out[k] = await unpack(v[k]); return out;
    }
    return v;
  }
  // `extra` rides along (small things kept in localStorage, say).
  async function exportDb(dbName, { app, filename, extra } = {}) {
    const db = await open(dbName);
    const parts = [`{"app":${JSON.stringify(app || dbName)},"database":${JSON.stringify(dbName)},"version":${db.version},"exportedAt":${JSON.stringify(nowIso())},"extra":${JSON.stringify(extra || {})},"stores":{`];
    const names = [...db.objectStoreNames];
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const os = db.transaction(name).objectStore(name);
      const meta = { keyPath: os.keyPath, autoIncrement: os.autoIncrement, indexes: [...os.indexNames].map((n) => { const ix = os.index(n); return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; }) };
      parts.push(`${i ? ',' : ''}${JSON.stringify(name)}:{"meta":${JSON.stringify(meta)},"rows":[`);
      const list = await rows(db, name);
      for (let j = 0; j < list.length; j++) parts.push(`${j ? ',' : ''}${JSON.stringify([await pack(list[j][0]), await pack(list[j][1])])}`);
      parts.push(']}');
    }
    parts.push('}}');
    db.close();
    return new File(parts, filename || `${app || dbName}-${todayStr()}.json`, { type: 'application/json' });
  }
  // Puts everything in a file made by exportDb back. `replace` clears each
  // store first; otherwise rows are added over what's there (same key, file wins).
  async function importDb(file, dbName, { replace = true, app } = {}) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't a notebook backup."); }
    if (!data || !data.stores || (app && data.app !== app) || data.database !== dbName) throw new Error('That file is a backup of a different notebook.');
    const db = await open(dbName);
    try {
      const names = Object.keys(data.stores).filter((n) => db.objectStoreNames.contains(n));
      if (!names.length) throw new Error('That file is a backup of a different notebook.');
      const unpacked = {};
      for (const n of names) {
        unpacked[n] = [];
        for (const [k, v] of data.stores[n].rows) unpacked[n].push([await unpack(k), await unpack(v)]);
      }
      const tx = db.transaction(names, 'readwrite');
      const done = finish(tx);
      try {
        names.forEach((n) => {
          const os = tx.objectStore(n);
          if (replace) os.clear();
          unpacked[n].forEach(([k, v]) => { if (os.keyPath) os.put(v); else os.put(v, k); });
        });
      } catch (e) {
        tx.abort(); // a row a store can't take at all: nothing goes in, not even the clear
      }
      await done;
      return { extra: data.extra || {}, counts: Object.fromEntries(names.map((n) => [n, unpacked[n].length])) };
    } finally {
      db.close();
    }
  }

  Object.assign(parts, { blobToDataUrl, exportDb, importDb });
})();
;

// ---- shared/data/zip-format.js ----
// The zip file format: writing a zip and reading one, plus the names and
// sizes the zip backup uses.
(function () {
  'use strict';
  const parts = window.DFDataParts;

  // ---------- A notebook as a zip, and back ----------
  // The backups the notebooks make now (and the shelf's, of all four): a
  // plain .zip the phone never holds in memory. backup.json says what's in
  // every store, and each photo goes in as a file of its own:
  //   { format: 'df-backup', version: 1, app, kind ('notebook' or 'suite'), exportedAt, extra,
  //     databases: { [name]: { version, stores: { [store]: { meta, rows: [[key, value]] } } } },
  //     local: { [localStorage key]: text } }
  // In a row, a photo is { __file: 'files/000012', as, ... }: as 'blob' (with
  // type, name, lastModified), 'buf', 'view' (with view, the typed array's
  // name) or 'text' (a long string, like The Eye's photos). Photos stored as
  // Blobs go in as they are: they're on disk already. Ones kept as bytes or
  // text are first put in a scratch database of the backup's own, a few at a
  // time, so they're on disk too when the zip is put together from them.
  // Safari keeps whatever it has read of a Blob in memory for as long as that
  // Blob is kept, so a photo's checksum is worked out from a second copy of
  // its row, read and let go, and the zip is made of copies never read.
  // A phone hands a file over through the share sheet, which reads all of it
  // into memory (three times over, in Safari), so there a big backup is made
  // as a few files of PART at most, saved one tap each; each has part.json
  // ({ format: 'df-backup-part', id, part, of }), the first has backup.json
  // too (parts: { id, of }), and they're picked together to restore.
  // Restoring, each photo is copied out of the zip a few MB at a time and
  // they go in a few at a time. Contact Sheet's first zips (format
  // 'contact-sheet-backup', one database) read the same way. Backups made the
  // first way (one .json, exportDb above) still go back in with importDb.
  const ZIP = { format: 'df-backup', version: 1 };
  const MANIFEST = 'backup.json';
  const CHUNK = 4 * 1024 * 1024;
 // read and copied this much at a time
  const BATCH = 24 * 1024 * 1024;
 // stored this much at a time
  const PAGE = 10;
 // rows read at a time
  const BIG_TEXT = 64 * 1024;
 // a string longer than this goes in as a file
  const MAX32 = 0xffffffff;
 // the mark for "in the zip64 extra instead"
  const ZIP_LIMIT = MAX32;
 // sizes and places from here on need zip64
  const SCRATCH = 'df-backup-scratch-';
  const PART = 200 * 1024 * 1024;
 // the most a phone is handed at once
  const PART_NAME = 'part.json';
  const dbNames = async () => (indexedDB.databases ? new Set((await indexedDB.databases()).map((d) => d.name)) : null);
  const dropDb = (name) => new Promise((ok) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => ok(); });
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();
  // Read as a stream, a little at a time, so what's been read is let go of
  // as it goes (pieces read as slices piled up before they were freed).
  const crcAdd = (c, bytes) => { for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8); return c; };
  const crcBytes = (bytes) => (crcAdd(0xffffffff, bytes) ^ 0xffffffff) >>> 0;
  async function crcOf(blob) {
    let c = 0xffffffff;
    const eat = (bytes) => { c = crcAdd(c, bytes); };
    if (typeof blob.stream === 'function') {
      const reader = blob.stream().getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        eat(value);
      }
    } else {
      for (let at = 0; at < blob.size; at += CHUNK) eat(new Uint8Array(await blob.slice(at, at + CHUNK).arrayBuffer()));
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  // 64-bit numbers as two halves (sizes past 4 GB need them).
  const set64 = (dv, at, n) => { dv.setUint32(at, n % 0x100000000, true); dv.setUint32(at + 4, Math.floor(n / 0x100000000), true); };
  const get64 = (dv, at) => dv.getUint32(at, true) + dv.getUint32(at + 4, true) * 0x100000000;
  function dosTime(d) {
    return {
      time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
      date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
    };
  }
  // entries: [{ name, blob, crc }], stored as they are, each with its CRC
  // already worked out. The Blob that comes back is made of the entries' own Blobs.
  async function zipOf(entries) {
    const enc = new TextEncoder();
    const { time, date } = dosTime(new Date());
    const parts = [];
    const central = [];
    let offset = 0;
    for (const e of entries) {
      const name = enc.encode(e.name);
      const size = e.blob.size;
      const { crc } = e;
      const big = size >= ZIP_LIMIT;
      const far = offset >= ZIP_LIMIT;
      const local = new DataView(new ArrayBuffer(30 + (big ? 20 : 0)));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, big ? 45 : 20, true);
      local.setUint16(6, 0x0800, true); // names are UTF-8
      local.setUint16(8, 0, true); // stored
      local.setUint16(10, time, true);
      local.setUint16(12, date, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, big ? MAX32 : size, true);
      local.setUint32(22, big ? MAX32 : size, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, big ? 20 : 0, true);
      if (big) {
        local.setUint16(30, 0x0001, true);
        local.setUint16(32, 16, true);
        set64(local, 34, size);
        set64(local, 42, size);
      }
      // The local header's name goes after its fixed part, before the extra.
      const fixed = new Uint8Array(local.buffer, 0, 30);
      const extra = new Uint8Array(local.buffer, 30);
      parts.push(fixed, name, extra, e.blob);

      const wide = big || far;
      const cen = new DataView(new ArrayBuffer(46 + (wide ? 28 : 0)));
      cen.setUint32(0, 0x02014b50, true);
      cen.setUint16(4, wide ? 45 : 20, true);
      cen.setUint16(6, wide ? 45 : 20, true);
      cen.setUint16(8, 0x0800, true);
      cen.setUint16(10, 0, true);
      cen.setUint16(12, time, true);
      cen.setUint16(14, date, true);
      cen.setUint32(16, crc, true);
      cen.setUint32(20, wide ? MAX32 : size, true);
      cen.setUint32(24, wide ? MAX32 : size, true);
      cen.setUint16(28, name.length, true);
      cen.setUint16(30, wide ? 28 : 0, true);
      cen.setUint32(42, wide ? MAX32 : offset, true);
      if (wide) {
        cen.setUint16(46, 0x0001, true);
        cen.setUint16(48, 24, true);
        set64(cen, 50, size);
        set64(cen, 58, size);
        set64(cen, 66, offset);
      }
      central.push(new Uint8Array(cen.buffer, 0, 46), name, new Uint8Array(cen.buffer, 46));
      offset += 30 + name.length + extra.length + size;
    }
    const cenSize = central.reduce((n, p) => n + p.byteLength, 0);
    const tail = [];
    if (offset >= ZIP_LIMIT || cenSize >= ZIP_LIMIT || entries.length >= 0xffff) {
      const z = new DataView(new ArrayBuffer(56 + 20));
      z.setUint32(0, 0x06064b50, true);
      set64(z, 4, 44);
      z.setUint16(12, 45, true);
      z.setUint16(14, 45, true);
      set64(z, 24, entries.length);
      set64(z, 32, entries.length);
      set64(z, 40, cenSize);
      set64(z, 48, offset);
      z.setUint32(56, 0x07064b50, true);
      set64(z, 64, offset + cenSize);
      z.setUint32(72, 1, true);
      tail.push(z);
    }
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, Math.min(entries.length, 0xffff), true);
    end.setUint16(10, Math.min(entries.length, 0xffff), true);
    end.setUint32(12, Math.min(cenSize, MAX32), true);
    end.setUint32(16, Math.min(offset, MAX32), true);
    tail.push(end);
    return new Blob([...parts, ...central, ...tail], { type: 'application/zip' });
  }
  // The files in a zip, read from its end; each is cut out of `file` when asked for.
  async function readZip(file) {
    const view = async (at, n) => new DataView(await file.slice(at, at + n).arrayBuffer());
    const tailLen = Math.min(file.size, 22 + 0xffff);
    const tail = await view(file.size - tailLen, tailLen);
    let e = -1;
    for (let i = tailLen - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("That file isn't a notebook backup.");
    let count = tail.getUint16(e + 10, true);
    let cenSize = tail.getUint32(e + 12, true);
    let cenAt = tail.getUint32(e + 16, true);
    if ((count === 0xffff || cenSize === MAX32 || cenAt === MAX32) && e >= 20 && tail.getUint32(e - 20, true) === 0x07064b50) {
      const z = await view(get64(tail, e - 20 + 8), 56);
      count = get64(z, 32);
      cenSize = get64(z, 40);
      cenAt = get64(z, 48);
    }
    const cen = await view(cenAt, cenSize);
    const dec = new TextDecoder();
    const byName = new Map();
    for (let p = 0, i = 0; i < count && p + 46 <= cenSize; i++) {
      if (cen.getUint32(p, true) !== 0x02014b50) break;
      const method = cen.getUint16(p + 10, true);
      let packed = cen.getUint32(p + 20, true);
      let size = cen.getUint32(p + 24, true);
      const nameLen = cen.getUint16(p + 28, true);
      const extraLen = cen.getUint16(p + 30, true);
      const noteLen = cen.getUint16(p + 32, true);
      let at = cen.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(cen.buffer, cen.byteOffset + p + 46, nameLen));
      // Zip64: the sizes and place that didn't fit, in this order.
      for (let x = p + 46 + nameLen; x + 4 <= p + 46 + nameLen + extraLen;) {
        const id = cen.getUint16(x, true);
        const len = cen.getUint16(x + 2, true);
        if (id === 0x0001) {
          let y = x + 4;
          if (size === MAX32) { size = get64(cen, y); y += 8; }
          if (packed === MAX32) { packed = get64(cen, y); y += 8; }
          if (at === MAX32) { at = get64(cen, y); }
        }
        x += 4 + len;
      }
      byName.set(name, { method, packed, size, at });
      p += 46 + nameLen + extraLen + noteLen;
    }
    return {
      has: (name) => byName.has(name),
      // Only asked for names has() found: openBackupZip checks every one first.
      async get(name) {
        const f = byName.get(name);
        const head = await view(f.at, 30);
        const start = f.at + 30 + head.getUint16(26, true) + head.getUint16(28, true);
        const part = file.slice(start, start + f.packed);
        if (f.method === 0) return part;
        // Zipped up again somewhere, squeezed: opened up as it's read.
        if (f.method === 8 && typeof DecompressionStream === 'function') return new Response(part.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
        throw new Error("That backup was changed after it was saved and can't be read.");
      },
    };
  }

  Object.assign(parts, {
    ZIP, MANIFEST, CHUNK, BATCH, PAGE, BIG_TEXT, SCRATCH, PART, PART_NAME, dbNames, dropDb,
    crcBytes, crcOf, zipOf, readZip
  });
})();
;

// ---- shared/data/zip-backup.js ----
// Saving a backup: the notebooks' databases packed into a zip (in parts on
// a phone), and the steps for handing it over.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const {
    ask, finish, open, nowIso, todayStr, uid, ZIP, MANIFEST, BATCH, PAGE, BIG_TEXT, SCRATCH,
    PART, PART_NAME, dbNames, dropDb, crcBytes, crcOf, zipOf, saveFile
  } = parts;

  // Where a backup keeps its photos made of bytes or text until the zip is
  // saved: entries wait here in memory until there's a batch, then they're
  // stored, and once they all are, swapped for the stored copies (files on
  // disk). Not straight after each batch: in Safari a copy read back as soon
  // as it's written keeps its bytes in memory (750 MB for 960 MB of photos;
  // read back at the end, nothing).
  function scratch() {
    const name = `${SCRATCH}${Date.now()}-${uid().slice(0, 8)}`;
    let db = null;
    let waiting = [];
    let size = 0;
    let stored = [];
    const flush = async () => {
      if (!waiting.length) return;
      if (!db) db = await open(name, 1, (d) => d.createObjectStore('f'));
      const list = waiting;
      waiting = [];
      size = 0;
      const tx = db.transaction('f', 'readwrite');
      list.forEach((e) => tx.objectStore('f').put(e.blob, e.name));
      await finish(tx);
      list.forEach((e) => { e.size = e.blob.size; e.blob = null; });
      stored = stored.concat(list);
    };
    return {
      add(e) { waiting.push(e); size += e.blob.size; },
      full: () => size >= BATCH,
      flush,
      // Everything stored, then the stored copies in.
      async readBack() {
        await flush();
        for (let i = 0; i < stored.length; i += PAGE) {
          const read = db.transaction('f').objectStore('f');
          const list = stored.slice(i, i + PAGE);
          const got = await Promise.all(list.map((e) => ask(read.get(e.name))));
          list.forEach((e, j) => {
            if (!(got[j] instanceof Blob) || got[j].size !== e.size) throw new Error("The backup couldn't be put together. Try again.");
            e.blob = got[j];
          });
        }
        stored = [];
      },
      async drop() { if (db) db.close(); db = null; await dropDb(name); },
    };
  }
  // Scratch left by a backup that never finished (the app was closed), an hour on.
  async function sweepScratch() {
    const names = await dbNames().catch(() => null);
    if (!names) return;
    for (const n of names) {
      const m = typeof n === 'string' && n.startsWith(SCRATCH) ? /^(\d+)-/.exec(n.slice(SCRATCH.length)) : null;
      if (m && Date.now() - Number(m[1]) > 3600000) dropDb(n);
    }
  }
  // Values into backup.json, the photos in them set aside as files, each
  // with its checksum. w is the same value read a second time: a Blob's
  // checksum is read from that copy (see above).
  function zipPacker(files, spare) {
    const put = (blob, crc, as, more) => {
      const e = { name: `files/${String(files.length).padStart(6, '0')}`, blob, crc };
      files.push(e);
      if (as !== 'blob') spare.add(e);
      return { __file: e.name, as, ...more };
    };
    const pack = async (v, w) => {
      if (v instanceof Blob) return put(v, await crcOf(w instanceof Blob && w.size === v.size ? w : v), 'blob', { type: v.type || '', name: v.name || undefined, lastModified: v.lastModified || undefined });
      if (v instanceof ArrayBuffer) return put(new Blob([v]), crcBytes(new Uint8Array(v)), 'buf');
      if (ArrayBuffer.isView(v)) { const u = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); return put(new Blob([u]), crcBytes(u), 'view', { view: v.constructor.name }); }
      if (typeof v === 'string' && v.length > BIG_TEXT) { const u = new TextEncoder().encode(v); return put(new Blob([u], { type: 'text/plain' }), crcBytes(u), 'text'); }
      if (v instanceof Date) return { __date: v.toISOString() };
      if (Array.isArray(v)) { const out = []; for (let i = 0; i < v.length; i++) out.push(await pack(v[i], Array.isArray(w) ? w[i] : undefined)); return out; }
      if (v && typeof v === 'object') { const out = {}; for (const k of Object.keys(v)) out[k] = await pack(v[k], w && typeof w === 'object' ? w[k] : undefined); return out; }
      return v;
    };
    return pack;
  }
  async function rowCount(dbName) {
    const db = await open(dbName);
    try {
      let n = 0;
      for (const s of [...db.objectStoreNames]) n += await ask(db.transaction(s).objectStore(s).count());
      return n;
    } finally {
      db.close();
    }
  }
  const hasBlob = (v) => v instanceof Blob || (Array.isArray(v) ? v.some(hasBlob) : !!v && typeof v === 'object' && !(v instanceof ArrayBuffer) && !ArrayBuffer.isView(v) && !(v instanceof Date) && Object.values(v).some(hasBlob));
  // One database's stores and rows, read a few rows at a time (rows with
  // photos stored as files twice: one copy for the zip, one to read the
  // checksums from).
  async function zipDb(dbName, pack, spare, onRow) {
    const db = await open(dbName);
    try {
      const out = { version: db.version, stores: {} };
      for (const s of [...db.objectStoreNames]) {
        const os = db.transaction(s).objectStore(s);
        const meta = { keyPath: os.keyPath, autoIncrement: os.autoIncrement, indexes: [...os.indexNames].map((n) => { const ix = os.index(n); return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; }) };
        const list = [];
        let range = null;
        for (;;) {
          const page = db.transaction(s).objectStore(s);
          const [keys, vals] = await Promise.all([ask(page.getAllKeys(range, PAGE)), ask(page.getAll(range, PAGE))]);
          let twins = [];
          if (vals.some(hasBlob)) {
            const again = db.transaction(s).objectStore(s);
            const [k2, v2] = await Promise.all([ask(again.getAllKeys(range, PAGE)), ask(again.getAll(range, PAGE))]);
            if (k2.length === keys.length && k2.every((k, i) => indexedDB.cmp(k, keys[i]) === 0)) twins = v2; // the same rows (or no twins: checksums from the copy itself)
          }
          for (let i = 0; i < keys.length; i++) { list.push([await pack(keys[i]), await pack(vals[i], twins[i])]); onRow(); }
          if (spare.full()) await spare.flush();
          if (keys.length < PAGE) break;
          range = IDBKeyRange.lowerBound(keys[keys.length - 1], true);
        }
        out.stores[s] = { meta, rows: list };
      }
      return out;
    } finally {
      db.close();
    }
  }
  // A phone hands files over through the share sheet; elsewhere they're
  // downloaded (read a little at a time, so a backup can be one file).
  function handsOverByShare() {
    try {
      return !!(navigator.canShare && matchMedia('(pointer: coarse)').matches && navigator.canShare({ files: [new File([''], 'backup.zip', { type: 'application/zip' })] }));
    } catch (e) {
      return false;
    }
  }
  const sizeText = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${Math.max(1, Math.round(n / 1e6))} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
  // The backup: { parts (Files), size, release(i), done }, or null when
  // there's nothing to back up. One part, unless it's to be handed to a
  // phone's share sheet and is bigger than PART. release(i) once part i is
  // saved; done() once they all are, or the backup's given up on: two
  // minutes on (a download may still be reading it), the scratch is cleared.
  // `databases` that aren't on this device are left out (opening one would
  // make it); `local` is localStorage keys to bring along. onProgress(0..1)
  // while the rows are read, the long part.
  async function zipBackup({ app, kind = 'notebook', databases = [], local = [], extra = {}, filename, partSize = handsOverByShare() ? PART : Infinity, onProgress = () => {} } = {}) {
    sweepScratch();
    const files = [];
    const spare = scratch();
    try {
      const have = await dbNames();
      const use = databases.filter((n) => !have || have.has(n));
      let total = 0;
      for (const n of use) total += await rowCount(n);
      let did = 0;
      const pack = zipPacker(files, spare);
      const dbs = {};
      for (const n of use) dbs[n] = await zipDb(n, pack, spare, () => onProgress(Math.min(1, ++did / (total || 1))));
      const loc = {};
      for (const k of local) {
        let v = null;
        try { v = localStorage.getItem(k); } catch (e) { /* private mode */ }
        if (v != null) loc[k] = await pack(v);
      }
      if (!Object.keys(dbs).length && !Object.keys(loc).length) { await spare.drop(); return null; }
      await spare.readBack();
      // Into parts of partSize at most (a photo bigger than that gets one of its own).
      const groups = [[]];
      let size = 0;
      for (const e of files) {
        const last = groups[groups.length - 1];
        if (last.length && size + e.blob.size > partSize) { groups.push([e]); size = e.blob.size; } else { last.push(e); size += e.blob.size; }
      }
      const of = groups.length;
      const id = uid();
      const manifest = { ...ZIP, app, kind, exportedAt: nowIso(), extra, parts: { id, of }, databases: dbs, local: loc };
      const json = (o) => { const u = new TextEncoder().encode(JSON.stringify(o)); return { blob: new Blob([u], { type: 'application/json' }), crc: crcBytes(u) }; };
      const base = (filename || `${app}-backup-${todayStr()}.zip`).replace(/\.zip$/i, '');
      const parts = [];
      for (let i = 0; i < of; i++) {
        const head = [{ name: PART_NAME, ...json({ format: 'df-backup-part', id, part: i + 1, of }) }];
        if (i === 0) head.unshift({ name: MANIFEST, ...json(manifest) });
        parts.push(new File([await zipOf([...head, ...groups[i]])], of === 1 ? `${base}.zip` : `${base} (${i + 1} of ${of}).zip`, { type: 'application/zip' }));
      }
      return {
        parts,
        size: parts.reduce((n, f) => n + f.size, 0),
        release(i) { parts[i] = null; groups[i].forEach((e) => { e.blob = null; }); },
        done: (wait = 120000) => new Promise((ok) => setTimeout(() => spare.drop().then(ok), wait)),
      };
    } catch (err) {
      await spare.drop();
      throw err;
    }
  }
  // Handing a backup over, a file a tap: { label, note, tap() } for the
  // button and the line above it. tap() resolves true once the last file's
  // been saved (false if that one was cancelled or there are more to go).
  function backupSteps(made) {
    const n = made.parts.length;
    const share = handsOverByShare();
    let next = 0;
    return {
      get label() { return n === 1 ? 'Save the backup' : `Save file ${Math.min(next + 1, n)} of ${n}`; },
      note: n === 1 ? `Ready: ${sizeText(made.size)}.` : `Ready: ${sizeText(made.size)}, in ${n} files. Save all ${n} to the same place: they go back in together.`,
      async tap() {
        if (next >= n) return true;
        const how = await saveFile(made.parts[next], { share });
        if (how === 'cancelled') return false;
        made.release(next);
        next += 1;
        return next >= n;
      },
    };
  }
  // True for a zip (a backup made by zipBackup); the first kind is JSON.
  async function isZipFile(file) {
    const b = new Uint8Array(await file.slice(0, 4).arrayBuffer());
    return b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;
  }

  Object.assign(parts, { sizeText, zipBackup, backupSteps, isZipFile });
})();
;

// ---- shared/data/zip-restore.js ----
// Restoring a backup: reading the zip and putting each database back.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { ask, finish, open, ZIP, MANIFEST, CHUNK, BATCH, PART_NAME, dbNames, readZip } = parts;

  // A backup opened (its one zip, or all the files it was saved as), and
  // checked before anything is changed: what kind it is, and every file it
  // names there.
  async function openBackupZip(input) {
    const bad = () => new Error("That file isn't a notebook backup.");
    const zips = [];
    for (const f of Array.isArray(input) ? input : [input]) {
      try { zips.push(await readZip(f)); } catch (e) { throw bad(); }
    }
    const head = zips.find((z) => z.has(MANIFEST));
    const partOf = async (z) => { try { return JSON.parse(await (await z.get(PART_NAME)).text()); } catch (e) { return null; } };
    if (!head) {
      const p = zips.length && zips[0].has(PART_NAME) ? await partOf(zips[0]) : null;
      if (p && p.of > 1) throw new Error(`That backup is in ${p.of} files, and the first one wasn't picked. Pick all ${p.of} together.`);
      throw bad();
    }
    let m;
    try { m = JSON.parse(await (await head.get(MANIFEST)).text()); } catch (e) { throw bad(); }
    if (m && m.format === 'contact-sheet-backup' && m.database && m.stores) {
      m = { ...ZIP, app: m.app || 'contact-sheet', kind: 'notebook', exportedAt: m.exportedAt, extra: m.extra || {}, databases: { [m.database]: { version: m.version, stores: m.stores } }, local: {} };
    }
    if (!m || m.format !== ZIP.format || !m.databases) throw bad();
    if (m.version > ZIP.version) throw new Error('That backup was made by a newer version of the notebooks. Update this app, then try again.');
    let use = [head];
    const of = (m.parts && m.parts.of) || 1;
    if (of > 1) {
      const got = new Map();
      for (const z of zips) {
        const p = z.has(PART_NAME) ? await partOf(z) : null;
        if (p && p.id === m.parts.id) got.set(p.part, z);
      }
      if (got.size < of) throw new Error(`That backup is in ${of} files, and ${got.size} of them ${got.size === 1 ? 'was' : 'were'} picked. Pick all ${of} together.`);
      use = [...got.values()];
    }
    const zip = { has: (n) => use.some((z) => z.has(n)), get: (n) => use.find((z) => z.has(n)).get(n) };
    const names = [];
    const walk = (v) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') { if (typeof v.__file === 'string') names.push(v.__file); else Object.values(v).forEach(walk); }
    };
    walk(m.databases);
    walk(m.local || {});
    if (names.some((n) => !zip.has(n))) throw new Error('Part of that backup is missing, so nothing was changed.');
    return { manifest: m, zip };
  }
  // Safari keeps only which file a stored Blob came from, not which piece of
  // it: a piece of the backup stored as it is comes back as the start of the
  // whole backup. So each photo is copied out first, a few MB at a time, and
  // only the copy is stored.
  async function copiedOut(part, v) {
    const chunks = [];
    for (let at = 0; at < part.size; at += CHUNK) chunks.push(new Blob([await part.slice(at, at + CHUNK).arrayBuffer()]));
    const type = v.type || '';
    return v.name != null ? new File(chunks, v.name, { type, lastModified: v.lastModified || Date.now() }) : new Blob(chunks, { type });
  }
  // A value out of backup.json, its photos read out of the zip. `sizes.n`
  // adds up how much was read.
  async function unzipValue(v, zip, sizes) {
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await unzipValue(x, zip, sizes)); return out; }
    if (v && typeof v === 'object') {
      if (typeof v.__file === 'string') {
        const part = await zip.get(v.__file);
        sizes.n += part.size;
        const as = v.as || (v.buf ? 'buf' : v.view ? 'view' : 'blob');
        if (as === 'text') return part.text();
        if (as === 'buf' || as === 'view') {
          const buf = await part.arrayBuffer();
          return as === 'view' && typeof self[v.view] === 'function' ? new self[v.view](buf) : buf;
        }
        return copiedOut(part, v);
      }
      if (typeof v.__date === 'string') return new Date(v.__date);
      const out = {};
      for (const k of Object.keys(v)) out[k] = await unzipValue(v[k], zip, sizes);
      return out;
    }
    return v;
  }
  const keyText = (k) => JSON.stringify(k instanceof Date ? { d: k.getTime() } : k);
  // One database swapped for its part of the backup. Rows go in a few at a
  // time over what's there; once they're all in, whatever the backup doesn't
  // have is taken out. A database this device doesn't have yet is made as
  // the backup says it was.
  async function unzipDb(b, dbName, onRow) {
    const part = b.manifest.databases[dbName];
    const have = await dbNames();
    const fresh = have ? !have.has(dbName) : false;
    const db = await open(dbName, fresh ? part.version || 1 : undefined, fresh ? (made) => {
      for (const [name, s] of Object.entries(part.stores)) {
        if (made.objectStoreNames.contains(name)) continue;
        const m = s.meta || {};
        const os = made.createObjectStore(name, m.keyPath == null ? { autoIncrement: !!m.autoIncrement } : { keyPath: m.keyPath, autoIncrement: !!m.autoIncrement });
        (m.indexes || []).forEach((ix) => os.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }));
      }
    } : null);
    try {
      const names = Object.keys(part.stores).filter((n) => db.objectStoreNames.contains(n));
      const keep = {};
      for (const n of names) {
        keep[n] = new Set();
        const keyPath = db.transaction(n).objectStore(n).keyPath;
        let batch = [];
        const sizes = { n: 0 };
        const write = async () => {
          const tx = db.transaction(n, 'readwrite');
          const os = tx.objectStore(n);
          // Each row is kept under the key it went in with: a row of an
          // auto-increment store that had none is given one here.
          batch.forEach(([k, v]) => {
            const r = keyPath == null ? os.put(v, k) : os.put(v);
            r.onsuccess = () => keep[n].add(keyText(r.result));
          });
          await finish(tx);
          batch = [];
          sizes.n = 0;
        };
        for (const [pk, pv] of part.stores[n].rows || []) {
          const k = await unzipValue(pk, b.zip, sizes);
          const v = await unzipValue(pv, b.zip, sizes);
          batch.push([k, v]);
          if (sizes.n >= BATCH || batch.length >= 40) await write();
          onRow();
        }
        if (batch.length) await write();
      }
      for (const n of names) {
        const keys = await ask(db.transaction(n).objectStore(n).getAllKeys());
        const gone = keys.filter((k) => !keep[n].has(keyText(k)));
        if (!gone.length) continue;
        const tx = db.transaction(n, 'readwrite');
        gone.forEach((k) => tx.objectStore(n).delete(k));
        await finish(tx);
      }
      return Object.fromEntries(names.map((n) => [n, (part.stores[n].rows || []).length]));
    } finally {
      db.close();
    }
  }
  // Puts `databases` back from a backup (a zip, or all of the files it was
  // saved as: `file` can be a list; the ones it has; none of them
  // is an error, unless `kind` says which backup it has to be). Resolves
  // with { manifest, extra, counts, local(key) }, local(key) the text kept
  // for that localStorage key, or null. check(local), when given, runs
  // before anything is changed and throws if the file won't do. If it stops
  // partway, restoring again finishes it.
  async function restoreZip(file, { databases = [], kind, check, onProgress = () => {} } = {}) {
    const b = await openBackupZip(file);
    if (kind && b.manifest.kind !== kind) throw new Error(kind === 'suite' ? "That file isn't a backup of all four. A single notebook's backup goes back in from that notebook's options." : 'That file is a backup of a different notebook.');
    const want = databases.filter((n) => b.manifest.databases[n]);
    if (!want.length && !kind) throw new Error('That file is a backup of a different notebook.');
    const local = async (key) => {
      const v = (b.manifest.local || {})[key];
      return v == null ? null : typeof v === 'string' ? v : unzipValue(v, b.zip, { n: 0 });
    };
    if (check) await check(local);
    const rowsIn = (n) => Object.values(b.manifest.databases[n].stores).reduce((m, s) => m + (s.rows || []).length, 0);
    const total = want.reduce((n, d) => n + rowsIn(d), 0) || 1;
    let did = 0;
    const counts = {};
    try {
      for (const n of want) counts[n] = await unzipDb(b, n, () => onProgress(++did / total));
    } catch (err) {
      console.error(err);
      throw new Error("The backup didn't all go in. Restore it again to finish it.");
    }
    return { manifest: b.manifest, extra: b.manifest.extra || {}, counts, local };
  }

  Object.assign(parts, { restoreZip });
})();
;

// ---- shared/data/links.js ----
// Links between notebooks: a Ref board sent to a shoot in The Eye, and the
// board file that carries it.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const { finish, open, rows, getOne, hasText, nowIso, uid, blobToDataUrl } = parts;

  // ---------- Links: a Ref board sent to a shoot in The Eye ----------
  // Its own database, df-links, so neither notebook writes into the other's:
  //   links     { id, fromApp, fromId, toApp, toId, type, createdAt, updatedAt,
  //               name, pageCount, photoCount, drawnAt, drawnOf, frozenAt, importedAt, pending }
  //   pictures  (key: the link's id) { cover, pages: [...] }, each { type, bytes }
  // A board on a shoot: type 'moodboard', from 'ref' (the board's id) to
  // 'the-eye' (the shoot's id). Its pages are kept as pictures (drawnAt: when
  // they were made). Ref draws them again while the shoot is still to come;
  // once the shoot is shot The Eye sets frozenAt and they never change again.
  // A board that came in as a file (importedAt) is fixed from the start.
  // drawnOf: a key of how the board looked when drawn (Ref's to compare);
  // pending: Ref's + New shoot from this board, until The Eye makes the shoot.
  // Pictures are kept as bytes, not Blobs: Safari's stored Blobs break when
  // a record is saved again.
  const LINKS = 'df-links';
  // Version 1: the upgrade only runs when the database is first made, so the stores are always new.
  const openLinks = () => open(LINKS, 1, (db) => {
    db.createObjectStore('links', { keyPath: 'id' });
    db.createObjectStore('pictures');
  });
  async function withLinks(fn) {
    const db = await openLinks();
    try { return await fn(db); } finally { db.close(); }
  }
  // Every link matching all of the fields given, e.g. { toApp: 'the-eye', toId }.
  const linksWhere = (match = {}) => withLinks(async (db) => (await rows(db, 'links'))
    .map(([, l]) => l)
    .filter((l) => Object.keys(match).every((k) => l[k] === match[k]))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  const getLink = (id) => withLinks((db) => getOne(db, 'links', id));
  // Saves a link (made or changed), and its pictures with it when given.
  const saveLink = (link, pictures) => withLinks((db) => {
    const now = nowIso();
    const l = { ...link, id: link.id || uid(), createdAt: link.createdAt || now, updatedAt: now };
    const tx = db.transaction(['links', 'pictures'], 'readwrite');
    tx.objectStore('links').put(l);
    if (pictures) tx.objectStore('pictures').put(pictures, l.id);
    return finish(tx).then(() => l);
  });
  const linkPictures = (id) => withLinks((db) => getOne(db, 'pictures', id));
  const dropLinks = (ids) => withLinks((db) => {
    const tx = db.transaction(['links', 'pictures'], 'readwrite');
    ids.forEach((id) => { tx.objectStore('links').delete(id); tx.objectStore('pictures').delete(id); });
    return finish(tx);
  });
  const pictureUrl = (p) => (p && p.bytes ? URL.createObjectURL(new Blob([p.bytes], { type: p.type || 'image/jpeg' })) : '');
  // A board as one file, for a Ref and a The Eye that don't share a phone's
  // storage (each installed on its own): the same pictures, in a versioned
  // JSON file. Built in pieces, so a big board is never one string.
  const BOARD_FILE = { app: 'ref', kind: 'ref-board', version: 1 };
  async function boardFile(about, pictures) {
    const url = (p) => blobToDataUrl(new Blob([p.bytes], { type: p.type || 'image/jpeg' }));
    const head = { ...BOARD_FILE, exportedAt: nowIso(), board: { id: about.id, name: about.name, pageCount: about.pageCount, photoCount: about.photoCount, updatedAt: about.updatedAt } };
    const parts = [JSON.stringify(head).slice(0, -1), ',"cover":', JSON.stringify(pictures.cover ? await url(pictures.cover) : null), ',"pages":['];
    for (const [i, p] of pictures.pages.entries()) parts.push(i ? ',' : '', JSON.stringify(await url(p)));
    parts.push(']}');
    const safe = String(about.name || 'Mood board').replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'Mood board';
    return new File(parts, `${safe} (board).json`, { type: 'application/json' });
  }
  // Reads a board file back: { board, pictures }, or throws saying what's wrong.
  async function readBoardFile(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't a board from Ref."); }
    if (!data || data.kind !== BOARD_FILE.kind || !Array.isArray(data.pages)) throw new Error("That file isn't a board from Ref.");
    if (data.version > BOARD_FILE.version) throw new Error('That board was made by a newer Ref. Update this app and try again.');
    const picture = async (u) => {
      if (typeof u !== 'string' || !u.startsWith('data:image/')) return null;
      const b = await (await fetch(u)).blob();
      return { type: b.type || 'image/jpeg', bytes: await b.arrayBuffer() };
    };
    const pages = (await Promise.all(data.pages.map(picture))).filter(Boolean);
    if (!pages.length) throw new Error('That board has no pages in it.');
    const b = data.board || {};
    return {
      board: { id: typeof b.id === 'string' ? b.id : null, name: hasText(b.name) ? b.name : 'Mood board', pageCount: pages.length, photoCount: Number(b.photoCount) || 0 },
      pictures: { cover: (await picture(data.cover)) || pages[0], pages },
    };
  }

  Object.assign(parts, {
    linksWhere, getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile,
    readBoardFile
  });
})();
;

// ---- shared/data/df-data.js ----
// window.DFData: everything the notebooks use from the shared data files,
// put together. Loaded last, after the other files in data/shared/.
(function () {
  'use strict';
  const parts = window.DFDataParts;
  const {
    open, rows, getOne, putMany, deleteOne, hasText, nowIso, todayStr, uid, overthoughts,
    linkId, reflectionId, saveReflections, dropReflections, reflections, eyeState,
    eyeShootName, eyeBackupFile, readEyeFile, journalMoved, somethingToMove, moveJournal,
    exportDb, importDb, sizeText, zipBackup, backupSteps, isZipFile, restoreZip, linksWhere,
    getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile, readBoardFile, saveFile,
    pickFiles, pickFile, inSuite, notebookUrl
  } = parts;

  window.DFData = {
    open, rows, getOne, putMany, deleteOne, hasText, todayStr, uid, nowIso,
    overthoughts, reflectionId, linkId, saveReflections, dropReflections, reflections,
    eyeState, eyeShootName, eyeBackupFile, readEyeFile,
    journalMoved, somethingToMove, moveJournal,
    exportDb, importDb, saveFile, pickFile, pickFiles,
    zipBackup, backupSteps, isZipFile, restoreZip, sizeText,
    inSuite, notebookUrl,
    linksWhere, getLink, saveLink, linkPictures, dropLinks, pictureUrl, boardFile, readBoardFile,
  };
})();
;

// ---- data/suite-backup.js ----
// Documenting Fictions: what's behind "Back up all four" on the shelf
// (backup.js is its sheet). Kept apart from the sheet so it can be tested.
//
// One backup for all four notebooks, from the shelf.
//
// A zip (df-data.js's zipBackup), put together from what's stored so the
// phone never holds all four in memory: every notebook's database (Ref,
// Contact Sheet, Overthoughts, and The Eye's photos, starky-moodboards),
// df-links (the boards sent from Ref to The Eye's shoots) and df-stickers
// (the covers' stickers), plus from localStorage The Eye's shoots and
// journal (dailies_state_v1) and each notebook's cover colour. A notebook's
// own Restore takes its part out of this file too.
//
// Backups of all four made the first way (one .json, kind 'suite-backup':
//   { app: 'documenting-fictions', kind: 'suite-backup', version: 1, exportedAt,
//     notebooks: { ref, 'the-eye', 'contact-sheet', overthoughts, links, stickers } }, a part null
//   if that notebook had nothing; one from before the stickers has no stickers part, and leaves
//   them as they are) still go back in.
(function () {
  'use strict';
  const D = window.DFData;
  if (!D) return;

  const DBS = [
    { id: 'ref', db: 'ref-notebook', app: 'ref', book: 'ref-notebook-book' },
    { id: 'contact-sheet', db: 'contact-sheet', app: 'contact-sheet', book: 'contact-sheet-book' },
    { id: 'overthoughts', db: 'overthoughts', app: 'overthoughts', book: 'overthoughts-book' },
    { id: 'links', db: 'df-links', app: 'documenting-fictions', book: null }, // boards sent from Ref to The Eye's shoots
    { id: 'stickers', db: 'df-stickers', app: 'documenting-fictions', book: null }, // the stickers on the four covers (stickers.js)
  ];
  const EYE_STATE = 'dailies_state_v1';
  const EYE_LAST_BACKUP = 'dailies_last_backup_v1'; // The Eye's "Last backup", so its monthly reminder counts this one
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  // Which databases are there already. Opening one that isn't would make an
  // empty one, which its notebook would then trip over.
  async function existing() {
    if (!indexedDB.databases) return null; // can't tell: isNew() looks at each one
    return new Set((await indexedDB.databases()).map((d) => d.name));
  }

  // Whether a notebook's database is new on this device. Where the browser
  // can't list them, opening it says: a new one starts from version 0, and
  // that first opening is called off, so it can be made from the backup.
  async function isNew(name, have) {
    if (have) return !have.has(name);
    try {
      // Asked for no version, an existing one opens as it is: this only runs for a new one.
      const db = await D.open(name, undefined, (made, old, tx) => tx.abort());
      db.close();
      return false;
    } catch (e) {
      if (e && e.name === 'AbortError') return true;
      throw e;
    }
  }

  const EYE_DB = 'starky-moodboards'; // The Eye's photos
  const DB_NAMES = [...DBS.map((n) => n.db), EYE_DB];

  // { parts, size, release, done } (df-data.js's zipBackup), or null with nothing to back up.
  async function makeBackup(onProgress) {
    const have = await existing();
    const eye = !!ls.get(EYE_STATE);
    const dbs = DBS.map((n) => n.db).filter((n) => !have || have.has(n));
    if (eye) dbs.push(EYE_DB);
    if (!dbs.length) return null;
    return D.zipBackup({
      app: 'documenting-fictions',
      kind: 'suite',
      databases: dbs,
      local: [...(eye ? [EYE_STATE] : []), ...DBS.filter((n) => n.book).map((n) => n.book)],
      filename: `documenting-fictions-backup-${D.todayStr()}.zip`,
      onProgress,
    });
  }

  // A backup zip of all four back in: the databases it has (each swapped for
  // its part), then the cover colours and The Eye's shoots and journal. The
  // Eye's part is checked before anything is changed.
  async function restoreZip(files, onProgress) {
    const r = await D.restoreZip(files, {
      kind: 'suite',
      databases: DB_NAMES,
      onProgress,
      check: async (local) => {
        const st = await local(EYE_STATE);
        if (st == null) return;
        let ok = false;
        try { ok = Array.isArray(JSON.parse(st).shoots); } catch (e) { /* not JSON */ }
        if (!ok) throw new Error("The Eye's part of that file isn't right. Nothing was changed.");
      },
    });
    for (const n of DBS) {
      const book = n.book ? await r.local(n.book) : null;
      if (book) ls.set(n.book, book);
    }
    const st = await r.local(EYE_STATE);
    if (st != null) {
      localStorage.setItem(EYE_STATE, st); // throws if it doesn't fit, and the restore says so
      const color = JSON.parse(st).presentation && JSON.parse(st).presentation.color;
      if (color) ls.set('df-app-color', color);
    }
  }

  // Puts one notebook's database back from its part, exactly as it was: its
  // stores are cleared first. The slow part (turning data URLs back into
  // photos) is done before the write opens, or the write would close on the
  // wait. A notebook never opened on this device gets its database made from
  // what the backup says it looked like.
  async function putBack(n, data, have) {
    const unpacked = {};
    for (const [name, s] of Object.entries(data.stores)) {
      unpacked[name] = [];
      for (const [k, v] of s.rows || []) unpacked[name].push([await unpack(k), await unpack(v)]);
    }
    const fresh = await isNew(n.db, have);
    const db = await D.open(n.db, fresh ? data.version : undefined, fresh ? (made) => {
      for (const [name, s] of Object.entries(data.stores)) {
        if (made.objectStoreNames.contains(name)) continue;
        const m = s.meta || {};
        const os = made.createObjectStore(name, m.keyPath == null ? { autoIncrement: !!m.autoIncrement } : { keyPath: m.keyPath, autoIncrement: !!m.autoIncrement });
        (m.indexes || []).forEach((ix) => os.createIndex(ix.name, ix.keyPath, { unique: !!ix.unique, multiEntry: !!ix.multiEntry }));
      }
    } : null);
    try {
      const names = Object.keys(unpacked).filter((s) => db.objectStoreNames.contains(s));
      if (names.length) {
        const tx = db.transaction(names, 'readwrite');
        const done = new Promise((ok, no) => { tx.oncomplete = ok; tx.onabort = tx.onerror = () => no(tx.error || new Error("That wasn't restored.")); });
        try {
          names.forEach((s) => {
            const os = tx.objectStore(s);
            os.clear();
            unpacked[s].forEach(([k, v]) => { if (os.keyPath) os.put(v); else os.put(v, k); });
          });
        } catch (e) {
          tx.abort(); // a row the store can't take at all: nothing goes in, not even the clear
        }
        await done;
      }
    } finally {
      db.close();
    }
    if (n.book && data.extra && data.extra.book) ls.set(n.book, data.extra.book);
  }

  // df-data.js keeps its unpacking to itself; this is the same thing.
  async function unpack(v) {
    if (Array.isArray(v)) { const out = []; for (const x of v) out.push(await unpack(x)); return out; }
    if (v && typeof v === 'object') {
      if (typeof v.__blob === 'string') {
        const b = await (await fetch(v.__blob)).blob();
        return v.name ? new File([b], v.name, { type: v.type || b.type, lastModified: v.lastModified || Date.now() }) : new Blob([b], { type: v.type || b.type });
      }
      if (typeof v.__buf === 'string') {
        const buf = await (await (await fetch(v.__buf)).blob()).arrayBuffer();
        return v.__view && typeof self[v.__view] === 'function' ? new self[v.__view](buf) : buf;
      }
      if (typeof v.__date === 'string') return new Date(v.__date);
      const out = {}; for (const k of Object.keys(v)) out[k] = await unpack(v[k]); return out;
    }
    return v;
  }

  // The Eye, the way its own Restore does it: the shoots and journal into
  // localStorage (it tidies them up as it opens), the photos into its
  // database, key by key.
  async function putBackEye(part) {
    if (!part || !part.state || !Array.isArray(part.state.shoots)) throw new Error("The Eye's part of that file isn't right.");
    const db = await D.open('starky-moodboards', 1, (made) => { if (!made.objectStoreNames.contains('images')) made.createObjectStore('images'); });
    try {
      const tx = db.transaction('images', 'readwrite');
      Object.entries(part.images || {}).forEach(([k, v]) => tx.objectStore('images').put(v, k));
      await new Promise((ok, no) => { tx.oncomplete = ok; tx.onabort = tx.onerror = () => no(tx.error || new Error("The Eye's photos weren't restored.")); });
    } finally {
      db.close();
    }
    localStorage.setItem(EYE_STATE, JSON.stringify(part.state)); // throws if it doesn't fit, and the restore says so
    if (part.state.presentation && part.state.presentation.color) ls.set('df-app-color', part.state.presentation.color);
  }

  // A backup of all four made the first way (one .json).
  async function restoreJson(file) {
    let data;
    try { data = JSON.parse(await file.text()); } catch (e) { throw new Error("That file isn't a Documenting Fictions backup."); }
    if (!data || data.kind !== 'suite-backup' || !data.notebooks) throw new Error("That file isn't a backup of all four. A single notebook's backup goes back in from that notebook's options.");
    // Every part checked before anything is written.
    for (const n of DBS) {
      const part = data.notebooks[n.id];
      if (part && (!part.stores || part.database !== n.db)) throw new Error(`The ${n.id} part of that file isn't right. Nothing was changed.`);
    }
    const eye = data.notebooks['the-eye'];
    if (eye && (!eye.state || !Array.isArray(eye.state.shoots))) throw new Error("The Eye's part of that file isn't right. Nothing was changed.");
    const have = await existing();
    for (const n of DBS) if (data.notebooks[n.id]) await putBack(n, data.notebooks[n.id], have);
    if (data.notebooks['the-eye']) await putBackEye(data.notebooks['the-eye']);
  }

  window.DFSuiteBackup = { makeBackup, restoreZip, restoreJson, EYE_LAST_BACKUP };
})();
;

// ---- components/backup-sheet.js ----
// Documenting Fictions: the "Back up all four" sheet on the shelf. What it
// saves and restores is in data/suite-backup.js.
(function () {
  'use strict';
  const D = window.DFData;
  const B = window.DFSuiteBackup;
  if (!D || !B) return;
  const { makeBackup, restoreZip, restoreJson, EYE_LAST_BACKUP } = B;
  const ls = { set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  // ---------- The sheet ----------
  function sheet(html, onClose) {
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); if (onClose) onClose(); };
    dim.addEventListener('click', (e) => { if (e.target === dim || e.target.closest('[data-close]')) close(); });
    return { el: dim.firstElementChild, close };
  }
  const say = (s, text) => { const p = s.el.querySelector('.sheet-note'); p.textContent = text; p.hidden = !text; };

  // Opened from the film roll's panel on the shelf (pages/shelf-options.js).
  window.DFBackup = { open() {
    // The backup's made on the first tap and handed over on a second one, as
    // an iPhone only shares a file straight from a tap.
    let open = true;
    let made = null;
    let steps = null;
    const s = sheet(`
      <h2>Back up all four</h2>
      <p>One file with Ref, The Eye, Layouts and Overthoughts, photos and all. Keep it somewhere safe, like Files or iCloud Drive.</p>
      <button type="button" class="sheet-btn primary" data-save>Save a backup</button>
      <button type="button" class="sheet-btn" data-restore>Restore from a backup</button>
      <p class="sheet-note" hidden></p>
      <button type="button" class="sheet-btn plain" data-close>Close</button>`, () => { open = false; if (made) made.done(); });
    s.el.addEventListener('click', async (e) => {
      const save = e.target.closest('[data-save]');
      if (save && made) {
        try {
          if (await steps.tap()) { ls.set(EYE_LAST_BACKUP, String(Date.now())); say(s, 'Backup saved.'); save.disabled = true; }
          save.textContent = steps.label;
        } catch (err) {
          say(s, err.message || "The backup wasn't saved.");
        }
        return;
      }
      if (save) {
        save.disabled = true;
        save.textContent = 'Putting it together';
        try {
          const m = await makeBackup((f) => { save.textContent = `Putting it together, ${Math.floor(f * 100)}%`; });
          if (!open) { if (m) m.done(); return; }
          if (!m) { say(s, 'There is nothing to back up yet.'); save.textContent = 'Save a backup'; return; }
          made = m;
          steps = D.backupSteps(m); // one file, or a few on a phone: a tap each
          save.textContent = steps.label;
          say(s, steps.note);
        } catch (err) {
          console.error(err);
          save.textContent = 'Save a backup';
          say(s, err.message || "The backup wasn't saved.");
        } finally {
          save.disabled = false;
        }
        return;
      }
      if (e.target.closest('[data-restore]')) {
        const files = await D.pickFiles('.zip,application/zip,.json,application/json'); // straight from the tap, or iOS won't open the picker
        if (!files.length) return;
        const c = sheet(`
          <h2>Restore all four?</h2>
          <p>Everything in Ref, The Eye, Layouts and Overthoughts on this device is swapped for what's in the file. This can't be undone, so save a backup first if you might want today's back.</p>
          <button type="button" class="sheet-btn primary danger" data-yes>Restore</button>
          <button type="button" class="sheet-btn plain" data-close>Cancel</button>
          <p class="sheet-note" hidden></p>`);
        c.el.querySelector('[data-yes]').addEventListener('click', async (ev) => {
          const yes = ev.currentTarget;
          yes.disabled = true;
          yes.textContent = 'Restoring';
          try {
            if (await D.isZipFile(files[0])) await restoreZip(files, (f) => { yes.textContent = `Restoring, ${Math.floor(f * 100)}%`; });
            else await restoreJson(files[0]);
            yes.textContent = 'Restored';
            say(c, 'All four are back as they were in the file.');
            setTimeout(() => location.reload(), 900);
          } catch (err) {
            yes.disabled = false;
            yes.textContent = 'Restore';
            say(c, err.message || "That backup couldn't be restored.");
          }
        });
      }
    });
  } };
})();
;
