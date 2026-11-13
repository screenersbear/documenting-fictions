// Drawing a sticker: its creases, its picture, and where it sits on a cover
// (folding over an edge). (Loaded before components/stickers.js.)
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
  }; ed.urlOf = urlOf;
  function make(s, src, onFlap) {
    const el = document.createElement('div');
    el.className = `sticker ${s.shape}${s.printed ? ' printed' : ''}`;
    el.style.setProperty('--r', String(ed.ratioOf(s)));
    el.innerHTML = `<img class="photo" alt="" draggable="false" /><img class="crease" alt="" draggable="false" />${onFlap ? '' : '<i class="fold r" hidden></i><i class="fold l" hidden></i><i class="fold t" hidden></i><i class="fold b" hidden></i>'}`;
    el.querySelector('.photo').src = src;
    el.querySelector('.crease').src = creaseArt(seedOf(s), 1 / ed.ratioOf(s));
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
    const list = ed.listOf(app);
    layer.replaceChildren(...list.map((s) => make(s, urlOf(s))));
    if (flap) flap.replaceChildren(...list.map((s) => make(s, urlOf(s), true)));
  }
};
