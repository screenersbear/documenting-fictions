// ref/data/eye-return.js: a board opened from The Eye's Open in Ref goes back
// to that shoot (Starky, 21 Nov), for this visit only.
import { describe, it, expect } from 'vitest';
import { noteReturn, returnFor, keepReturn } from '../../../ref/data/eye-return.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };

describe('noteReturn and returnFor', () => {
  it('keeps the shoot for that board', () => {
    const s = memory();
    expect(noteReturn(s, ' b1 ', 's1')).toBe(true);
    expect(returnFor(s, 'b1')).toBe('s1');
    expect(returnFor(s, 'b2')).toBe('');
  });
  it('keeps nothing without both, or with a store it cannot write', () => {
    const s = memory();
    expect(noteReturn(s, 'b1', '')).toBe(false);
    expect(noteReturn(s, '', 's1')).toBe(false);
    expect(noteReturn(s, 'b1', 7)).toBe(false);
    expect(s.m.size).toBe(0);
    expect(noteReturn(broken, 'b1', 's1')).toBe(false);
    expect(noteReturn(null, 'b1', 's1')).toBe(false);
  });
  it('is nothing with nothing kept, something else kept, or no store', () => {
    expect(returnFor(memory(), 'b1')).toBe('');
    const s = memory();
    s.setItem('ref-back-to-eye', 'not json');
    expect(returnFor(s, 'b1')).toBe('');
    s.setItem('ref-back-to-eye', JSON.stringify({ board: 'b1', shoot: '' }));
    expect(returnFor(s, 'b1')).toBe('');
    s.setItem('ref-back-to-eye', 'null');
    expect(returnFor(s, 'b1')).toBe('');
    expect(returnFor(broken, 'b1')).toBe('');
  });
});

describe('keepReturn', () => {
  it("keeps it while the board's page is open, and ends it anywhere else", () => {
    const s = memory();
    noteReturn(s, 'a b', 's1');
    expect(keepReturn(s, '#/board/a%20b')).toBe(true);
    expect(returnFor(s, 'a b')).toBe('s1');
    expect(keepReturn(s, '#/boards')).toBe(false);
    expect(returnFor(s, 'a b')).toBe('');
  });
  it('does nothing with nothing kept, or no store', () => {
    expect(keepReturn(memory(), '#/boards')).toBe(false);
    expect(keepReturn(broken, '#/boards')).toBe(false);
  });
});
