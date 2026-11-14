// Cut out (round 5, 06-cut-out-stickers): the sums that cut a sticker out of
// its photo, like a die-cut sticker. The cut-out model (data/cut-out-worker.js)
// says how sure it is that each spot of the photo is the subject; from that
// this keeps the largest piece with its holes filled, smooths the outline
// into one clean cut (close, open, a little blur), then draws the white
// border (3.5% of the sticker's width, 14 px at 400) or the black outline
// (60% of that) round it. If nothing clear stands out it says so (null) and
// the placing screen offers Card instead.
// An ES module: the worker imports it, and so do the tests.

export const SIDE = 320; // the model looks at the photo squeezed to 320 by 320
const MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
export const WHITE = 0.035; // the white border, of the sticker's width
export const INK = 0.6; // the black outline, of the white border
export const EDGES = { white: [255, 255, 255], outline: [0x31, 0x3d, 0x45] };
const FAR = 1e20; // further than anything in a photo (finite, so far minus far is 0)

// The photo (n pixels of RGBA) as the model takes it: each colour on its own
// (all the reds, then the greens, then the blues), scaled by the brightest
// value, less the usual average, over the usual spread.
export function toInput(rgba, n) {
  let top = 1e-6;
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) top = Math.max(top, rgba[i * 4 + c]);
  const out = new Float32Array(3 * n);
  for (let c = 0; c < 3; c++) for (let i = 0; i < n; i++) out[c * n + i] = (rgba[i * 4 + c] / top - MEAN[c]) / STD[c];
  return out;
}

// Stretched to run from 0 to 1.
export function minMax(f) {
  let lo = Infinity, hi = -Infinity;
  for (const v of f) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const span = hi - lo || 1;
  return f.map((v) => (v - lo) / span);
}

// From sw by sh to dw by dh, each new spot a blend of the four nearest.
export function resizeBilinear(src, sw, sh, dw, dh) {
  const out = new Float32Array(dw * dh);
  const at = (i, s, d) => Math.min(s - 1, Math.max(0, ((i + 0.5) * s) / d - 0.5));
  for (let y = 0; y < dh; y++) {
    const fy = at(y, sh, dh), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), wy = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = at(x, sw, dw), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), wx = fx - x0;
      const up = src[y0 * sw + x0] * (1 - wx) + src[y0 * sw + x1] * wx;
      const down = src[y1 * sw + x0] * (1 - wx) + src[y1 * sw + x1] * wx;
      out[y * dw + x] = up * (1 - wy) + down * wy;
    }
  }
  return out;
}

// 1 where it's at least t, else 0.
export const threshold = (f, t = 0.5) => Uint8Array.from(f, (v) => (v >= t ? 1 : 0));

// The biggest piece (spots touching, corners too), with how big it is and
// how much there was in all.
export function largestPiece(bin, w, h) {
  const label = new Int32Array(w * h), stack = new Int32Array(w * h);
  let best = -1, area = 0, total = 0, next = 0;
  for (let start = 0; start < w * h; start++) {
    if (!bin[start] || label[start]) continue;
    next++;
    let size = 0, top = 0;
    label[start] = next;
    stack[top++] = start;
    while (top) {
      const i = stack[--top], x = i % w;
      size++;
      // Left and right only within its row; above the top or below the bottom there's nothing.
      const from = x > 0 ? i - 1 : i, to = x < w - 1 ? i + 1 : i;
      for (const row of [-w, 0, w]) {
        for (let j = from + row; j <= to + row; j++) {
          if (bin[j] && !label[j]) { label[j] = next; stack[top++] = j; }
        }
      }
    }
    total += size;
    if (size > area) { area = size; best = next; }
  }
  return { mask: Uint8Array.from(label, (l) => (l === best ? 1 : 0)), area, total };
}

// Holes filled: whatever the outside can't reach (side to side, not by corners).
export function fillHoles(bin, w, h) {
  const out = new Uint8Array(w * h).fill(1), stack = new Int32Array(w * h);
  let top = 0;
  const reach = (i) => { if (!bin[i] && out[i]) { out[i] = 0; stack[top++] = i; } };
  for (let x = 0; x < w; x++) { reach(x); reach((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { reach(y * w); reach(y * w + w - 1); }
  // (Past the top or bottom there's nothing to reach; from one side round to
  // the other is only ever from one edge spot to another, all reached already.)
  while (top) {
    const i = stack[--top];
    reach(i - 1); reach(i + 1); reach(i - w); reach(i + w);
  }
  return out;
}

// One line of the distance sums (Felzenszwalb and Huttenlocher): for each
// spot, the least of (its distance to p) squared plus f[p].
function lowest(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = (f[q] - f[v[k]] + q * q - v[k] * v[k]) / (2 * (q - v[k]));
    while (s <= z[k]) { k--; s = (f[q] - f[v[k]] + q * q - v[k] * v[k]) / (2 * (q - v[k])); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
// How far each spot is from the nearest 1, squared, exactly.
export function edt(bin, w, h) {
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const out = new Float64Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = bin[y * w + x] ? 0 : FAR;
    lowest(f, h, d, v, z);
    for (let y = 0; y < h; y++) out[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = out[y * w + x];
    lowest(f, w, d, v, z);
    for (let x = 0; x < w; x++) out[y * w + x] = d[x];
  }
  return out;
}

// Grown by r all round (round at the corners), or shrunk by r.
export const grow = (bin, w, h, r) => Uint8Array.from(edt(bin, w, h), (d) => (d <= r * r ? 1 : 0));
export const shrink = (bin, w, h, r) => grow(bin.map((b) => 1 - b), w, h, r).map((b) => 1 - b);

// Each spot the average of the square r round it (as far as the picture goes).
export function boxBlur(src, w, h, r) {
  const across = new Float32Array(w * h), out = new Float32Array(w * h);
  const line = (from, to, n, step, start) => {
    const sum = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) sum[i + 1] = sum[i] + from[start + i * step];
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - r), b = Math.min(n, i + r + 1);
      to[start + i * step] = (sum[b] - sum[a]) / (b - a);
    }
  };
  for (let y = 0; y < h; y++) line(src, across, w, 1, y * w);
  for (let x = 0; x < w; x++) line(across, out, h, w, x);
  return out;
}

// The box round the 1s, or null if there are none.
export function bbox(bin, w, h) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!bin[y * w + x]) continue;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x);
      y0 = Math.min(y0, y); y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

