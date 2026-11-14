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
