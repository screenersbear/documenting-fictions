// ref/data/page-size.js: a page's size and its layouts. A board brought in
// with IMPORT keeps each picture whole, each page its own size (Starky,
// 21 Nov: a phone-size story came in cropped).
import { describe, it, expect } from 'vitest';
import { OWN, LONG_SIDE, OWN_TEMPLATE, sizeOfPicture, pageSize, pageKind, layoutsFor, templateOf, ownPages, nextSize, exportWidth } from '../../../ref/data/page-size.js';
import { TEMPLATES } from '../../../ref/data/templates.js';

const LP = 'letter-portrait', WIDE = 'wide-16x9';
const own = { shape: OWN };
const story = { size: { W: 6.188, H: 11 } };

describe('OWN_TEMPLATE', () => {
  it('is the picture, the whole page, its words over it', () => {
    expect(OWN).toBe('own');
    expect(LONG_SIDE).toBe(11);
    expect(OWN_TEMPLATE.slots).toEqual([{ x: 0, y: 0, w: 1, h: 1 }]);
    expect(OWN_TEMPLATE.text.overlay).toBe(true);
    expect(OWN_TEMPLATE.name).toBe('As imported');
  });
});

describe('sizeOfPicture', () => {
  it('makes the long side 11 inches, the shape kept', () => {
    expect(sizeOfPicture(1080, 1920)).toEqual({ W: 6.188, H: 11 });
    expect(sizeOfPicture(3000, 2000)).toEqual({ W: 11, H: 7.333 });
    expect(sizeOfPicture(500, 500)).toEqual({ W: 11, H: 11 });
  });
  it('is null for sizes that are not real', () => {
    for (const [w, h] of [[0, 10], [10, -1], [NaN, 5], [undefined, 5], ['10', 5], [Infinity, 3]]) expect(sizeOfPicture(w, h)).toBeNull();
  });
});

describe('pageSize and pageKind', () => {
  it("is the page's own size first", () => {
    expect(pageSize(own, story)).toEqual({ W: 6.188, H: 11 });
    expect(pageKind(own, story)).toBe(LP);
    expect(pageKind(own, { size: { W: 11, H: 7 } })).toBe(WIDE);
  });
  it("is the board's otherwise, and letter for anything unknown", () => {
    expect(pageSize({ shape: WIDE }, {})).toEqual({ W: 13.333, H: 7.5 });
    expect(pageSize({ shape: WIDE }, { size: { W: 0, H: 3 } })).toEqual({ W: 13.333, H: 7.5 });
    expect(pageSize(null, null)).toEqual({ W: 8.5, H: 11 });
    expect(pageSize(own, {})).toEqual({ W: 8.5, H: 11 });
    expect(pageKind({ shape: WIDE }, story)).toBe(WIDE);
    expect(pageKind(null, null)).toBe(LP);
  });
});

describe('layoutsFor', () => {
  it('offers As imported first on an imported board, then the tall or wide ones', () => {
    const list = layoutsFor(own, story);
    expect(list[0]).toBe(OWN_TEMPLATE);
    expect(list.slice(1)).toEqual(TEMPLATES[LP].filter((t) => !t.guide));
    expect(layoutsFor(own, { size: { W: 11, H: 6 } }).slice(1)).toEqual(TEMPLATES[WIDE].filter((t) => !t.guide));
  });
  it("offers a board's own list, no guides, otherwise", () => {
    const list = layoutsFor({ shape: WIDE }, {});
    expect(list).toEqual(TEMPLATES[WIDE].filter((t) => !t.guide));
    expect(list.some((t) => t.id === OWN)).toBe(false);
    expect(layoutsFor(undefined, undefined)).toEqual(TEMPLATES[LP].filter((t) => !t.guide));
  });
});

describe('templateOf', () => {
  it('is As imported for an imported page', () => {
    expect(templateOf(own, { template: OWN, images: ['a'] })).toBe(OWN_TEMPLATE);
  });
  it('is the layout named, or the best one for its photos', () => {
    expect(templateOf({ shape: LP }, { template: 'lp-grid-4', images: [] }).id).toBe('lp-grid-4');
    expect(templateOf({ shape: LP }, { images: ['a', null, 'b'] }).id).toBe('lp-two-stack');
    expect(templateOf({ shape: LP }, { template: 'gone' }).id).toBe('lp-single');
    expect(templateOf({ shape: WIDE }, null).id).toBe('w-single-text');
  });
});

describe('ownPages', () => {
  it('is a page for each photo, its own size, the photo whole', () => {
    expect(ownPages([{ id: 'a', width: 1080, height: 1920 }, null, { width: 5, height: 5 }, { id: 'b' }])).toEqual([
      { template: OWN, images: ['a'], size: { W: 6.188, H: 11 } },
      { template: OWN, images: ['b'], size: { W: 8.5, H: 11 } },
    ]);
    expect(ownPages(undefined)).toEqual([]);
  });
});

describe('nextSize', () => {
  it("is an imported page's own size, and nothing on other boards", () => {
    expect(nextSize(own, story)).toEqual({ W: 6.188, H: 11 });
    expect(nextSize({ shape: LP }, story)).toBeNull();
    expect(nextSize(null, story)).toBeNull();
  });
});

describe('exportWidth', () => {
  it('draws a tall page with its long side 2200 and a wide one 2000 across', () => {
    expect(exportWidth({ W: 8.5, H: 11 })).toBe(1700);
    expect(exportWidth({ W: 6.188, H: 11 })).toBe(1238);
    expect(exportWidth({ W: 13.333, H: 7.5 })).toBe(2000);
    expect(exportWidth({ W: 5, H: 5 })).toBe(2000);
    expect(exportWidth(null)).toBe(2000);
  });
});
