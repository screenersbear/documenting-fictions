// ref/data/board-fonts.js: a board's fonts for its titles and its text, the
// Mac app's list (Starky, 21 Nov), old boards staying in Klee One.
import { describe, it, expect } from 'vitest';
import { BOARD_FONTS, KINDS, NEW_FONTS, fontById, kindOf, boardFont, fontStack, setBoardFont, withNewFonts, fontsToLoad } from '../../../ref/data/board-fonts.js';

describe('BOARD_FONTS', () => {
  it('is the Mac app list in its order, then Klee One', () => {
    expect(BOARD_FONTS.map((f) => f.name)).toEqual(['Courier New', 'American Typewriter', 'Helvetica Neue', 'Avenir Next', 'Futura', 'Gill Sans', 'Georgia', 'Baskerville', 'Didot', 'Michroma', 'Menlo', 'Klee One']);
    expect(new Set(BOARD_FONTS.map((f) => f.id)).size).toBe(BOARD_FONTS.length);
    for (const f of BOARD_FONTS) expect(f.stack.length).toBeGreaterThan(0);
  });
  it('starts new boards in Courier New, both kinds', () => {
    expect(KINDS).toEqual(['title', 'text']);
    expect(NEW_FONTS).toEqual({ title: 'courier', text: 'courier' });
  });
});

describe('fontById and kindOf', () => {
  it('finds a font, or null', () => {
    expect(fontById('georgia').name).toBe('Georgia');
    expect(fontById('nope')).toBeNull();
    expect(fontById(undefined)).toBeNull();
  });
  it('calls a title a title and everything else text', () => {
    expect(kindOf('title')).toBe('title');
    expect(kindOf('text')).toBe('text');
    expect(kindOf('note')).toBe('text');
    expect(kindOf(undefined)).toBe('text');
  });
});

describe('boardFont and fontStack', () => {
  it('reads the board', () => {
    const b = { fonts: { title: 'futura', text: 'menlo' } };
    expect(boardFont(b, 'title').id).toBe('futura');
    expect(boardFont(b, 'text').id).toBe('menlo');
    expect(boardFont(b, 'note').id).toBe('menlo');
    expect(fontStack(b, 'title')).toBe(fontById('futura').stack);
  });
  it('is Klee One for a board from before, or a font it no longer has', () => {
    expect(boardFont({}, 'title').id).toBe('klee');
    expect(boardFont(null, 'text').id).toBe('klee');
    expect(boardFont({ fonts: { title: 'gone' } }, 'title').id).toBe('klee');
  });
});

describe('setBoardFont', () => {
  it('changes one kind and keeps the other', () => {
    const b = { fonts: { title: 'courier', text: 'courier' } };
    expect(setBoardFont(b, 'title', 'didot')).toBe(true);
    expect(b.fonts).toEqual({ title: 'didot', text: 'courier' });
    expect(setBoardFont(b, 'note', 'menlo')).toBe(true);
    expect(b.fonts).toEqual({ title: 'didot', text: 'menlo' });
  });
  it("keeps an old board's text in Klee One when its titles change", () => {
    const b = { name: 'Old' };
    expect(setBoardFont(b, 'title', 'georgia')).toBe(true);
    expect(b.fonts).toEqual({ title: 'georgia', text: 'klee' });
  });
  it('says no to a font it has not got, or no board', () => {
    const b = { fonts: { title: 'courier', text: 'courier' } };
    expect(setBoardFont(b, 'title', 'comic')).toBe(false);
    expect(b.fonts.title).toBe('courier');
    expect(setBoardFont(null, 'title', 'georgia')).toBe(false);
  });
});

describe('withNewFonts', () => {
  it('gives a board being made the new fonts', () => {
    const b = withNewFonts({ name: 'New' });
    expect(b).toEqual({ name: 'New', fonts: { title: 'courier', text: 'courier' } });
    b.fonts.title = 'didot';
    expect(NEW_FONTS.title).toBe('courier'); // its own copy
  });
  it('leaves fonts it has, and no board, as they are', () => {
    const b = { fonts: { title: 'menlo', text: 'futura' } };
    expect(withNewFonts(b)).toBe(b);
    expect(withNewFonts(null)).toBeNull();
  });
});

describe('fontsToLoad', () => {
  it('lists each font the board uses once', () => {
    expect(fontsToLoad({ fonts: { title: 'courier', text: 'courier' } })).toEqual([fontById('courier').stack]);
    expect(fontsToLoad({ fonts: { title: 'didot', text: 'menlo' } })).toEqual([fontById('didot').stack, fontById('menlo').stack]);
  });
});
