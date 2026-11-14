// components/cut-out.js: the sums behind a sticker's Cut out shape.
import { describe, it, expect } from 'vitest';
import { SIDE, WHITE, INK, EDGES, toInput, minMax, resizeBilinear, threshold, largestPiece, fillHoles, edt, grow, shrink, boxBlur, bbox, clearEnough, cutOut, paint } from '../../../components/cut-out.js';

// A grid drawn as text: '#' is 1, '.' is 0; and back again.
const grid = (...rows) => ({ w: rows[0].length, h: rows.length, bin: Uint8Array.from(rows.join(''), (c) => (c === '#' ? 1 : 0)) });
const draw = (bin, w) => Array.from({ length: bin.length / w }, (_, y) => Array.from(bin.slice(y * w, y * w + w), (b) => (b ? '#' : '.')).join(''));
const near = (list, want) => { expect(list.length).toBe(want.length); want.forEach((v, i) => expect(list[i]).toBeCloseTo(v, 5)); };
// The slow, sure way: each spot's squared distance to the nearest 1.
function slowEdt(bin, w, h) {
  return Array.from(bin, (_, i) => {
    let best = Infinity;
    bin.forEach((b, j) => { if (b) best = Math.min(best, (i % w - (j % w)) ** 2 + (Math.floor(i / w) - Math.floor(j / w)) ** 2); });
    return best;
  });
}
// A grid with a scattering of 1s that's the same every run.
function scatter(w, h, seed) {
  let a = seed;
  return Uint8Array.from({ length: w * h }, () => { a = (a * 1103515245 + 12345) % 2147483648; return a % 100 < 9 ? 1 : 0; });
}
// The model's answer: 1 where inside(x, y) says so, else a low 0.05.
const answer = (inside) => Float32Array.from({ length: SIDE * SIDE }, (_, i) => (inside(i % SIDE, Math.floor(i / SIDE)) ? 1 : 0.05));

describe('the numbers it works to', () => {
  it('looks at 320 by 320, with a 3.5% white border and an outline 60% of that', () => {
    expect(SIDE).toBe(320);
    expect(WHITE).toBe(0.035);
    expect(INK).toBe(0.6);
    expect(EDGES).toEqual({ white: [255, 255, 255], outline: [49, 61, 69] });
  });
});

describe('toInput', () => {
  it('puts the reds, then the greens, then the blues, scaled by the brightest, less the average, over the spread', () => {
    const out = toInput(Uint8ClampedArray.of(255, 0, 0, 255, 0, 128, 255, 0), 2);
    expect(out).toBeInstanceOf(Float32Array);
    near(out, [(1 - 0.485) / 0.229, (0 - 0.485) / 0.229, (0 - 0.456) / 0.224, (128 / 255 - 0.456) / 0.224, (0 - 0.406) / 0.225, (1 - 0.406) / 0.225]);
  });
  it('scales by the brightest colour, not the see-through', () => {
    const out = toInput(Uint8ClampedArray.of(100, 50, 25, 255), 1);
    near(out, [(1 - 0.485) / 0.229, (0.5 - 0.456) / 0.224, (0.25 - 0.406) / 0.225]);
  });
  it('copes with a black photo', () => {
    near(toInput(new Uint8ClampedArray(8), 2), [-0.485 / 0.229, -0.485 / 0.229, -0.456 / 0.224, -0.456 / 0.224, -0.406 / 0.225, -0.406 / 0.225]);
  });
  it('reads only the n spots it was told, and none at all for 0', () => {
    near(toInput(Uint8ClampedArray.of(51, 51, 51, 255, 255, 255, 255, 255), 1), [(1 - 0.485) / 0.229, (1 - 0.456) / 0.224, (1 - 0.406) / 0.225]);
    expect(toInput(new Uint8ClampedArray(0), 0)).toHaveLength(0);
  });
});

