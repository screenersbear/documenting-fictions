// ref/data/tight-templates.js: grids with thin lines, no lines, or edge to
// edge (Starky, 21 Nov), added after the layouts in templates.js.
import { describe, it, expect } from 'vitest';
import { THIN, NONE, gridGap, tallGrids, wideGrids } from '../../../ref/data/tight-templates.js';

const area = { x: 1, y: 2, w: 6, h: 8 };
const text = { x: 1, y: 10, w: 6, h: 0.5 };
const near = (a, b) => expect(a).toBeCloseTo(b, 6);

describe('gridGap', () => {
  it('fills the box, the boxes gap apart, row by row', () => {
    const g = gridGap(2, 2, area, 1);
    expect(g).toHaveLength(4);
    expect(g[0]).toEqual({ x: 1, y: 2, w: 2.5, h: 3.5 });
    expect(g[1]).toEqual({ x: 4.5, y: 2, w: 2.5, h: 3.5 });
    expect(g[2]).toEqual({ x: 1, y: 6.5, w: 2.5, h: 3.5 });
    expect(g[3].x + g[3].w).toBe(7);
    expect(g[3].y + g[3].h).toBe(10);
  });
  it('touches with no gap', () => {
    const g = gridGap(3, 1, area, NONE);
    near(g[1].x, g[0].x + g[0].w);
    near(g[2].x, g[1].x + g[1].w);
  });
});

describe('the gaps', () => {
  it('are fine, or none', () => { expect(THIN).toBe(0.05); expect(NONE).toBe(0); });
});

const wideArea = { x: 0.45, y: 1, w: 12.4, h: 5.4 };
for (const [name, make, W, H, box] of [['tallGrids', tallGrids, 8.5, 11, area], ['wideGrids', wideGrids, 13.333, 7.5, wideArea]]) {
  describe(name, () => {
    const list = make(W, H, 0.5, box, text);
    it('marks every one extra, with a name, unique ids and photos inside the page', () => {
      expect(new Set(list.map((t) => t.id)).size).toBe(list.length);
      for (const t of list) {
        expect(t.extra).toBe(true);
        expect(t.name.length).toBeGreaterThan(0);
        expect(t.slots.length).toBeGreaterThan(1);
        for (const s of t.slots) {
          expect(s.x).toBeGreaterThanOrEqual(0);
          expect(s.y).toBeGreaterThanOrEqual(0);
          expect(s.x + s.w).toBeLessThanOrEqual(W + 1e-9);
          expect(s.y + s.h).toBeLessThanOrEqual(H + 1e-9);
        }
      }
    });
    it('keeps the page words where they were, but over the photos edge to edge', () => {
      for (const t of list) {
        if (t.id.includes('edge')) {
          expect(t.text.overlay).toBe(true);
          expect(t.slots[0]).toMatchObject({ x: 0, y: 0 });
          const last = t.slots[t.slots.length - 1];
          near(last.x + last.w, W);
          near(last.y + last.h, H);
        } else expect(t.text).toBe(text);
      }
    });
    it('has thin lines on the thin ones and none on the no-line ones', () => {
      const thin = list.find((t) => t.id.endsWith('-grid-4-thin'));
      const none = list.find((t) => t.id.endsWith('-grid-4-none'));
      near(thin.slots[1].x - (thin.slots[0].x + thin.slots[0].w), THIN);
      near(none.slots[1].x - (none.slots[0].x + none.slots[0].w), 0);
    });
    it('cuts the one dominant photo off the rest, thin lines apart', () => {
      const t = list.find((x) => x.id.includes('three-') && x.id.endsWith('-thin'));
      expect(t.slots).toHaveLength(3);
      const [big, a] = t.slots;
      expect(big.w * big.h).toBeGreaterThan(a.w * a.h);
    });
  });
}

describe('the layouts each side has', () => {
  it('lists the tall ones', () => {
    expect(tallGrids(8.5, 11, 0.5, area, text).map((t) => t.id)).toEqual([
      'lp-grid-4-thin', 'lp-grid-4-none', 'lp-grid-6-thin', 'lp-grid-6-none', 'lp-grid-9-thin', 'lp-grid-9-none',
      'lp-grid-12-thin', 'lp-two-stack-none', 'lp-three-top-thin', 'lp-strip-3', 'lp-edge-4', 'lp-edge-9',
    ]);
  });
  it('lists the wide ones', () => {
    expect(wideGrids(13.333, 7.5, 0.45, area, text).map((t) => t.id)).toEqual([
      'w-grid-4-thin', 'w-grid-4-none', 'w-grid-6-thin', 'w-grid-6-none', 'w-grid-8-thin', 'w-two-none', 'w-three-none',
      'w-four-across-thin', 'w-three-left-thin', 'w-edge-6', 'w-edge-8',
    ]);
  });
  it('sizes the edge to edge words to the page', () => {
    const narrow = tallGrids(3, 11, 0.5, area, text).find((t) => t.id === 'lp-edge-4');
    expect(narrow.text.w).toBe(2);
    expect(narrow.text.y).toBeCloseTo(11 - 0.5 - 0.6, 6);
  });
});
