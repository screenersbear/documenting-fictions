// ref/data/templates.js: page layouts (authored in inches, stored as fractions of
// the page), guide grids, board covers, layout styles and pouring images into pages.
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  SHAPES, TEMPLATES, GUIDE_MIN, GUIDE_MAX, guideTemplateId, templateFor, defaultTemplate,
  coverTemplateId, makeCover, STYLES, styleFor, styleTemplate, paginate,
} from '../../../ref/data/templates.js';

const LP = 'letter-portrait', WIDE = 'wide-16x9';
const SIZE = { [LP]: [8.5, 11], [WIDE]: [13.333, 7.5] };

// A rect back in inches, so expectations read like the authored layout.
const inches = (shape, r) => { const [W, H] = SIZE[shape]; return [r.x * W, r.y * H, r.w * W, r.h * H]; };
const expectRect = (shape, r, want) => {
  const got = inches(shape, r);
  want.forEach((v, i) => expect(got[i]).toBeCloseTo(v, 4));
};
const expectSlots = (shape, id, want) => {
  const t = templateFor(shape, id);
  expect(t.slots).toHaveLength(want.length);
  want.forEach((w, i) => expectRect(shape, t.slots[i], w));
};
const overlaps = (a, b) => a.x < b.x + b.w - 1e-9 && b.x < a.x + a.w - 1e-9 && a.y < b.y + b.h - 1e-9 && b.y < a.y + a.h - 1e-9;
const ids = (shape) => TEMPLATES[shape].map((t) => t.id);
const guideIds = (p) => Array.from({ length: 9 }, (_, i) => [`g-${p}-${i + 4}-head`, `g-${p}-${i + 4}`]).flat();

afterEach(() => vi.useRealTimers());

describe('SHAPES', () => {
  it('lists the two page shapes in inches with labels', () => {
    expect(SHAPES).toEqual({
      'letter-portrait': { W: 8.5, H: 11, label: 'Letter portrait (8.5 × 11)' },
      'wide-16x9': { W: 13.333, H: 7.5, label: '16:9 landscape' },
    });
  });
  it('has a template list for every shape and nothing else', () => {
    expect(Object.keys(TEMPLATES).sort()).toEqual(Object.keys(SHAPES).sort());
  });
  it('makes the wide shape about 16:9', () => {
    expect(SHAPES[WIDE].W / SHAPES[WIDE].H).toBeCloseTo(16 / 9, 3);
  });
});

