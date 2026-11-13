// contact-sheet/js/frame.js: how much of the screen a chapter's pages take,
// and where the notebook's left edge sits.
import { describe, it, expect } from 'vitest';
import { OUT, RIM, GAP, PEEK, bookSize, bookLeft } from '../../../contact-sheet/js/frame.js';

describe('margins', () => {
  it('leaves nothing outside the pages and draws no notebook edge', () => {
    expect(OUT).toBe(0);
    expect(RIM).toBe(0);
  });
  it('keeps a 16px gap from the screen edge', () => {
    expect(GAP).toBe(16);
  });
  it('shows the page beyond by the outside, rim and gap together', () => {
    expect(PEEK).toBe(16);
  });
});

describe('bookSize', () => {
  it('shows two pages of half the width when the frame is tall enough', () => {
    // cap = 800 * 0.74 + 16 = 608, half = 500
    expect(bookSize(1000, 800)).toEqual({ two: true, both: 500, one: 500 });
  });
  it('caps a page at a notebook page width on a short frame', () => {
    const s = bookSize(1000, 500); // cap = 386
    expect(s.two).toBe(true);
    expect(s.both).toBeCloseTo(386, 10);
    expect(s.one).toBeCloseTo(386, 10);
  });
  it('still shows two pages when half the width is exactly 300', () => {
    expect(bookSize(600, 1000)).toEqual({ two: true, both: 300, one: 300 });
  });
  it('shows one page at a time just below 300 per page, leaving room to peek', () => {
    const s = bookSize(599, 1000); // half 299.5, cap 756
    expect(s.two).toBe(false);
    expect(s.both).toBe(299.5);
    expect(s.one).toBe(583); // 599 - 16 peek
  });
  it('caps a single page by height on a narrow, short frame', () => {
    const s = bookSize(400, 300); // cap = 238
    expect(s.two).toBe(false);
    expect(s.both).toBe(200);
    expect(s.one).toBeCloseTo(238, 10);
  });
  it('uses the full width minus the peek on a narrow, tall frame', () => {
    expect(bookSize(320, 2000)).toEqual({ two: false, both: 160, one: 304 });
  });
  it('gives the peek back as a negative page on a zero-size frame', () => {
    expect(bookSize(0, 0)).toEqual({ two: false, both: 0, one: -16 });
  });
  it('handles a very wide, very tall window', () => {
    expect(bookSize(100000, 100000)).toEqual({ two: true, both: 50000, one: 50000 });
  });
  it('returns NaN sizes and one page for missing numbers', () => {
    const s = bookSize();
    expect(s.two).toBe(false);
    expect(s.both).toBeNaN();
    expect(s.one).toBeNaN();
  });
});

describe('bookLeft', () => {
  it('centres two pages in a wider window', () => {
    expect(bookLeft(1000, 400)).toBe(100);
  });
  it('sits at 0 when two pages fill the window exactly', () => {
    expect(bookLeft(1000, 500)).toBe(0);
  });
  it('still centres when two pages are one pixel wider than the window', () => {
    expect(bookLeft(999, 500)).toBe(-0.5);
  });
  it('falls back to the outside margin when two pages are wider by more than a pixel', () => {
    expect(bookLeft(998, 500)).toBe(OUT);
    expect(bookLeft(500, 2000)).toBe(0);
  });
  it('puts a zero-width page in the middle of the window', () => {
    expect(bookLeft(1000, 0)).toBe(500);
  });
  it('falls back to the margin for missing numbers', () => {
    expect(bookLeft(undefined, 100)).toBe(0);
    expect(bookLeft(1000, NaN)).toBe(0);
  });
});
