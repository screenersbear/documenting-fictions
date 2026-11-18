// rounds/data/flip.js: swiping Today's cards only flips through them
// (rounds/NOTES.md, 18 Nov).
import { describe, it, expect } from 'vitest';
import { fresh, frontAt, flipTo, inFront, flipWords } from '../../../rounds/data/flip.js';

const D = '2026-11-18';

describe('fresh', () => {
  it('starts at the first card', () => {
    expect(fresh(D)).toEqual({ day: D, id: '', at: 0 });
    expect(fresh()).toEqual({ day: '', id: '', at: 0 });
  });
});

describe('frontAt', () => {
  const left = ['a', 'b', 'c'];
  it('finds the card in front', () => {
    expect(frontAt(left, { day: D, id: 'c', at: 2 }, D)).toBe(2);
    expect(frontAt(['b', 'c'], { day: D, id: 'c', at: 2 }, D)).toBe(1);
  });
  it('its card gone, the one after it; after the last, the first', () => {
    expect(frontAt(['a', 'c'], { day: D, id: 'b', at: 1 }, D)).toBe(1);
    expect(frontAt(['a', 'b'], { day: D, id: 'c', at: 2 }, D)).toBe(0);
    expect(frontAt([], { day: D, id: 'c', at: 2 }, D)).toBe(0);
  });
  it('starts again on another day, or with nothing to go on', () => {
    expect(frontAt(left, { day: '2026-11-17', id: 'c', at: 2 }, D)).toBe(0);
    expect(frontAt(left, null, D)).toBe(0);
  });
});

describe('flipTo', () => {
  const left = ['a', 'b', 'c'];
  it('goes to the next card, the last one round to the first', () => {
    expect(flipTo(left, 0, 1, D)).toEqual({ day: D, id: 'b', at: 1 });
    expect(flipTo(left, 2, 1, D)).toEqual({ day: D, id: 'a', at: 0 });
  });
  it('and back, the first one round to the last', () => {
    expect(flipTo(left, 1, -1, D)).toEqual({ day: D, id: 'a', at: 0 });
    expect(flipTo(left, 0, -1, D)).toEqual({ day: D, id: 'c', at: 2 });
  });
  it('with no cards, nowhere', () => {
    expect(flipTo([], 0, 1, D)).toEqual({ day: D, id: '', at: 0 });
  });
});

describe('inFront', () => {
  it('puts the front card first, the rest after it in order, round again', () => {
    expect(inFront(['a', 'b', 'c'], 0)).toEqual(['a', 'b', 'c']);
    expect(inFront(['a', 'b', 'c'], 2)).toEqual(['c', 'a', 'b']);
  });
});

describe('flipWords', () => {
  it('says where the front card is among the day\'s while flipping', () => {
    expect(flipWords(['x', 'a', 'b', 'c'], ['a', 'b', 'c'], 2)).toBe('4 of 4');
    expect(flipWords(['a', 'b', 'c'], ['a', 'b', 'c'], 1)).toBe('2 of 3');
  });
  it('nothing when not flipping, for the usual words', () => {
    expect(flipWords(['a', 'b'], ['a', 'b'], 0)).toBeNull();
  });
});
