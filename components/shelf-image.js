// The picture Save as image makes (round 7, 08-save-as-image, 16 Nov; the
// sheet is pages/shelf-save-image.js). On paper: the notebook in front lying
// flat with its stickers (components/cover-image.js) over a soft floor
// shadow, or the whole shelf as it's arranged (each notebook's cover where it
// stands now, in its perspective, the ones further back fading as they do on
// the shelf); DOCUMENTING FICTIONS small at the foot. 1080 wide: Post 4:5,
// Story 9:16 or Square. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addShelfImage = function addShelfImage(ed) {
  'use strict';
  const SIZES = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };
  Object.assign(ed, { shelfImage, IMAGE_SIZES: SIZES });
  const INK = '#313D45', PAPER = '#FAFAF7', WORDS = 'DOCUMENTING FICTIONS';

  // ---------- The foot: the wordmark and the floor shadows ----------
  function wordmark(x, w, y, u) {
    x.fillStyle = INK;
    x.font = `700 ${30 * u}px Figtree, system-ui, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';
    if (!('letterSpacing' in x)) { x.fillText(WORDS, w / 2, y); return; }
    const gap = Math.max(0, (540 * u - x.measureText(WORDS).width) / (WORDS.length - 1)); // half the width, as the mockup
    x.letterSpacing = `${gap}px`;
    x.fillText(WORDS, w / 2 + gap / 2, y);
    x.letterSpacing = '0px';
  }
  function floorShadow(x, cx, cy, rw, alpha) {
    x.save();
    x.translate(cx, cy);
    x.scale(1, 0.1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, rw);
    g.addColorStop(0, `rgba(49, 61, 69, ${alpha})`);
    g.addColorStop(1, 'rgba(49, 61, 69, 0)');
    x.fillStyle = g;
    x.beginPath();
    x.arc(0, 0, rw, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }

  // ---------- The whole shelf: where each cover is on the screen ----------
  // Its corners as drawn now (3D and all): four points on the cover's plane,
  // the right ones out past the tabs (BOOK_WIDE).
  function quadOf(i) {
    const front = ed.slots[i].querySelector('.front');
    const pts = [[0, 0], [ed.BOOK_WIDE, 0], [ed.BOOK_WIDE, 1], [0, 1]].map(([u, v]) => {
      const p = document.createElement('i');
      p.style.cssText = `position:absolute;left:${u * 100}%;top:${v * 100}%;width:0;height:0`;
      front.append(p);
      const r = p.getBoundingClientRect();
      p.remove();
      return { x: r.left, y: r.top };
    });
    const fog = Number(ed.slots[i].querySelector('.fog').style.opacity) || 0;
    return { i, z: Number(ed.slots[i].style.zIndex) || 0, fog, pts };
  }
  // The unit square onto the quad p (a perspective, exactly: Heckbert's).
  function squareTo(p) {
    const [a0, a1, a2, a3] = p;
    const dx1 = a1.x - a2.x, dx2 = a3.x - a2.x, dx3 = a0.x - a1.x + a2.x - a3.x;
    const dy1 = a1.y - a2.y, dy2 = a3.y - a2.y, dy3 = a0.y - a1.y + a2.y - a3.y;
    const den = dx1 * dy2 - dx2 * dy1;
    const g = den ? (dx3 * dy2 - dx2 * dy3) / den : 0, h = den ? (dx1 * dy3 - dx3 * dy1) / den : 0;
    const A = a1.x - a0.x + g * a1.x, B = a3.x - a0.x + h * a3.x, D = a1.y - a0.y + g * a1.y, E = a3.y - a0.y + h * a3.y;
    return (u, v) => { const q = g * u + h * v + 1; return { x: (A * u + B * v + a0.x) / q, y: (D * u + E * v + a0.y) / q }; };
  }
  // One triangle of the picture onto one of the canvas (s: in the picture, d: on the canvas).
  function triangle(x, img, s, d) {
    const [s0, s1, s2] = s, [d0, d1, d2] = d;
    const ux = s1.x - s0.x, uy = s1.y - s0.y, vx = s2.x - s0.x, vy = s2.y - s0.y, det = ux * vy - vx * uy;
    if (!det) return;
    const px = d1.x - d0.x, py = d1.y - d0.y, qx = d2.x - d0.x, qy = d2.y - d0.y;
    const a = (px * vy - qx * uy) / det, c = (qx * ux - px * vx) / det, b = (py * vy - qy * uy) / det, e = (qy * ux - py * vx) / det;
    const mx = (d0.x + d1.x + d2.x) / 3, my = (d0.y + d1.y + d2.y) / 3;
    const out = (p) => { const l = Math.hypot(p.x - mx, p.y - my) || 1; return { x: p.x + (p.x - mx) / l * 0.6, y: p.y + (p.y - my) / l * 0.6 }; }; // a hair over, so no seams
    x.save();
    x.beginPath();
    [d0, d1, d2].map(out).forEach((p, k) => (k ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
    x.closePath();
    x.clip();
    x.transform(a, b, c, e, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - e * s0.y);
    x.drawImage(img, 0, 0);
    x.restore();
  }
  function mapOnto(x, img, pts, n = 12) {
    const at = squareTo(pts), w = img.width, h = img.height;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const u0 = c / n, u1 = (c + 1) / n, v0 = r / n, v1 = (r + 1) / n;
        const S = (u, v) => ({ x: u * w, y: v * h });
        triangle(x, img, [S(u0, v0), S(u1, v0), S(u1, v1)], [at(u0, v0), at(u1, v0), at(u1, v1)]);
        triangle(x, img, [S(u0, v0), S(u1, v1), S(u0, v1)], [at(u0, v0), at(u1, v1), at(u0, v1)]);
      }
    }
  }
  async function drawShelf(x, w, top, bottom, u) {
    const quads = ed.slots.map((s, i) => quadOf(i)).sort((a, b) => a.z - b.z);
    const all = quads.flatMap((q) => q.pts);
    const left = Math.min(...all.map((p) => p.x)), right = Math.max(...all.map((p) => p.x));
    const high = Math.min(...all.map((p) => p.y)), low = Math.max(...all.map((p) => p.y));
    const roomH = bottom - top, k = Math.min(w * 0.88 / (right - left), roomH / ((low - high) * 1.08));
    const ox = (w - (right - left) * k) / 2 - left * k, oy = top + (roomH - (low - high) * 1.08 * k) / 2 - high * k;
    for (const q of quads) {
      const pts = q.pts.map((p) => ({ x: ox + p.x * k, y: oy + p.y * k }));
      const coverW = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) / ed.BOOK_WIDE;
      floorShadow(x, (pts[2].x + pts[3].x) / 2 - coverW * 0.05, Math.max(pts[2].y, pts[3].y) + coverW * 0.1, coverW * 0.5, 0.14 * (1 - q.fog));
      const tex = await ed.bookCanvas(q.i, Math.max(120, Math.min(900, Math.round(coverW * 1.25))));
      mapOnto(x, tex, pts);
      if (q.fog) { // further back, paler (styles/shelf.css .fog)
        x.fillStyle = `rgba(255, 255, 255, ${q.fog})`;
        x.beginPath();
        pts.forEach((p, n) => (n ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
        x.fill();
      }
    }
  }

  // what: 'front' (the notebook in front) or 'shelf'; size: a SIZES key;
  // width: how wide to draw it (1080 to save, smaller for the preview).
  async function shelfImage({ what = 'front', size = 'post', width = 1080 } = {}) {
    const [W0, H0] = SIZES[size] || SIZES.post;
    const u = width / W0, w = width, h = Math.round(H0 * u);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const x = cv.getContext('2d');
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    x.fillStyle = PAPER;
    x.fillRect(0, 0, w, h);
    // From the top: 118 of room, the cover, 88 to the shadow's middle, 177 to the wordmark, 73 under it (at 1080 wide).
    const coverW = Math.min(657 * u, (h - 456 * u) / 1.36);
    const extra = Math.max(0, h - (coverW * 1.36 + 456 * u)) / 2;
    const top = 118 * u + extra, shadowY = top + coverW * 1.36 + 88 * u, wordY = shadowY + 177 * u;
    if (what === 'shelf') await drawShelf(x, w, Math.max(60 * u, top - 40 * u), shadowY + 40 * u, u);
    else {
      const left = (w - coverW * ed.BOOK_WIDE) / 2;
      floorShadow(x, left + coverW * 0.53, shadowY, coverW * 0.46, 0.2);
      x.save();
      x.translate(left, top);
      await ed.drawBook(x, ed.mod(Math.round(ed.near !== null ? ed.near : ed.pos)), coverW);
      x.restore();
    }
    wordmark(x, w, wordY, u);
    return cv;
  }
};