describe('minMax', () => {
  it('stretches the values to run from 0 to 1', () => {
    near(minMax(Float32Array.of(2, 4, 3)), [0, 1, 0.5]);
    near(minMax(Float32Array.of(-1, 1, 0)), [0, 1, 0.5]);
  });
  it('gives 0 everywhere when they are all the same', () => {
    near(minMax(Float32Array.of(5, 5, 5)), [0, 0, 0]);
    near(minMax(Float32Array.of(7)), [0]);
  });
  it('keeps the kind of list, and copes with an empty one', () => {
    expect(minMax(Float32Array.of(1, 2))).toBeInstanceOf(Float32Array);
    expect(minMax(new Float32Array(0))).toHaveLength(0);
  });
});

describe('resizeBilinear', () => {
  it('leaves a same-size picture as it is', () => {
    near(resizeBilinear(Float32Array.of(1, 2, 3, 4, 5, 6), 3, 2, 3, 2), [1, 2, 3, 4, 5, 6]);
  });
  it('blends between the nearest spots when it grows, across and down', () => {
    near(resizeBilinear(Float32Array.of(0, 8), 2, 1, 4, 1), [0, 2, 6, 8]);
    near(resizeBilinear(Float32Array.of(0, 8), 1, 2, 1, 4), [0, 2, 6, 8]);
    near(resizeBilinear(Float32Array.of(0, 10, 20, 30), 2, 2, 3, 3), [0, 5, 10, 10, 15, 20, 20, 25, 30]);
  });
  it('blends the middle pairs when it shrinks', () => {
    near(resizeBilinear(Float32Array.of(0, 4, 8, 12), 4, 1, 2, 1), [2, 10]);
    near(resizeBilinear(Float32Array.of(0, 4, 8, 12), 1, 4, 1, 2), [2, 10]);
  });
  it('spreads one spot everywhere', () => {
    near(resizeBilinear(Float32Array.of(7), 1, 1, 3, 2), [7, 7, 7, 7, 7, 7]);
  });
});

describe('threshold', () => {
  it('gives 1 from a half up, 0 below', () => {
    const out = threshold(Float32Array.of(0.49, 0.5, 0.51, 1, 0));
    expect(out).toBeInstanceOf(Uint8Array);
    expect([...out]).toEqual([0, 1, 1, 1, 0]);
  });
  it('takes another line', () => {
    expect([...threshold(Float32Array.of(0.79, 0.8, 0.9), 0.8)]).toEqual([0, 1, 1]);
  });
  it('copes with an empty list', () => {
    expect(threshold(new Float32Array(0))).toHaveLength(0);
  });
});

