// Drawing a sticker: its picture, its vinyl, its edge, and where it sits on a
// cover (folding over an edge). (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addStickerArt = function addStickerArt(ed) {
  'use strict';
  Object.assign(ed, { make, seat, placeOnFlap, paint });
  // ---------- Drawing them ----------
  const seedOf = (s) => (Number.isFinite(s.seed) ? s.seed : [...String(s.id)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7));
  // The vinyl (15 Nov: wrinkles, sheen and fold taken off, too much texture):
  // a flat print with a fine grain, laid over the photo in soft light so a flat
  // patch is mid grey and the photo keeps its colours, plus a soft gloss. Its
  // seed keeps a sticker's grain the same. Shelf only: never on photos in the apps.
  const svgSrc = (w, h, body) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;
  const grains = new Map();
  function grainArt(seed, aspect) { // aspect: height over width
    const key = `${seed}:${aspect.toFixed(3)}`;
    if (grains.has(key)) return grains.get(key);
    const w = 110, h = Math.max(20, Math.round(w * aspect)), n = Math.abs(seed % 9973);
    const art = svgSrc(w, h, `<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="${n}" result="n"/><feDiffuseLighting in="n" surfaceScale=".7" diffuseConstant=".65" lighting-color="#FFFFFF"><feDistantLight azimuth="225" elevation="50"/></feDiffuseLighting></filter><rect width="100%" height="100%" filter="url(#f)"/>`);
    grains.set(key, art);
    return art;
  }

  const urls = new Map();
  const urlOf = (s) => {
    if (!urls.has(s.id)) urls.set(s.id, URL.createObjectURL(new Blob([s.bytes], { type: s.type || 'image/jpeg' })));
    return urls.get(s.id);
  }; ed.urlOf = urlOf;
  // A cut-out's shape (round 5): see-through round its outline.
  const masks = new Map();
  const maskOf = (s) => {
    if (!s.mask) return '';
    if (!masks.has(s.id)) masks.set(s.id, URL.createObjectURL(new Blob([s.mask], { type: 'image/png' })));
    return masks.get(s.id);
  };
  // s: the sticker; src: its picture; onFlap: the bit round the fore-edge;
  // mask: a cut-out's shape (while it's placed; a saved one has its own).
  function make(s, src, onFlap, mask = maskOf(s)) {
    const el = document.createElement('div');
    el.className = `sticker ${s.shape}${s.printed ? ' printed' : ''}${s.edge === 'outline' ? ' outline' : ''}`;
    el.style.setProperty('--r', String(ed.ratioOf(s)));
    el.style.setProperty('--turn', `${Number(s.turn) || 0}deg`);
    const grain = grainArt(seedOf(s), 1 / ed.ratioOf(s));
    const inside = `<img class="photo" alt="" draggable="false" /><img class="vinyl grain" src="${grain}" alt="" draggable="false" /><i class="gloss"></i>${onFlap ? '' : '<i class="bend r" hidden></i><i class="bend l" hidden></i><i class="bend t" hidden></i><i class="bend b" hidden></i>'}`;
    // A cut-out: all of it (picture, vinyl, gloss, bends) clipped to its shape.
    if (s.shape === 'cut') {
      el.innerHTML = `<div class="cut-in">${inside}</div>`;
      el.style.setProperty('--cut', `url("${mask}")`);
    } else el.innerHTML = inside;
    el.querySelector('.photo').src = src;
    (onFlap ? placeOnFlap : seat)(el, s);
    return el;
  }
  // Where it sits, and the shading wherever it bends over an edge
  // (components/sticker-bends.js works out where).
  function seat(el, s) {
    el.style.left = `${s.x * 100}%`;
    el.style.top = `${s.y * 100}%`;
    el.style.width = `${s.size * 100}%`;
    const bends = ed.bendsOf(s);
    for (const [edge, at] of Object.entries(bends)) {
      const f = el.querySelector(`.bend.${edge}`);
      f.hidden = !at;
      if (at) for (const [k, v] of Object.entries(at)) f.style[k] = `${v}%`;
    }
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
