// Spreads: two slides lying open, and keeping frames inside a spread.
import { SLIDE_W, MIN_FRAME, isStory } from './formats.js';

// ---------- Spreads ----------

// Slides are the pages of a notebook, two to a spread. A frame may run across
// the spine of a spread, but never across a page flip.
export const spreadOf = (k) => Math.floor(k / 2);
export const spreadCount = (p) => Math.ceil(p.slides / 2);

// How far a box starting at x can stretch, as [left, right] in strip units:
// the open spread, or in a Story just its own story (Stories are seen one at
// a time, so a photo can't run on into the next).
export function resizeRoom(p, spread, x) {
  if (!isStory(p)) return [spread * 2 * SLIDE_W, (spread + 1) * 2 * SLIDE_W];
  const k = Math.min(Math.max(Math.floor((x + 0.5) / SLIDE_W), 0), Math.max(p.slides - 1, 0));
  return [k * SLIDE_W, (k + 1) * SLIDE_W];
}

// Trims any frame crossing a flip back to the spread holding most of it.
export function keepInSpreads(p) {
  const S = 2 * SLIDE_W;
  const end = p.slides * SLIDE_W;
  let changed = false;
  for (const f of p.frames) {
    const first = Math.floor(f.x / S) + 1;
    if (first * S >= f.x + f.w || first * S >= end || first < 1) continue;
    const lo = Math.floor((f.x + f.w / 2) / S) * S;
    const l = Math.max(f.x, lo);
    const r = Math.min(f.x + f.w, lo + S);
    f.x = l;
    f.w = Math.max(MIN_FRAME, r - l);
    changed = true;
  }
  return changed;
}