// Something clear: between 3% and 92% of the photo, most of it (60%) in one piece.
export const clearEnough = (area, total, size) => total >= 0.03 * size && total <= 0.92 * size && area >= 0.6 * total;

// The cut, from the model's answer (SIDE by SIDE) for a photo w by h:
// where the sticker sits on the photo (x, y, w, h: it can run past the
// photo's edges, where the border goes round), which of its spots are the
// subject, how far each is from the cut's outline, and the white border and
// black outline's widths. Or null if nothing clear stands out.
export function cutOut(answer, w, h) {
  const sure = resizeBilinear(minMax(answer), SIDE, SIDE, w, h);
  const { mask, area, total } = largestPiece(threshold(sure), w, h);
  if (!clearEnough(area, total, w * h)) return null;
  const raw = fillHoles(mask, w, h);
  const b = bbox(raw, w, h);
  // Smoothed in proportion to its size.
  const long = Math.max(b.w, b.h);
  const shut = Math.max(1, Math.round(long * 0.015)), open = Math.max(1, Math.round(long * 0.01)), soft = Math.max(1, Math.round(long * 0.006));
  // Room round it for the border, and for the smoothing to see past it.
  const pad = Math.ceil((WHITE * b.w) / (1 - 2 * WHITE)) + shut + 2;
  const gw = b.w + 2 * pad, gh = b.h + 2 * pad;
  let shape = new Uint8Array(gw * gh);
  for (let y = 0; y < b.h; y++) for (let x = 0; x < b.w; x++) shape[(y + pad) * gw + x + pad] = raw[(y + b.y) * w + x + b.x];
  const own = shape.slice();
  shape = shrink(grow(shape, gw, gh, shut), gw, gh, shut);
  shape = grow(shrink(shape, gw, gh, open), gw, gh, open);
  const piece = largestPiece(threshold(boxBlur(shape, gw, gh, soft)), gw, gh);
  if (!piece.area) return null; // only thin bits, smoothed away
  shape = fillHoles(piece.mask, gw, gh);
  // The border: 3.5% of the sticker's width, the sticker being the cut plus a border each side.
  const c = bbox(shape, gw, gh);
  const white = (WHITE * c.w) / (1 - 2 * WHITE), ink = white * INK;
  const room = Math.ceil(white) + 1;
  const x0 = c.x - room, y0 = c.y - room, cw = c.w + 2 * room, ch = c.h + 2 * room;
  const far = edt(shape, gw, gh);
  const subject = new Uint8Array(cw * ch), dist = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const g = (y + y0) * gw + x + x0;
      subject[y * cw + x] = own[g];
      dist[y * cw + x] = Math.sqrt(far[g]);
    }
  }
  return { x: b.x - pad + x0, y: b.y - pad + y0, w: cw, h: ch, subject, dist, white, ink };
}

// The sticker's picture with its edge ('white' or 'outline'): the photo
// (RGBA, pw wide) where it's the subject, the edge's colour elsewhere; and
// its shape, as see-through (the outline, smooth at its edge).
export function paint(photo, pw, cut, edge) {
  const [r, g, b] = EDGES[edge];
  const reach = edge === 'outline' ? cut.ink : cut.white;
  const n = cut.w * cut.h, colour = new Uint8ClampedArray(n * 4), shape = new Uint8ClampedArray(n * 4);
  for (let i = 0; i < n; i++) {
    const o = i * 4, at = ((cut.y + Math.floor(i / cut.w)) * pw + cut.x + (i % cut.w)) * 4;
    const own = cut.subject[i];
    colour[o] = own ? photo[at] : r;
    colour[o + 1] = own ? photo[at + 1] : g;
    colour[o + 2] = own ? photo[at + 2] : b;
    colour[o + 3] = 255;
    shape[o + 3] = Math.round(255 * Math.min(1, Math.max(0, reach + 0.5 - cut.dist[i])));
  }
  return { colour, shape };
}
