// the-eye/components/board-groups.js: a mood board's PDFs (round 7,
// 16-mood-board-pdf), each page one photo, kept with the file's name.
import { describe, it, expect, beforeAll, vi } from 'vitest';

let ed;
beforeAll(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/board-groups.js');
  ed = {};
  window.EyeParts.addBoardGroups(ed);
});

describe('addBoardGroups', () => {
  it('adds the four helpers and nothing else', () => {
    expect(Object.keys(ed)).toEqual(['isPdfFile', 'pdfRuns', 'pdfRunWords', 'pdfAddedWords']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/board-groups.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addBoardGroups).toBe('function');
  });
});

describe('isPdfFile', () => {
  it('knows a PDF by its type', () => {
    expect(ed.isPdfFile({ type: 'application/pdf', name: 'look' })).toBe(true);
    expect(ed.isPdfFile({ type: 'image/jpeg', name: 'look.pdf' })).toBe(false);
  });
  it('by its name when the phone gives no type', () => {
    expect(ed.isPdfFile({ type: '', name: 'Lookbook.PDF' })).toBe(true);
    expect(ed.isPdfFile({ type: '', name: 'Lookbook.jpg' })).toBe(false);
    expect(ed.isPdfFile({ type: '' })).toBe(false);
  });
  it('and nothing at all is no PDF', () => {
    expect(ed.isPdfFile(null)).toBe(false);
  });
});

describe('pdfRuns', () => {
  const photo = (pdf) => (pdf ? { src: 'x', caption: '', pdf } : { src: 'x', caption: '' });
  it('finds where each PDF starts and how many of its pages follow', () => {
    const board = [photo(), photo('Look.pdf'), photo('Look.pdf'), photo('Look.pdf'), photo(), photo('Other.pdf')];
    expect(ed.pdfRuns(board)).toEqual([{ at: 1, name: 'Look.pdf', count: 3 }, { at: 5, name: 'Other.pdf', count: 1 }]);
  });
  it('starts again when the same PDF comes back after other photos', () => {
    expect(ed.pdfRuns([photo('A.pdf'), photo(), photo('A.pdf')])).toEqual([{ at: 0, name: 'A.pdf', count: 1 }, { at: 2, name: 'A.pdf', count: 1 }]);
  });
  it('two PDFs side by side are two', () => {
    expect(ed.pdfRuns([photo('A.pdf'), photo('B.pdf'), photo('B.pdf')])).toEqual([{ at: 0, name: 'A.pdf', count: 1 }, { at: 1, name: 'B.pdf', count: 2 }]);
  });
  it('has none for photos alone, a missing board, or a name that is not words', () => {
    expect(ed.pdfRuns([photo(), photo()])).toEqual([]);
    expect(ed.pdfRuns(undefined)).toEqual([]);
    expect(ed.pdfRuns([null, { src: 'x', pdf: 3 }])).toEqual([]);
  });
});

describe('the words', () => {
  it('over a PDF\'s pages', () => {
    expect(ed.pdfRunWords({ at: 0, name: 'Lookbook.pdf', count: 8 })).toBe('From Lookbook.pdf · 8 pages');
    expect(ed.pdfRunWords({ at: 0, name: 'One.pdf', count: 1 })).toBe('From One.pdf · 1 page');
  });
  it('once they are in', () => {
    expect(ed.pdfAddedWords([{ name: 'Lookbook.pdf', count: 8 }])).toBe('All 8 pages of Lookbook.pdf are on the mood board, one photo each.');
    expect(ed.pdfAddedWords([{ name: 'One.pdf', count: 1 }])).toBe('The page of One.pdf is on the mood board, as a photo.');
    expect(ed.pdfAddedWords([{ name: 'A.pdf', count: 2 }, { name: 'B.pdf', count: 1 }])).toBe('The pages of 2 PDFs are on the mood board, one photo each.');
  });
});