describe('largestPiece', () => {
  it('keeps the biggest piece, and says how big it is and how much there was', () => {
    const { w, h, bin } = grid('##..#', '#...#', '....#', '....#');
    const r = largestPiece(bin, w, h);
    expect(draw(r.mask, w)).toEqual(['....#', '....#', '....#', '....#']);
    expect(r.area).toBe(4);
    expect(r.total).toBe(7);
  });
  it('joins spots touching at a corner, either way', () => {
    const down = grid('#..', '.#.', '..#');
    expect(largestPiece(down.bin, 3, 3).area).toBe(3);
    const up = grid('..#', '.#.', '#..');
    expect(largestPiece(up.bin, 3, 3).area).toBe(3);
  });
  it('doesn\'t join one row\'s end to the next row\'s start', () => {
    const { bin } = grid('..#', '#..');
    const r = largestPiece(bin, 3, 2);
    expect(r).toMatchObject({ area: 1, total: 2 });
    expect(draw(r.mask, 3)).toEqual(['..#', '...']);
    const back = grid('#..', '..#', '#..');
    expect(largestPiece(back.bin, 3, 3).area).toBe(1);
  });
  it('keeps the first of two the same size', () => {
    const { bin } = grid('##.##');
    expect(draw(largestPiece(bin, 5, 1).mask, 5)).toEqual(['##...']);
  });
  it('finds every spot of a piece that winds about', () => {
    const { w, h, bin } = grid('#####', '....#', '###.#', '#...#', '#####');
    expect(largestPiece(bin, w, h)).toMatchObject({ area: 17, total: 17 });
  });
  it('gives nothing for nothing', () => {
    const r = largestPiece(new Uint8Array(6), 3, 2);
    expect(r).toMatchObject({ area: 0, total: 0 });
    expect([...r.mask]).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe('fillHoles', () => {
  it('fills a hole', () => {
    const { w, h, bin } = grid('.....', '.###.', '.#.#.', '.###.', '.....');
    expect(draw(fillHoles(bin, w, h), w)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
  });
  it('leaves a gap open to the edge, on any side', () => {
    const top = grid('#.#', '#.#', '###');
    expect(draw(fillHoles(top.bin, 3, 3), 3)).toEqual(['#.#', '#.#', '###']);
    const bottom = grid('###', '#.#', '#.#');
    expect(draw(fillHoles(bottom.bin, 3, 3), 3)).toEqual(['###', '#.#', '#.#']);
    const left = grid('####', '...#', '####');
    expect(draw(fillHoles(left.bin, 4, 3), 4)).toEqual(['####', '...#', '####']);
    const right = grid('####', '#...', '####');
    expect(draw(fillHoles(right.bin, 4, 3), 4)).toEqual(['####', '#...', '####']);
  });
  it('reaches in along a winding gap', () => {
    const { w, h, bin } = grid('######', '#....#', '#.##.#', '#.#..#', '#.####', '#.....');
    expect(draw(fillHoles(bin, w, h), w)).toEqual(['######', '#....#', '#.##.#', '#.#..#', '#.####', '#.....']);
  });
  it('fills a hole that only meets the outside at a corner', () => {
    const { w, h, bin } = grid('.#...', '#.#..', '.#...');
    expect(draw(fillHoles(bin, w, h), w)).toEqual(['.#...', '###..', '.#...']);
  });
  it('fills a hole beside a gap open to the edge, and leaves the gap', () => {
    const { w, h, bin } = grid('#####', '#.#..', '#####');
    expect(draw(fillHoles(bin, w, h), w)).toEqual(['#####', '###..', '#####']);
  });
  it('leaves a picture with no holes, and an empty one, as they are', () => {
    expect(draw(fillHoles(new Uint8Array(4), 2, 2), 2)).toEqual(['..', '..']);
    expect(draw(fillHoles(new Uint8Array(4).fill(1), 2, 2), 2)).toEqual(['##', '##']);
  });
});

describe('edt', () => {
  it('gives each spot its distance to the nearest 1, squared', () => {
    const { w, h, bin } = grid('.....', '..#..', '.....');
    expect([...edt(bin, w, h)]).toEqual([5, 2, 1, 2, 5, 4, 1, 0, 1, 4, 5, 2, 1, 2, 5]);
  });
  it('is exact, on wide and tall pictures', () => {
    [[23, 17, 1], [9, 31, 2], [40, 3, 3], [1, 12, 4], [12, 1, 5]].forEach(([w, h, seed]) => {
      const bin = scatter(w, h, seed);
      if (!bin.some(Boolean)) bin[Math.floor(bin.length / 2)] = 1;
      expect([...edt(bin, w, h)]).toEqual(slowEdt(bin, w, h));
    });
  });
  it('picks the nearer of two', () => {
    const { w, h, bin } = grid('#......#');
    expect([...edt(bin, w, h)]).toEqual([0, 1, 4, 9, 9, 4, 1, 0]);
  });
  it('is 0 everywhere when it\'s all 1s, and very far when there are none', () => {
    expect([...edt(new Uint8Array(6).fill(1), 3, 2)]).toEqual([0, 0, 0, 0, 0, 0]);
    edt(new Uint8Array(6), 3, 2).forEach((d) => expect(d).toBeGreaterThan(1e19));
  });
});

describe('grow and shrink', () => {
  const dot = grid('.....', '.....', '..#..', '.....', '.....');
  it('grows round', () => {
    expect(draw(grow(dot.bin, 5, 5, 1), 5)).toEqual(['.....', '..#..', '.###.', '..#..', '.....']);
    expect(draw(grow(dot.bin, 5, 5, 1.5), 5)).toEqual(['.....', '.###.', '.###.', '.###.', '.....']);
    expect(draw(grow(dot.bin, 5, 5, 2), 5)).toEqual(['..#..', '.###.', '#####', '.###.', '..#..']);
  });
  it('grows by nothing for 0, and from nothing to nothing', () => {
    expect(draw(grow(dot.bin, 5, 5, 0), 5)).toEqual(draw(dot.bin, 5));
    expect([...grow(new Uint8Array(4), 2, 2, 3)]).toEqual([0, 0, 0, 0]);
  });
  it('shrinks', () => {
    const { w, h, bin } = grid('.......', '.#####.', '.#####.', '.#####.', '.#####.', '.#####.', '.......');
    expect(draw(shrink(bin, w, h, 1), w)).toEqual(['.......', '.......', '..###..', '..###..', '..###..', '.......', '.......']);
    expect(draw(shrink(bin, w, h, 2), w)).toEqual(['.......', '.......', '.......', '...#...', '.......', '.......', '.......']);
  });
  it('doesn\'t shrink from the picture\'s own edges', () => {
    expect([...shrink(new Uint8Array(4).fill(1), 2, 2, 5)]).toEqual([1, 1, 1, 1]);
  });
});

describe('boxBlur', () => {
  it('averages the square round each spot', () => {
    near(boxBlur(Float32Array.of(0, 0, 3, 0, 0), 5, 1, 1), [0, 1, 1, 1, 0]);
    near(boxBlur(Float32Array.of(0, 0, 9, 0, 0, 0, 0, 0, 0), 3, 3, 1), [0, 1.5, 2.25, 0, 1, 1.5, 0, 0, 0]);
  });
  it('averages only as far as the picture goes', () => {
    near(boxBlur(Float32Array.of(3, 0, 0), 3, 1, 1), [1.5, 1, 0]);
    near(boxBlur(Float32Array.of(0, 0, 3), 3, 1, 1), [0, 1, 1.5]);
    near(boxBlur(Float32Array.of(3, 0, 0), 1, 3, 1), [1.5, 1, 0]);
  });
  it('blurs down as well as across', () => {
    near(boxBlur(Float32Array.of(0, 0, 0, 0, 9, 0, 0, 0, 0), 3, 3, 1), [2.25, 1.5, 2.25, 1.5, 1, 1.5, 2.25, 1.5, 2.25]);
  });
  it('leaves it as it is for 0', () => {
    near(boxBlur(Float32Array.of(1, 2, 3, 4), 2, 2, 0), [1, 2, 3, 4]);
  });
});

describe('bbox', () => {
  it('gives the box round the 1s', () => {
    const { w, h, bin } = grid('......', '..#...', '....#.', '...#..');
    expect(bbox(bin, w, h)).toEqual({ x: 2, y: 1, w: 3, h: 3 });
  });
  it('fits the corners', () => {
    const a = grid('#..', '...');
    expect(bbox(a.bin, 3, 2)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
    const b = grid('...', '..#');
    expect(bbox(b.bin, 3, 2)).toEqual({ x: 2, y: 1, w: 1, h: 1 });
    expect(bbox(new Uint8Array(6).fill(1), 3, 2)).toEqual({ x: 0, y: 0, w: 3, h: 2 });
  });
  it('is null when there are none', () => {
    expect(bbox(new Uint8Array(6), 3, 2)).toBeNull();
  });
});

describe('clearEnough', () => {
  it('wants between 3% and 92% of the photo', () => {
    expect(clearEnough(3, 3, 100)).toBe(true);
    expect(clearEnough(2, 2, 100)).toBe(false);
    expect(clearEnough(92, 92, 100)).toBe(true);
    expect(clearEnough(93, 93, 100)).toBe(false);
  });
  it('wants 60% of it in one piece', () => {
    expect(clearEnough(30, 50, 100)).toBe(true);
    expect(clearEnough(29, 50, 100)).toBe(false);
  });
  it('says no to nothing', () => {
    expect(clearEnough(0, 0, 100)).toBe(false);
  });
});

describe('cutOut', () => {
  it('cuts a square subject out with room for its border', () => {
    const cut = cutOut(answer((x, y) => x >= 80 && x < 240 && y >= 80 && y < 240), 320, 320);
    // A 160 wide subject: a border of 3.5% of 160 + 2 borders, 6.02, with a spot to spare.
    expect(cut).toMatchObject({ x: 72, y: 72, w: 176, h: 176 });
    expect(cut.white).toBeCloseTo((0.035 * 160) / 0.93, 6);
    expect(cut.ink).toBeCloseTo((0.6 * 0.035 * 160) / 0.93, 6);
    const at = (x, y) => y * cut.w + x;
    expect(cut.subject[at(88, 88)]).toBe(1);
    expect(cut.subject[at(7, 88)]).toBe(0);
    expect(cut.subject[at(8, 88)]).toBe(1);
    expect(cut.dist[at(88, 88)]).toBe(0);
    expect(cut.dist[at(0, 88)]).toBe(8);
    expect(cut.dist[at(4, 88)]).toBe(4);
    expect(cut.dist[at(175, 88)]).toBe(8);
    expect(cut.dist[at(88, 175)]).toBe(8);
    expect(cut.subject).toHaveLength(176 * 176);
    expect(cut.dist).toHaveLength(176 * 176);
  });
  it('rounds the subject\'s sharp corners off', () => {
    const cut = cutOut(answer((x, y) => x >= 80 && x < 240 && y >= 80 && y < 240), 320, 320);
    expect(cut.dist[8 * cut.w + 8]).toBeCloseTo(Math.SQRT2, 5); // the subject's very corner, just outside the cut
    expect(cut.subject[8 * cut.w + 8]).toBe(1); // still the subject: the border colours it
    expect(cut.dist[9 * cut.w + 9]).toBe(0);
  });
  it('closes a narrow notch, and leaves a wide one', () => {
    const notched = (from, to) => (x, y) => x >= 80 && x < 240 && y >= 80 && y < 240 && !(x >= from && x < to && y < 120);
    const narrow = cutOut(answer(notched(158, 162)), 320, 320);
    expect(narrow.dist[28 * narrow.w + 88]).toBe(0); // inside the cut now
    expect(narrow.subject[28 * narrow.w + 88]).toBe(0); // filled with the border's colour
    const wide = cutOut(answer(notched(150, 170)), 320, 320);
    expect(wide.dist[28 * wide.w + 88]).toBe(10);
  });
  it('smooths a thin spike away', () => {
    const spiked = (x, y) => (x >= 80 && x < 240 && y >= 80 && y < 240) || (x >= 159 && x < 162 && y >= 40 && y < 80);
    expect(cutOut(answer(spiked), 320, 320).y).toBe(68); // not 32: only a bump is left where it was
  });
  it('works on the photo\'s own size, not the model\'s', () => {
    const cut = cutOut(answer((x, y) => x >= 80 && x < 240 && y >= 80 && y < 240), 640, 160);
    expect(cut.x + cut.w / 2).toBeCloseTo(320, 0);
    expect(cut.y + cut.h / 2).toBeCloseTo(80, 0);
    expect(cut.white).toBeCloseTo((0.035 * 320) / 0.93, 6);
  });
  it('runs the border on past the photo\'s edge', () => {
    const cut = cutOut(answer((x, y) => y >= 160), 320, 320);
    expect(cut.white).toBeCloseTo((0.035 * 320) / 0.93, 6);
    expect(cut).toMatchObject({ x: -14, y: 146, w: 348, h: 188 });
    const last = cut.w * (cut.h - 1) + 174; // below the photo
    expect(cut.subject[last]).toBe(0);
    expect(cut.dist[last]).toBe(14);
  });
  it('fills a hole in the subject', () => {
    const ring = (x, y) => x >= 80 && x < 240 && y >= 80 && y < 240 && !(x >= 150 && x < 170 && y >= 150 && y < 170);
    const cut = cutOut(answer(ring), 320, 320);
    expect(cut.subject[(160 - 72) * cut.w + (160 - 72)]).toBe(1);
  });
  it('keeps only the biggest piece', () => {
    const two = (x, y) => (x >= 20 && x < 180 && y >= 20 && y < 180) || (x >= 260 && x < 300 && y >= 260 && y < 300);
    const cut = cutOut(answer(two), 320, 320);
    expect(cut.x + cut.w).toBeLessThan(260);
    expect(cut.y + cut.h).toBeLessThan(260);
  });
  it('finds nothing clear in a flat photo, or one that\'s all subject', () => {
    expect(cutOut(new Float32Array(SIDE * SIDE).fill(0.3), 320, 320)).toBeNull();
    expect(cutOut(answer((x, y) => x > 4 || y > 4), 320, 320)).toBeNull();
    expect(cutOut(answer((x, y) => x < 10 && y < 10), 320, 320)).toBeNull();
  });
  it('finds nothing clear when no one piece stands out', () => {
    const two = (x, y) => (x >= 20 && x < 120 && y >= 20 && y < 120) || (x >= 200 && x < 300 && y >= 200 && y < 300);
    expect(cutOut(answer(two), 320, 320)).toBeNull();
  });
  it('finds nothing when the smoothing leaves nothing (only thin lines)', () => {
    const comb = (x, y) => x === 0 || y % 20 === 0;
    expect(cutOut(answer(comb), 320, 320)).toBeNull();
  });
});

describe('paint', () => {
  const cut = { x: -1, y: 0, w: 3, h: 1, subject: Uint8Array.of(0, 1, 0), dist: Float32Array.of(1, 0, 3), white: 1, ink: 0.6 };
  const photo = Uint8ClampedArray.of(10, 20, 30, 255, 40, 50, 60, 255);
  it('paints the subject from the photo and the rest white, with the border smooth at its edge', () => {
    const { colour, shape } = paint(photo, 2, cut, 'white');
    expect([...colour]).toEqual([255, 255, 255, 255, 10, 20, 30, 255, 255, 255, 255, 255]);
    expect([...shape]).toEqual([0, 0, 0, 128, 0, 0, 0, 255, 0, 0, 0, 0]);
  });
  it('paints the outline in ink, thinner', () => {
    const { colour, shape } = paint(photo, 2, cut, 'outline');
    expect([...colour]).toEqual([49, 61, 69, 255, 10, 20, 30, 255, 49, 61, 69, 255]);
    expect([...shape]).toEqual([0, 0, 0, 26, 0, 0, 0, 255, 0, 0, 0, 0]);
  });
  it('finds each spot on the photo by its row too', () => {
    const tall = { x: 1, y: 1, w: 1, h: 2, subject: Uint8Array.of(1, 1), dist: Float32Array.of(0, 0), white: 1, ink: 0.6 };
    const pic = Uint8ClampedArray.from({ length: 2 * 3 * 4 }, (_, i) => i);
    const { colour } = paint(pic, 2, tall, 'white');
    expect([...colour]).toEqual([12, 13, 14, 255, 20, 21, 22, 255]);
  });
  it('paints nothing for a cut of no size', () => {
    const none = paint(photo, 2, { ...cut, w: 0, h: 0, subject: new Uint8Array(0), dist: new Float32Array(0) }, 'white');
    expect(none.colour).toHaveLength(0);
    expect(none.shape).toHaveLength(0);
  });
});
