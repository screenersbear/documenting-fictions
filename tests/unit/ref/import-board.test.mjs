// ref/data/import-board.js: IMPORT on Mood boards (round 3,
// ref/08-new-and-import), its words and lists.
import { describe, it, expect } from 'vitest';
import { isPdf, baseName, pdfShape, pdfBoardPages, listName, failedWords } from '../../../ref/data/import-board.js';

describe('isPdf', () => {
  it('knows a PDF by its type, or by its name with no type', () => {
    expect(isPdf({ type: 'application/pdf', name: 'x' })).toBe(true);
    expect(isPdf({ type: '', name: 'Look.pdf' })).toBe(true);
    expect(isPdf({ type: '', name: 'Look.png' })).toBe(false);
    expect(isPdf({ type: '' })).toBe(false);
    expect(isPdf({ type: 'image/png', name: 'Look.pdf' })).toBe(false);
    expect(isPdf(null)).toBe(false);
  });
});

describe('baseName', () => {
  it('is the name without .pdf', () => {
    expect(baseName('Lookbook.pdf')).toBe('Lookbook');
    expect(baseName('Spring LOOK.PDF')).toBe('Spring LOOK');
    expect(baseName('  notes  ')).toBe('notes');
  });
  it('says PDF when there is nothing else', () => {
    expect(baseName('.pdf')).toBe('PDF');
    expect(baseName(undefined)).toBe('PDF');
  });
});

describe('pdfShape', () => {
  it('is wide when the first page is', () => {
    expect(pdfShape(true)).toBe('wide-16x9');
    expect(pdfShape(false)).toBe('letter-portrait');
  });
});

describe('pdfBoardPages', () => {
  it('puts each photo on a page of its own, edge to edge', () => {
    expect(pdfBoardPages('letter-portrait', ['a', 'b'])).toEqual([{ template: 'lp-bleed', images: ['a'] }, { template: 'lp-bleed', images: ['b'] }]);
    expect(pdfBoardPages('wide-16x9', ['a'])).toEqual([{ template: 'w-bleed', images: ['a'] }]);
  });
  it('takes the tall page for a size it does not know', () => {
    expect(pdfBoardPages('square', ['a'])).toEqual([{ template: 'lp-bleed', images: ['a'] }]);
  });
});

describe('listName', () => {
  it('says (from PDF) after the name until it is renamed', () => {
    expect(listName({ name: 'Lookbook', fromPdf: true })).toBe('Lookbook (from PDF)');
    expect(listName({ name: 'Lookbook', fromPdf: false })).toBe('Lookbook');
    expect(listName({ name: 'Rooftop' })).toBe('Rooftop');
  });
});

describe('failedWords', () => {
  it('says how many could not be read', () => {
    expect(failedWords(0)).toBe('');
    expect(failedWords(1)).toBe("1 file couldn't be read");
    expect(failedWords(3)).toBe("3 files couldn't be read");
  });
});
