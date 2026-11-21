// The sums behind cropping a person's photo (20 Nov), as The Eye crops a
// talent photo: a 4:5 box the photo always covers. Drag moves it, the slider
// or two fingers zoom it (1 to 3 times), and it never shows an edge. The
// box is in screen pixels; the photo in its own. A view is { zoom, x, y }:
// how far it's zoomed past just covering the box, and where its top left
// corner sits in the box (0 or less).

export const RATIO = 4 / 5; // width over height, as a person's photo is shown
export const MOST_ZOOM = 3;
export const OUT = { w: 720, h: 900 }; // the photo kept, at most

// The scale at which the photo just covers the box (its shorter side fills it).
export function coverScale(img, box) {
  if (!(img.w > 0 && img.h > 0 && box.w > 0 && box.h > 0)) return 1;
  return Math.max(box.w / img.w, box.h / img.h);
}

const zoomIn = (z) => Math.min(MOST_ZOOM, Math.max(1, Number.isFinite(z) ? z : 1));

// Keeps the photo over the whole box: no corner past an edge.
export function clamp(view, img, box) {
  const zoom = zoomIn(view.zoom);
  const s = coverScale(img, box) * zoom;
  const minX = Math.min(0, box.w - img.w * s);
  const minY = Math.min(0, box.h - img.h * s);
  const x = Number.isFinite(view.x) ? view.x : 0;
  const y = Number.isFinite(view.y) ? view.y : 0;
  return { zoom, x: Math.min(0, Math.max(minX, x)), y: Math.min(0, Math.max(minY, y)) };
}

// To start: just covering the box, in the middle.
export function centred(img, box) {
  const s = coverScale(img, box);
  return clamp({ zoom: 1, x: (box.w - img.w * s) / 2, y: (box.h - img.h * s) / 2 }, img, box);
}

// Moved by a drag of dx, dy from where it was.
export const moveBy = (view, dx, dy, img, box) => clamp({ ...view, x: view.x + dx, y: view.y + dy }, img, box);

// Zoomed to `zoom`, the point (px, py) in the box staying where it is (the
// middle, for the slider; between two fingers, for a pinch).
export function zoomAt(view, zoom, px, py, img, box) {
  const base = coverScale(img, box);
  const now = base * zoomIn(view.zoom);
  const next = base * zoomIn(zoom);
  const ix = (px - view.x) / now;
  const iy = (py - view.y) / now;
  return clamp({ zoom: zoomIn(zoom), x: px - ix * next, y: py - iy * next }, img, box);
}

// The part of the photo the box shows, in the photo's own pixels.
export function sourceRect(view, img, box) {
  const v = clamp(view, img, box);
  const s = coverScale(img, box) * v.zoom;
  return { sx: 0 - v.x / s, sy: 0 - v.y / s, sw: box.w / s, sh: box.h / s };
}

// The size to keep it at: OUT wide, or the part's own width when it's
// smaller (never blown up), its height to the same shape.
export function outSize(rect) {
  if (!(rect.sw > 0 && rect.sh > 0)) return { w: 1, h: 1 };
  const w = Math.max(1, Math.round(Math.min(OUT.w, rect.sw)));
  return { w, h: Math.max(1, Math.round(w * rect.sh / rect.sw)) };
}
