import { describe, it, expect } from 'vitest';
import { STEPS, guideStep, setGuide, wantsGuide, afterImport, guideWords } from '../../../ref/data/first-guide.js';

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m }; };
const broken = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); }, removeItem() { throw new Error('no'); } };

describe('guideStep and setGuide', () => {
  it('keeps the step it is on', () => {
    const s = memory();
    expect(setGuide(s, 'pick')).toBe(true);
    expect(guideStep(s)).toBe('pick');
    setGuide(s, 'tag');
    expect(guideStep(s)).toBe('tag');
  });
  it('ends it for anything that is not a step', () => {
    const s = memory();
    setGuide(s, 'pick');
    expect(setGuide(s, '')).toBe(true);
    expect(guideStep(s)).toBe('');
    setGuide(s, 'tag');
    setGuide(s, 'done');
    expect(s.m.size).toBe(0);
  });
  it('is off with nothing kept, something odd kept, or no store', () => {
    expect(guideStep(memory())).toBe('');
    const s = memory(); s.setItem('ref-first-photos', 'later');
    expect(guideStep(s)).toBe('');
    expect(guideStep(null)).toBe('');
    expect(guideStep(undefined)).toBe('');
  });
  it('copes with a store that throws', () => {
    expect(guideStep(broken)).toBe('');
    expect(setGuide(broken, 'pick')).toBe(false);
    expect(setGuide(null, 'pick')).toBe(false);
  });
  it('has the two steps in order', () => { expect(STEPS).toEqual(['pick', 'tag']); });
});

describe('wantsGuide', () => {
  it('walks someone with no photos through', () => { expect(wantsGuide(0)).toBe(true); });
  it('leaves someone with photos alone', () => { expect(wantsGuide(1)).toBe(false); expect(wantsGuide(5000)).toBe(false); });
  it('says no to bad input', () => { expect(wantsGuide(undefined)).toBe(false); expect(wantsGuide('0')).toBe(false); expect(wantsGuide(NaN)).toBe(false); });
});

describe('afterImport', () => {
  it('goes on to tagging once photos come in on the first step', () => {
    expect(afterImport('pick', 1)).toBe('tag');
    expect(afterImport('pick', 300)).toBe('tag');
  });
  it('stays put when none came in or it is on another step', () => {
    expect(afterImport('pick', 0)).toBe('pick');
    expect(afterImport('tag', 4)).toBe('tag');
    expect(afterImport('', 4)).toBe('');
  });
  it('stays put on bad numbers', () => {
    expect(afterImport('pick', NaN)).toBe('pick');
    expect(afterImport('pick', undefined)).toBe('pick');
    expect(afterImport('pick', -2)).toBe('pick');
  });
});

describe('guideWords', () => {
  it('says what to do on the first step', () => {
    expect(guideWords('pick')).toMatchObject({ count: 'Step 1 of 2', title: 'Bring your photos in', done: 'Skip' });
    expect(guideWords('pick').line).toContain('Open your phone');
  });
  it('says what to do on the second', () => {
    expect(guideWords('tag')).toMatchObject({ count: 'Step 2 of 2', title: 'Now tag them', done: 'Got it' });
  });
  it('is null on no step', () => {
    expect(guideWords('')).toBe(null);
    expect(guideWords(undefined)).toBe(null);
    expect(guideWords('toString')).toBe(null);
  });
});
