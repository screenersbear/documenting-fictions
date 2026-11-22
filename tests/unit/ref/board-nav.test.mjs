import { describe, it, expect } from 'vitest';
import { pageThumbs, pageOf, trayStart, swipeTurns } from '../../../ref/data/board-nav.js';

const pg = (...ids) => ({ template: 't', images: ids.map((id) => (id ? { id } : null)) });

describe('pageThumbs', () => {
  it('gives each page its first photo and number, first page first', () => {
    expect(pageThumbs([pg('a'), pg('b', 'c'), pg('d')])).toEqual([{ id: 'a', page: 1 }, { id: 'b', page: 2 }, { id: 'd', page: 3 }]);
  });
  it('skips empty spots and leaves out pages with no photo, keeping the numbers', () => {
    expect(pageThumbs([pg(null), pg(null, 'x'), { images: [] }, pg('y')])).toEqual([{ id: 'x', page: 2 }, { id: 'y', page: 4 }]);
  });
  it('is empty for no pages or bad input', () => {
    expect(pageThumbs([])).toEqual([]);
    expect(pageThumbs(null)).toEqual([]);
    expect(pageThumbs([null, { images: 'no' }, {}, { images: [{}, { id: '' }] }])).toEqual([]);
  });
  it('keeps every page of a long board', () => {
    const pages = Array.from({ length: 300 }, (_, i) => pg(`p${i}`));
    const t = pageThumbs(pages);
    expect(t).toHaveLength(300);
    expect(t[299]).toEqual({ id: 'p299', page: 300 });
  });
});

describe('pageOf', () => {
  const pages = [pg('a'), pg('b'), pg('a', 'c')];
  it('finds the page a photo is on', () => {
    expect(pageOf(pages, 'b')).toBe(1);
    expect(pageOf(pages, 'c')).toBe(2);
  });
  it('takes the next one after the page you are on, then goes round', () => {
    expect(pageOf(pages, 'a', 0)).toBe(2);
    expect(pageOf(pages, 'a', 2)).toBe(0);
    expect(pageOf(pages, 'b', 1)).toBe(1);
  });
  it('is -1 when the photo is on no page or the input is bad', () => {
    expect(pageOf(pages, 'z')).toBe(-1);
    expect(pageOf([], 'a')).toBe(-1);
    expect(pageOf(null, 'a', 3)).toBe(-1);
    expect(pageOf([null, {}, { images: [null, {}] }], 'a')).toBe(-1);
  });
  it('copes with a from past the end', () => {
    expect(pageOf(pages, 'b', 99)).toBe(1);
  });
});

describe('trayStart', () => {
  it('starts a PDF board on its pages', () => { expect(trayStart({ fromPdf: true })).toBe('pages'); });
  it('starts a board brought in as it is on its pages', () => { expect(trayStart({ shape: 'own' })).toBe('pages'); });
  it('starts any other board on All', () => { expect(trayStart({ fromPdf: false })).toBe('all'); expect(trayStart({})).toBe('all'); });
  it('starts on All with no board', () => { expect(trayStart(null)).toBe('all'); expect(trayStart(undefined)).toBe('all'); });
});

describe('swipeTurns', () => {
  it('turns on a sideways swipe when the photo cannot move sideways', () => {
    expect(swipeTurns(-80, 10, 0)).toBe(true);
    expect(swipeTurns(80, -5, 0.5)).toBe(true);
  });
  it('crops instead when the photo has room sideways or the drag is up and down', () => {
    expect(swipeTurns(-80, 10, 0.6)).toBe(false);
    expect(swipeTurns(-10, 80, 0)).toBe(false);
    expect(swipeTurns(20, 20, 0)).toBe(false);
    expect(swipeTurns(0, 0, 0)).toBe(false);
  });
  it('never turns on bad numbers', () => {
    expect(swipeTurns(NaN, 0, 0)).toBe(false);
    expect(swipeTurns(80, 0, undefined)).toBe(false);
    expect(swipeTurns('80', 0, 0)).toBe(false);
  });
});