describe('TEMPLATES', () => {
  it('lists the letter layouts, then the guides, in order', () => {
    expect(ids(LP)).toEqual([
      'lp-bleed', 'lp-single', 'lp-two-stack', 'lp-two-side', 'lp-three-top', 'lp-three-left',
      'lp-grid-4', 'lp-five', 'lp-grid-6', 'lp-grid-9', 'lp-cover', 'lp-text', ...guideIds('lp'),
    ]);
  });
  it('lists the wide layouts, then the guides, in order', () => {
    expect(ids(WIDE)).toEqual([
      'w-bleed', 'w-cover', 'w-single-text', 'w-two', 'w-three', 'w-three-left',
      'w-grid-4', 'w-four-across', 'w-grid-6', 'w-grid-8', 'w-grid-10', ...guideIds('w'),
    ]);
  });
  it('gives every template a name and a unique id', () => {
    for (const shape of [LP, WIDE]) {
      expect(new Set(ids(shape)).size).toBe(TEMPLATES[shape].length);
      for (const t of TEMPLATES[shape]) expect(typeof t.name === 'string' && t.name.length > 0).toBe(true);
    }
  });
  it('keeps every slot and text box on the page, with a real size', () => {
    for (const shape of [LP, WIDE]) for (const t of TEMPLATES[shape]) for (const r of [...t.slots, t.text]) {
      expect(r.w).toBeGreaterThan(0);
      expect(r.h).toBeGreaterThan(0);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1 + 1e-9);
      expect(r.y + r.h).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
  it('never lets two slots overlap', () => {
    for (const shape of [LP, WIDE]) for (const t of TEMPLATES[shape]) {
      for (let i = 0; i < t.slots.length; i++) for (let j = i + 1; j < t.slots.length; j++) {
        expect(overlaps(t.slots[i], t.slots[j]), `${t.id} slots ${i} and ${j}`).toBe(false);
      }
    }
  });
  it('keeps text off the pictures unless it is meant to sit on top', () => {
    for (const shape of [LP, WIDE]) for (const t of TEMPLATES[shape]) {
      if (t.text.overlay) continue;
      for (const s of t.slots) expect(overlaps(s, t.text), t.id).toBe(false);
    }
  });
  it('marks only covers as covers and only guides as guides', () => {
    for (const shape of [LP, WIDE]) {
      expect(TEMPLATES[shape].filter((t) => t.cover).map((t) => t.id)).toEqual([coverTemplateId(shape)]);
      expect(TEMPLATES[shape].filter((t) => t.guide).map((t) => t.id)).toEqual(guideIds(shape === LP ? 'lp' : 'w'));
    }
  });
});

describe('letter layouts, in inches', () => {
  it('full bleed fills the page with a small overlaid caption', () => {
    const t = templateFor(LP, 'lp-bleed');
    expectSlots(LP, 'lp-bleed', [[0, 0, 8.5, 11]]);
    expectRect(LP, t.text, [0.5, 9.9, 4.2, 0.6]);
    expect(t.text.overlay).toBe(true);
  });
  it('framed single sits in the margins above the text strip', () => {
    const t = templateFor(LP, 'lp-single');
    expectSlots(LP, 'lp-single', [[0.5, 0.5, 7.5, 8.8]]);
    expectRect(LP, t.text, [0.5, 9.45, 7.5, 1.05]);
    expect(t.text.overlay).toBeUndefined();
  });
  it('two stacked and two side by side split the area with a gutter', () => {
    expectSlots(LP, 'lp-two-stack', [[0.5, 0.5, 7.5, 4.31], [0.5, 4.99, 7.5, 4.31]]);
    expectSlots(LP, 'lp-two-side', [[0.5, 0.5, 3.66, 8.8], [4.34, 0.5, 3.66, 8.8]]);
  });
  it('three with one on top gives the top 62%', () => {
    expectSlots(LP, 'lp-three-top', [[0.5, 0.5, 7.5, 5.3444], [0.5, 6.0244, 3.66, 3.2756], [4.34, 6.0244, 3.66, 3.2756]]);
  });
  it('three with a tall left gives the left 60%', () => {
    expectSlots(LP, 'lp-three-left', [[0.5, 0.5, 4.392, 8.8], [5.072, 0.5, 2.928, 4.31], [5.072, 4.99, 2.928, 4.31]]);
  });
  it('grids fill row by row', () => {
    expectSlots(LP, 'lp-grid-4', [[0.5, 0.5, 3.66, 4.31], [4.34, 0.5, 3.66, 4.31], [0.5, 4.99, 3.66, 4.31], [4.34, 4.99, 3.66, 4.31]]);
    const h6 = 8.44 / 3;
    expectSlots(LP, 'lp-grid-6', [
      [0.5, 0.5, 3.66, h6], [4.34, 0.5, 3.66, h6],
      [0.5, 0.68 + h6, 3.66, h6], [4.34, 0.68 + h6, 3.66, h6],
      [0.5, 0.86 + 2 * h6, 3.66, h6], [4.34, 0.86 + 2 * h6, 3.66, h6],
    ]);
    expectSlots(LP, 'lp-grid-9', [0, 1, 2].flatMap((r) => [0.5, 3.06, 5.62].map((x) => [x, 0.5 + r * (h6 + 0.18), 2.38, h6])));
  });
  it('five puts four small ones under the big one', () => {
    expectSlots(LP, 'lp-five', [[0.5, 0.5, 7.5, 5.3444], ...[0.5, 2.42, 4.34, 6.26].map((x) => [x, 6.0244, 1.74, 3.2756])]);
  });
  it('the cover has one big picture and a tall title box', () => {
    const t = templateFor(LP, 'lp-cover');
    expectSlots(LP, 'lp-cover', [[0.5, 0.5, 7.5, 7.4]]);
    expectRect(LP, t.text, [0.5, 8.3, 7.5, 2.2]);
    expect(t.cover).toBe(true);
  });
  it('long text has a bigger text size', () => {
    const t = templateFor(LP, 'lp-text');
    expectSlots(LP, 'lp-text', [[0.5, 0.5, 7.5, 5.6]]);
    expectRect(LP, t.text, [0.5, 6.45, 7.5, 4.05]);
    expect(t.text.size).toBe(1.15);
  });
});

describe('wide layouts, in inches', () => {
  it('full bleed and the cover', () => {
    const bleed = templateFor(WIDE, 'w-bleed'), cover = templateFor(WIDE, 'w-cover');
    expectSlots(WIDE, 'w-bleed', [[0, 0, 13.333, 7.5]]);
    expectRect(WIDE, bleed.text, [0.45, 6.55, 5.5, 0.5]);
    expect(bleed.text.overlay).toBe(true);
    expectSlots(WIDE, 'w-cover', [[0, 0, 7.9, 7.5]]);
    expectRect(WIDE, cover.text, [8.5, 2.35, 4.383, 4.7]);
    expect(cover.cover).toBe(true);
  });
  it('single with text beside', () => {
    const t = templateFor(WIDE, 'w-single-text');
    expectSlots(WIDE, 'w-single-text', [[0.45, 0.45, 8.9, 6.6]]);
    expectRect(WIDE, t.text, [9.7, 0.45, 3.183, 6.6]);
  });
  it('rows across the page, over the text strip', () => {
    expectRect(WIDE, templateFor(WIDE, 'w-two').text, [0.45, 6.25, 12.433, 0.8]);
    expectSlots(WIDE, 'w-two', [[0.45, 0.45, 6.1265, 5.68], [6.7565, 0.45, 6.1265, 5.68]]);
    const w3 = 12.073 / 3;
    expectSlots(WIDE, 'w-three', [0, 1, 2].map((c) => [0.45 + c * (w3 + 0.18), 0.45, w3, 5.68]));
    expectSlots(WIDE, 'w-four-across', [0.45, 3.60325, 6.7565, 9.90975].map((x) => [x, 0.45, 2.97325, 5.68]));
  });
  it('three with one dominant on the left (62%)', () => {
    expectSlots(WIDE, 'w-three-left', [[0.45, 0.45, 7.59686, 5.68], [8.22686, 0.45, 4.65614, 2.75], [8.22686, 3.38, 4.65614, 2.75]]);
  });
  it('two-row grids', () => {
    expectSlots(WIDE, 'w-grid-4', [[0.45, 0.45, 6.1265, 2.75], [6.7565, 0.45, 6.1265, 2.75], [0.45, 3.38, 6.1265, 2.75], [6.7565, 3.38, 6.1265, 2.75]]);
    const w3 = 12.073 / 3;
    expectSlots(WIDE, 'w-grid-6', [0.45, 3.38].flatMap((y) => [0, 1, 2].map((c) => [0.45 + c * (w3 + 0.18), y, w3, 2.75])));
    expectSlots(WIDE, 'w-grid-8', [0.45, 3.38].flatMap((y) => [0.45, 3.60325, 6.7565, 9.90975].map((x) => [x, y, 2.97325, 2.75])));
    expectSlots(WIDE, 'w-grid-10', [0.45, 3.38].flatMap((y) => [0.45, 2.9726, 5.4952, 8.0178, 10.5404].map((x) => [x, y, 2.3426, 2.75])));
  });
});

describe('guides', () => {
  it('run from 4 to 12 photos', () => {
    expect(GUIDE_MIN).toBe(4);
    expect(GUIDE_MAX).toBe(12);
  });
  it('have one slot per photo and say so in the name', () => {
    for (const shape of [LP, WIDE]) for (let n = GUIDE_MIN; n <= GUIDE_MAX; n++) {
      const head = templateFor(shape, guideTemplateId(shape, n, true));
      const plain = templateFor(shape, guideTemplateId(shape, n, false));
      expect(head.slots).toHaveLength(n);
      expect(plain.slots).toHaveLength(n);
      expect(head.name).toBe(`Guide, ${n} with heading`);
      expect(plain.name).toBe(`Guide, ${n}`);
      expect(head.guide).toBe(true);
      expect(plain.guide).toBe(true);
    }
  });
  it('pick the grid that keeps cells closest to a portrait photo', () => {
    const grid = (t) => `${new Set(t.slots.map((s) => s.x.toFixed(6))).size}x${new Set(t.slots.map((s) => s.y.toFixed(6))).size}`;
    const want = {
      [LP]: { 4: '2x2', 5: '3x2', 6: '3x2', 7: '3x3', 8: '3x3', 9: '3x3', 10: '5x2', 11: '4x3', 12: '4x3' },
      [WIDE]: { 4: '4x1', 5: '5x1', 6: '3x2', 7: '4x2', 8: '4x2', 9: '5x2', 10: '5x2', 11: '6x2', 12: '6x2' },
    };
    for (const shape of [LP, WIDE]) for (let n = GUIDE_MIN; n <= GUIDE_MAX; n++) for (const head of [true, false]) {
      expect(grid(templateFor(shape, guideTemplateId(shape, n, head))), `${shape} ${n} ${head}`).toBe(want[shape][n]);
    }
  });
  it('leave a heading strip on top of a section\'s first page', () => {
    const t = templateFor(LP, 'g-lp-4-head');
    expectRect(LP, t.text, [0.5, 0.5, 7.5, 0.75]);
    expect(t.text.overlay).toBeUndefined();
    expectSlots(LP, 'g-lp-4-head', [[0.5, 1.45, 3.66, 4.435], [4.34, 1.45, 3.66, 4.435], [0.5, 6.065, 3.66, 4.435], [4.34, 6.065, 3.66, 4.435]]);
  });
  it('use the whole page with a small overlaid caption otherwise', () => {
    const t = templateFor(LP, 'g-lp-4');
    expectRect(LP, t.text, [0.5, 10, 5, 0.5]);
    expect(t.text.overlay).toBe(true);
    expectSlots(LP, 'g-lp-4', [[0.5, 0.5, 3.66, 4.91], [4.34, 0.5, 3.66, 4.91], [0.5, 5.59, 3.66, 4.91], [4.34, 5.59, 3.66, 4.91]]);
  });
  it('use the wide margins on the wide shape', () => {
    const head = templateFor(WIDE, 'g-w-4-head'), plain = templateFor(WIDE, 'g-w-5');
    expectRect(WIDE, head.text, [0.45, 0.45, 12.433, 0.75]);
    expectSlots(WIDE, 'g-w-4-head', [0.45, 3.60325, 6.7565, 9.90975].map((x) => [x, 1.4, 2.97325, 5.65]));
    expectRect(WIDE, plain.text, [0.45, 6.55, 5, 0.5]);
    expectSlots(WIDE, 'g-w-5', [0.45, 2.9726, 5.4952, 8.0178, 10.5404].map((x) => [x, 0.45, 2.3426, 6.6]));
  });
  it('leave the last row short when the photos do not fill it', () => {
    const h = 9.64 / 3;
    expectSlots(LP, 'g-lp-7', [
      ...[0, 1].flatMap((r) => [0.5, 3.06, 5.62].map((x) => [x, 0.5 + r * (h + 0.18), 2.38, h])),
      [0.5, 0.5 + 2 * (h + 0.18), 2.38, h],
    ]);
  });
});

describe('guideTemplateId', () => {
  it('names a letter guide with a heading', () => {
    expect(guideTemplateId(LP, 4, true)).toBe('g-lp-4-head');
  });
  it('names a wide guide without a heading', () => {
    expect(guideTemplateId(WIDE, 12, false)).toBe('g-w-12');
  });
  it('treats any other shape as letter and any falsy head as none', () => {
    expect(guideTemplateId('poster', 7, 0)).toBe('g-lp-7');
    expect(guideTemplateId(undefined, 5, undefined)).toBe('g-lp-5');
  });
});

describe('templateFor', () => {
  it('finds a template by shape and id', () => {
    const t = templateFor(LP, 'lp-grid-4');
    expect(t.id).toBe('lp-grid-4');
    expect(t).toBe(TEMPLATES[LP].find((x) => x.id === 'lp-grid-4'));
  });
  it('finds guides too', () => {
    expect(templateFor(WIDE, 'g-w-9-head').slots).toHaveLength(9);
  });
  it('is null for an id from the other shape', () => {
    expect(templateFor(LP, 'w-two')).toBeNull();
  });
  it('is null for an unknown id or shape', () => {
    expect(templateFor(LP, 'nope')).toBeNull();
    expect(templateFor('poster', 'lp-grid-4')).toBeNull();
    expect(templateFor(undefined, undefined)).toBeNull();
  });
});

describe('defaultTemplate', () => {
  it('picks the first plain letter layout with room for the images', () => {
    const want = { 1: 'lp-single', 2: 'lp-two-stack', 3: 'lp-three-top', 4: 'lp-grid-4', 5: 'lp-five', 6: 'lp-grid-6', 7: 'lp-grid-9', 8: 'lp-grid-9', 9: 'lp-grid-9' };
    for (const [n, id] of Object.entries(want)) expect(defaultTemplate(LP, Number(n)).id, `n=${n}`).toBe(id);
  });
  it('picks the first plain wide layout with room for the images', () => {
    const want = { 1: 'w-single-text', 2: 'w-two', 3: 'w-three', 4: 'w-grid-4', 5: 'w-grid-6', 6: 'w-grid-6', 7: 'w-grid-8', 8: 'w-grid-8', 9: 'w-grid-10', 10: 'w-grid-10' };
    for (const [n, id] of Object.entries(want)) expect(defaultTemplate(WIDE, Number(n)).id, `n=${n}`).toBe(id);
  });
  it('treats zero or fewer images as one', () => {
    expect(defaultTemplate(LP, 0).id).toBe('lp-single');
    expect(defaultTemplate(WIDE, -3).id).toBe('w-single-text');
  });
  it('falls back to the plain layout with the most images when none is big enough', () => {
    expect(defaultTemplate(WIDE, 11).id).toBe('w-grid-10');
    expect(defaultTemplate(WIDE, 500).id).toBe('w-grid-10');
    expect(defaultTemplate(LP, 10).id).toBe('lp-grid-9');
    expect(defaultTemplate(LP, 500).id).toBe('lp-grid-9');
  });
  it('never picks a bleed, cover or guide page', () => {
    for (const shape of [LP, WIDE]) for (let n = -1; n <= 13; n++) {
      const t = defaultTemplate(shape, n);
      expect(t.guide || t.cover || t.id.endsWith('bleed')).toBeFalsy();
    }
  });
  it('throws for an unknown shape', () => {
    expect(() => defaultTemplate('poster', 2)).toThrow(TypeError);
  });
});

describe('coverTemplateId', () => {
  it('is w-cover for wide pages', () => {
    expect(coverTemplateId(WIDE)).toBe('w-cover');
  });
  it('is lp-cover for letter pages', () => {
    expect(coverTemplateId(LP)).toBe('lp-cover');
  });
  it('is lp-cover for anything else', () => {
    expect(coverTemplateId(undefined)).toBe('lp-cover');
    expect(coverTemplateId('poster')).toBe('lp-cover');
  });
});

describe('makeCover', () => {
  const month = (d) => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const at = (d) => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(d); };

  it('makes a cover page with the image, name, types and month', () => {
    at(new Date(2026, 10, 12, 10));
    expect(makeCover({ shape: LP, name: 'Beach day', categories: ['Editorial', 'Fashion'] }, 'img-1')).toEqual({
      template: 'lp-cover', images: ['img-1'], cover: true, title: 'Beach day', titleSize: 3,
      text: `Editorial · Fashion · ${month(new Date(2026, 10, 12))}`,
    });
  });
  it('writes the month in full with the year, no day', () => {
    at(new Date(2026, 10, 12, 10));
    const { text } = makeCover({ shape: LP, name: 'x' });
    expect(text).toBe(month(new Date(2026, 10, 1)));
    expect(text).toContain('2026');
    expect(text).not.toMatch(/\b12\b/);
    expect(text).not.toMatch(/\//);
  });
  it('follows the clock into a new month and year', () => {
    at(new Date(2026, 11, 31, 23, 59));
    const before = makeCover({ shape: LP, name: 'x' }).text;
    at(new Date(2027, 0, 1, 0, 1));
    const after = makeCover({ shape: LP, name: 'x' }).text;
    expect(before).toContain('2026');
    expect(after).toContain('2027');
    expect(before).not.toBe(after);
  });
  it('uses the wide cover on a wide board', () => {
    expect(makeCover({ shape: WIDE, name: 'W' }).template).toBe('w-cover');
  });
  it('has no images when no image is given', () => {
    expect(makeCover({ shape: LP, name: 'x' }).images).toEqual([]);
    expect(makeCover({ shape: LP, name: 'x' }, '').images).toEqual([]);
  });
  it('calls a board with no name "Untitled board"', () => {
    expect(makeCover({ shape: LP }).title).toBe('Untitled board');
    expect(makeCover({ shape: LP, name: '' }).title).toBe('Untitled board');
  });
  it('skips empty project types', () => {
    at(new Date(2026, 10, 12, 10));
    const { text } = makeCover({ shape: LP, name: 'x', categories: ['', null, 'Music video', undefined] });
    expect(text).toBe(`Music video · ${month(new Date(2026, 10, 12))}`);
  });
  it('throws without a board', () => {
    expect(() => makeCover()).toThrow(TypeError);
  });
});

describe('STYLES and styleFor', () => {
  it('lists the six layout approaches in wizard order', () => {
    expect(STYLES.map((s) => s.id)).toEqual(['grid', 'hero', 'mosaic', 'bleed', 'editorial', 'pairs']);
  });
  it('gives each a name, a blurb and a cycle for both shapes using real templates', () => {
    for (const s of STYLES) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.blurb.length).toBeGreaterThan(0);
      for (const shape of [LP, WIDE]) {
        expect(s.seq[shape].length).toBeGreaterThan(0);
        for (const id of s.seq[shape]) expect(templateFor(shape, id), `${s.id} ${id}`).not.toBeNull();
      }
    }
  });
  it('finds a style by id', () => {
    expect(styleFor('hero')).toBe(STYLES[1]);
    expect(styleFor('pairs').name).toBe('Pairs');
  });
  it('is null for an unknown or missing id', () => {
    expect(styleFor('nope')).toBeNull();
    expect(styleFor(undefined)).toBeNull();
    expect(styleFor('')).toBeNull();
  });
});

