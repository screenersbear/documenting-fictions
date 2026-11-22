// the-eye/components/ref-return.js: Open in Ref keeps the shoot's page, and
// coming back from Ref opens the shoot there again (Starky, 21 Nov).
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

let ed;
beforeAll(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/ref-return.js');
  ed = { SHOOT_MODAL_SECTIONS: [{ id: 'basicInfoHeading' }, { id: 'visualsHeading' }] };
  window.EyeParts.addRefReturn(ed);
});
beforeEach(() => { sessionStorage.clear(); vi.restoreAllMocks(); });

describe('addRefReturn', () => {
  it('adds the two helpers', () => {
    expect(Object.keys(ed)).toEqual(['SHOOT_MODAL_SECTIONS', 'noteRefReturn', 'refReturnPage']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/ref-return.js');
    expect(window.EyeParts.other).toBe(1);
  });
});

describe('noteRefReturn and refReturnPage', () => {
  it('opens the shoot on the page it was on, once', () => {
    expect(ed.noteRefReturn('s1', { id: 'visualsHeading', sub: 2, extra: 1 })).toBe(true);
    expect(ed.refReturnPage('s1')).toEqual({ id: 'visualsHeading', sub: 2 });
    expect(ed.refReturnPage('s1')).toBeNull();
  });
  it('keeps the front page too', () => {
    ed.noteRefReturn('s1', { id: 'front', sub: 0 });
    expect(ed.refReturnPage('s1')).toEqual({ id: 'front', sub: 0 });
  });
  it('is nothing for another shoot, and that is let go too', () => {
    ed.noteRefReturn('s1', { id: 'front', sub: 0 });
    expect(ed.refReturnPage('s2')).toBeNull();
    expect(ed.refReturnPage('s1')).toBeNull();
  });
  it('keeps nothing that is not a real shoot and page', () => {
    for (const [id, page] of [['', { id: 'front', sub: 0 }], [3, { id: 'front', sub: 0 }], ['s1', null], ['s1', { id: 'nope', sub: 0 }], ['s1', { id: 'front', sub: -1 }], ['s1', { id: 'front', sub: 1.5 }]]) {
      expect(ed.noteRefReturn(id, page)).toBe(false);
    }
    expect(sessionStorage.length).toBe(0);
  });
  it('knows no pages without the list of them', () => {
    const bare = {};
    window.EyeParts.addRefReturn(bare);
    expect(bare.noteRefReturn('s1', { id: 'visualsHeading', sub: 0 })).toBe(false);
    expect(bare.noteRefReturn('s1', { id: 'front', sub: 0 })).toBe(true);
  });
  it('is nothing with something odd kept', () => {
    sessionStorage.setItem('eye-back-from-ref', 'not json');
    expect(ed.refReturnPage('s1')).toBeNull();
    sessionStorage.setItem('eye-back-from-ref', JSON.stringify({ shoot: 's1', page: { id: 'gone', sub: 0 } }));
    expect(ed.refReturnPage('s1')).toBeNull();
  });
  it('says no when the store cannot be used', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(ed.noteRefReturn('s1', { id: 'front', sub: 0 })).toBe(false);
  });
  it('is nothing without a session store', () => {
    const d = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
    Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw new Error('blocked'); } });
    try {
      expect(ed.noteRefReturn('s1', { id: 'front', sub: 0 })).toBe(false);
      expect(ed.refReturnPage('s1')).toBeNull();
    } finally { Object.defineProperty(window, 'sessionStorage', d); }
  });
});
