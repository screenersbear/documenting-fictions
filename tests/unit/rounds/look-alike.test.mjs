// rounds/data/look-alike.js: two people who might be one (Tightening
// Rounds, rounds/10): the same handle, or names that agree.
import { describe, it, expect } from 'vitest';
import * as L from '../../../rounds/data/look-alike.js';

describe('oneApart', () => {
  it('is one letter changed, added or taken away, or none', () => {
    expect(L.oneApart('lindsey', 'lindsay')).toBe(true);
    expect(L.oneApart('ana', 'anna')).toBe(true);
    expect(L.oneApart('anna', 'ana')).toBe(true);
    expect(L.oneApart('maya', 'maya')).toBe(true);
    expect(L.oneApart('maya', 'mara')).toBe(true);
    expect(L.oneApart('maya', 'mira')).toBe(false);
    expect(L.oneApart('jo', 'joann')).toBe(false);
  });
});

describe('namesAlike', () => {
  it('first names the same or one letter apart, and last names that agree', () => {
    expect(L.namesAlike('Lindsey T.', 'Lindsay Tran')).toBe(true);
    expect(L.namesAlike('Lindsay Tran', 'Lindsey T.')).toBe(true);
    expect(L.namesAlike('José Ruiz', 'jose ruiz')).toBe(true);
    expect(L.namesAlike('Ana', 'Ana')).toBe(true);
    expect(L.namesAlike('Ana', 'Ana Lee')).toBe(true);
    expect(L.namesAlike('Lindsey', 'Lindsay Tran')).toBe(false); // only one letter apart, and nothing else to go on
    expect(L.namesAlike('Ana Lee', 'Ana Park')).toBe(false);
    expect(L.namesAlike('Ana', 'Ava')).toBe(false); // too short to call one letter close
    expect(L.namesAlike('Maya R.', 'Mira R.')).toBe(false);
    expect(L.namesAlike('', 'Ana')).toBe(false);
    expect(L.namesAlike('Ana', '!!')).toBe(false);
  });
});

describe('sameHandle', () => {
  it('is the same Instagram, TikTok or email, any case, with or without @', () => {
    expect(L.sameHandle({ instagram: '@Maya.RR' }, { instagram: 'maya.rr' })).toBe(true);
    expect(L.sameHandle({ tiktok: 'maya' }, { tiktok: 'maya' })).toBe(true);
    expect(L.sameHandle({ email: 'M@x.com' }, { email: 'm@x.com' })).toBe(true);
    expect(L.sameHandle({ instagram: 'maya' }, { tiktok: 'maya' })).toBe(false);
    expect(L.sameHandle({ instagram: '' }, { instagram: '' })).toBe(false);
  });
});

describe('lookAlike', () => {
  const people = [
    { id: '3', name: 'Lindsay Tran' },
    { id: '1', name: 'Ana Lee', instagram: 'ana.l' },
    { id: '2', name: 'Lindsey T.' },
    { id: '4', name: 'Annie', instagram: 'ANA.L' },
  ];
  it('gives the first pair in name order', () => {
    expect(L.lookAlike(people).map((p) => p.id)).toEqual(['1', '4']);
  });
  it('skips a pair waved away, and gives null when none is left', () => {
    expect(L.lookAlike(people, [L.pairKey(people[3], people[1])]).map((p) => p.id)).toEqual(['3', '2']);
    expect(L.lookAlike(people, ['1|4', '2|3'])).toBeNull();
    expect(L.lookAlike([])).toBeNull();
  });
  it('keys a pair the same either way round', () => {
    expect(L.pairKey({ id: 'b' }, { id: 'a' })).toBe('a|b');
  });
});