describe('styleTemplate', () => {
  it('cycles through the style\'s templates page by page', () => {
    expect([0, 1, 2, 3].map((n) => styleTemplate(LP, 'grid', n))).toEqual(['lp-grid-6', 'lp-grid-4', 'lp-grid-6', 'lp-grid-4']);
    expect([0, 1, 2, 3].map((n) => styleTemplate(WIDE, 'hero', n))).toEqual(['w-three-left', 'w-single-text', 'w-three-left', 'w-three-left']);
  });
  it('repeats a one-template style on every page', () => {
    expect(styleTemplate(LP, 'bleed', 0)).toBe('lp-bleed');
    expect(styleTemplate(LP, 'bleed', 99)).toBe('lp-bleed');
  });
  it('is null with no style, an unknown style or an unknown shape', () => {
    expect(styleTemplate(LP, null, 0)).toBeNull();
    expect(styleTemplate(LP, 'nope', 0)).toBeNull();
    expect(styleTemplate('poster', 'grid', 0)).toBeNull();
  });
});

describe('paginate', () => {
  const imgs = (n) => Array.from({ length: n }, (_, i) => `i${i}`);

  it('pours images into the style\'s cycle', () => {
    expect(paginate(LP, 'grid', imgs(10))).toEqual([
      { template: 'lp-grid-6', images: imgs(6) },
      { template: 'lp-grid-4', images: imgs(10).slice(6) },
    ]);
  });
  it('starts another page for the leftovers', () => {
    const pages = paginate(LP, 'grid', imgs(11));
    expect(pages.map((p) => p.template)).toEqual(['lp-grid-6', 'lp-grid-4', 'lp-grid-6']);
    expect(pages[2].images).toEqual(['i10']);
  });
  it('makes one empty page when there are no images', () => {
    expect(paginate(LP, 'grid', [])).toEqual([{ template: 'lp-grid-6', images: [] }]);
    expect(paginate(WIDE, null, [])).toEqual([{ template: 'w-single-text', images: [] }]);
  });
  it('fits the remaining images with the default layout when there is no style', () => {
    expect(paginate(LP, null, imgs(7))).toEqual([{ template: 'lp-grid-9', images: imgs(7) }]);
    expect(paginate(WIDE, 'nope', imgs(2))).toEqual([{ template: 'w-two', images: imgs(2) }]);
  });
  it('fills a page exactly without an extra empty page', () => {
    expect(paginate(LP, 'grid', imgs(6))).toEqual([{ template: 'lp-grid-6', images: imgs(6) }]);
  });
  it('splits more images than any layout holds over several pages', () => {
    const pages = paginate(WIDE, null, imgs(23));
    expect(pages.map((p) => p.template)).toEqual(['w-grid-10', 'w-grid-10', 'w-three']);
    expect(pages.flatMap((p) => p.images)).toEqual(imgs(23));
  });
  it('on letter with 10+ images and no style, fills grids of nine, then fits the rest', () => {
    const ten = paginate(LP, null, imgs(10));
    expect(ten.map((p) => p.template)).toEqual(['lp-grid-9', 'lp-single']);
    expect(ten[0].images).toEqual(imgs(9));
    const pages = paginate(LP, null, imgs(23));
    expect(pages.map((p) => p.template)).toEqual(['lp-grid-9', 'lp-grid-9', 'lp-five']);
    expect(pages.flatMap((p) => p.images)).toEqual(imgs(23));
  });
  it('stops at 501 pages', () => {
    const pages = paginate(LP, 'bleed', imgs(600));
    expect(pages).toHaveLength(501);
    expect(pages[500]).toEqual({ template: 'lp-bleed', images: ['i500'] });
  });
  it('does not change the list it was given', () => {
    const list = imgs(5);
    paginate(LP, 'pairs', list);
    expect(list).toEqual(imgs(5));
  });
});
