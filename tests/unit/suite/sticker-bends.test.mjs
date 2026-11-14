// components/sticker-bends.js: where a sticker sits on a cover, and where it
// bends over the cover's edges. The bug (14 Nov): a big sticker showed "a
// frame": top and bottom bend shading across its face though it was inside
// the cover, because its height was worked out 1.85 times too tall.
import { describe, it, expect, vi } from 'vitest';

delete window.StickerParts;
await import('../../../components/sticker-bends.js');

const ed = { COVER: 1000 / 1360, ratioOf: (s) => s.ratio || 1 };
window.StickerParts.addStickerBends(ed);
const at = (o) => ed.bendsOf({ shape: 'circle', x: 0.5, y: 0.5, size: 0.5, ...o });
const shown = (b) => Object.keys(b).filter((k) => b[k]).sort();
const near = (a, b) => expect(a).toBeCloseTo(b, 6);

describe('addStickerBends', () => {
  it('adds bendsOf and nothing else', () => {
    expect(Object.keys(ed).filter((k) => !['COVER', 'ratioOf'].includes(k))).toEqual(['bendsOf']);
  });
  it('keeps the parts already on window.StickerParts', async () => {
    window.StickerParts.other = 1;
    vi.resetModules();
    await import('../../../components/sticker-bends.js');
    expect(window.StickerParts.other).toBe(1);
    expect(typeof window.StickerParts.addStickerBends).toBe('function');
  });
});

describe('bendsOf', () => {
  it('bends nowhere when the sticker is inside the cover', () => {
    expect(shown(at({}))).toEqual([]);
  });

  it('bends nowhere for a big round sticker that is still inside top to bottom (the frame bug)', () => {
    // The cover's width = its height x .735, so a sticker the cover's width
    // across is .735 of its height tall: from .1325 to .8675, inside.
    expect(shown(at({ size: 1 }))).toEqual([]);
    // Starky's: about 1.16 covers wide, a little below the middle, past the right edge.
    expect(shown(at({ size: 1.16, x: 0.6, y: 0.557 }))).toEqual(['r']);
  });

  it('bends over the top or bottom only once it really passes them', () => {
    // .735 of the cover's height tall: its top at y - .3675.
    expect(shown(at({ size: 1, y: 0.37 }))).toEqual([]);
    expect(shown(at({ size: 1, y: 0.36 }))).toEqual(['t']);
    expect(shown(at({ size: 1, y: 0.63 }))).toEqual([]);
    expect(shown(at({ size: 1, y: 0.64 }))).toEqual(['b']);
  });

  it('bends over the right or left edge once it passes them', () => {
    expect(shown(at({ x: 0.74 }))).toEqual([]);
    expect(shown(at({ x: 0.76 }))).toEqual(['r']);
    expect(shown(at({ x: 0.26 }))).toEqual([]);
    expect(shown(at({ x: 0.24 }))).toEqual(['l']);
  });

  it('bends over two edges at a corner', () => {
    expect(shown(at({ x: 0.95, y: 0.95 }))).toEqual(['b', 'r']);
    expect(shown(at({ x: 0.05, y: 0.05 }))).toEqual(['l', 't']);
  });

  it('puts the right bend just inside the edge, as a share of the sticker', () => {
    // .5 wide from .5 to 1.0 when x is .75: the edge is at 50% of it; the
    // shading reaches .075 of the cover's width in, 15% of the sticker.
    const b = at({ x: 0.8 }); // from .55 to 1.05: the edge at 90%
    near(b.r.width, 15);
    near(b.r.left, 90 - 15);
  });

  it('puts the left bend just inside the edge', () => {
    const b = at({ x: 0.2 }); // from -.05 to .45: the edge at 10%
    near(b.l.left, 10);
    near(b.l.width, 15);
  });

  it('puts the top and bottom bends where the cover edge crosses the sticker', () => {
    // A round sticker .5 wide is .5 x 1000/1360 = .36765 of the cover's height
    // tall. With y at .1, its top is at -.08382: the edge is 22.8% down it.
    const t = at({ y: 0.1 });
    near(t.t.top, 22.8);
    // The shading reaches .075 of the cover's width, which is
    // .075 x 1000/1360 of its height: 15% of the sticker.
    near(t.t.height, 15);
    const b = at({ y: 0.9 }); // the bottom edge 77.2% down it, the shading 15% above that
    near(b.b.top, 77.2 - 15);
    near(b.b.height, 15);
  });

  it('measures a card or cut-out by its own shape', () => {
    // A card 1.5 wide for each 1 tall: .5 wide is .245 of the cover's height tall.
    expect(shown(at({ shape: 'rect', ratio: 1.5, size: 0.5, y: 0.13 }))).toEqual([]);
    expect(shown(at({ shape: 'rect', ratio: 1.5, size: 0.5, y: 0.12 }))).toEqual(['t']);
    near(at({ shape: 'rect', ratio: 1.5, size: 0.5, y: 0.9 }).b.height, (0.055125 / 0.245) * 100);
  });

  it('gives null for an edge it does not bend over', () => {
    expect(at({})).toEqual({ r: null, l: null, t: null, b: null });
  });
});
