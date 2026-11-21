// rounds/data/crop.js: the sums behind cropping a person's photo (20 Nov).
import { describe, it, expect } from 'vitest';
import * as C from '../../../rounds/data/crop.js';

const BOX = { w: 200, h: 250 };
const WIDE = { w: 1000, h: 500 }; // landscape: its height fills the box
const TALL = { w: 400, h: 1000 }; // portrait: its width fills the box

describe('coverScale', () => {
  it('fills the box with the shorter side', () => {
    expect(C.coverScale(WIDE, BOX)).toBe(0.5);
    expect(C.coverScale(TALL, BOX)).toBe(0.5);
    expect(C.coverScale({ w: 200, h: 250 }, BOX)).toBe(1);
  });
  it('blows up a photo smaller than the box', () => {
    expect(C.coverScale({ w: 100, h: 100 }, BOX)).toBe(2.5);
  });
  it('is 1 for a photo or box with no size', () => {
    expect(C.coverScale({ w: 0, h: 10 }, BOX)).toBe(1);
    expect(C.coverScale(WIDE, { w: 0, h: 0 })).toBe(1);
    expect(C.coverScale({}, BOX)).toBe(1);
  });
});

describe('centred', () => {
  it('starts in the middle, just covering', () => {
    expect(C.centred(WIDE, BOX)).toEqual({ zoom: 1, x: -150, y: 0 });
    expect(C.centred(TALL, BOX)).toEqual({ zoom: 1, x: 0, y: -125 });
  });
  it('a photo the box shape has nowhere to go', () => {
    expect(C.centred({ w: 400, h: 500 }, BOX)).toEqual({ zoom: 1, x: 0, y: 0 });
  });
});

describe('clamp', () => {
  it('never lets an edge into the box', () => {
    expect(C.clamp({ zoom: 1, x: 50, y: 20 }, WIDE, BOX)).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(C.clamp({ zoom: 1, x: -999, y: -5 }, WIDE, BOX)).toEqual({ zoom: 1, x: -300, y: 0 });
  });
  it('keeps the zoom between 1 and 3', () => {
    expect(C.clamp({ zoom: 0.2, x: 0, y: 0 }, WIDE, BOX).zoom).toBe(1);
    expect(C.clamp({ zoom: 9, x: 0, y: 0 }, WIDE, BOX).zoom).toBe(3);
    expect(C.clamp({ zoom: NaN, x: 0, y: 0 }, WIDE, BOX).zoom).toBe(1);
  });
  it('treats a missing place as the top left', () => {
    expect(C.clamp({ zoom: 2 }, WIDE, BOX)).toEqual({ zoom: 2, x: 0, y: 0 });
  });
  it('zoomed in, there is more room to move', () => {
    expect(C.clamp({ zoom: 2, x: -999, y: -999 }, WIDE, BOX)).toEqual({ zoom: 2, x: -800, y: -250 });
  });
});

describe('moveBy', () => {
  it('moves by the drag, within the edges', () => {
    const v = C.centred(WIDE, BOX);
    expect(C.moveBy(v, 40, 10, WIDE, BOX)).toEqual({ zoom: 1, x: -110, y: 0 });
    expect(C.moveBy(v, 500, 0, WIDE, BOX).x).toBe(0);
    expect(C.moveBy(v, -500, 0, WIDE, BOX).x).toBe(-300);
  });
  it('a drag of nothing changes nothing', () => {
    const v = C.centred(TALL, BOX);
    expect(C.moveBy(v, 0, 0, TALL, BOX)).toEqual(v);
  });
});

describe('zoomAt', () => {
  it('keeps the point under the fingers where it is', () => {
    const v = { zoom: 1, x: -150, y: 0 };
    const z = C.zoomAt(v, 2, 100, 125, WIDE, BOX);
    // The photo's point under (100, 125) was (500, 250); at twice the size it still is.
    expect(z.zoom).toBe(2);
    expect((100 - z.x) / (0.5 * 2)).toBeCloseTo(500);
    expect((125 - z.y) / (0.5 * 2)).toBeCloseTo(250);
  });
  it('stops at 3 and at 1', () => {
    const v = C.centred(WIDE, BOX);
    expect(C.zoomAt(v, 10, 100, 125, WIDE, BOX).zoom).toBe(3);
    expect(C.zoomAt({ zoom: 2, x: -400, y: -100 }, 0, 0, 0, WIDE, BOX)).toEqual({ zoom: 1, x: -200, y: 0 });
  });
  it('zooming out at a corner stays covering', () => {
    const z = C.zoomAt({ zoom: 3, x: -1000, y: -500 }, 1, 200, 250, WIDE, BOX);
    expect(z.x).toBeLessThanOrEqual(0);
    expect(z.x).toBeGreaterThanOrEqual(-300);
    expect(z.y).toBe(0);
  });
});

describe('sourceRect', () => {
  it('is the part of the photo the box shows', () => {
    expect(C.sourceRect(C.centred(WIDE, BOX), WIDE, BOX)).toEqual({ sx: 300, sy: 0, sw: 400, sh: 500 });
    expect(C.sourceRect({ zoom: 2, x: 0, y: 0 }, WIDE, BOX)).toEqual({ sx: 0, sy: 0, sw: 200, sh: 250 });
  });
  it('a view out of bounds is pulled back first', () => {
    expect(C.sourceRect({ zoom: 1, x: 99, y: 99 }, TALL, BOX)).toEqual({ sx: 0, sy: 0, sw: 400, sh: 500 });
  });
  it('is always the box shape', () => {
    const r = C.sourceRect({ zoom: 1.7, x: -33, y: -12 }, TALL, BOX);
    expect(r.sw / r.sh).toBeCloseTo(C.RATIO);
  });
});

describe('outSize', () => {
  it('is 720 by 900 for a big photo', () => {
    expect(C.outSize({ sw: 1600, sh: 2000 })).toEqual({ w: 720, h: 900 });
  });
  it('is never blown up past the part shown', () => {
    expect(C.outSize({ sw: 400, sh: 500 })).toEqual({ w: 400, h: 500 });
    expect(C.outSize({ sw: 0.4, sh: 0.5 })).toEqual({ w: 1, h: 1 });
  });
  it('is 1 by 1 with nothing to show', () => {
    expect(C.outSize({ sw: 0, sh: 500 })).toEqual({ w: 1, h: 1 });
    expect(C.outSize({})).toEqual({ w: 1, h: 1 });
  });
});
