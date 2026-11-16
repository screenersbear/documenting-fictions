// rounds/data/people-find.js: People's search, filters and sort, each card's
// dim line, and Reach out to's rows (Tightening Rounds, rounds/10 and 07).
import { describe, it, expect } from 'vitest';
import * as F from '../../../rounds/data/people-find.js';

const TODAY = '2026-11-16'; // a Monday
const WEEK = { work: [1, 2, 3, 4, 5], off: [0] };
const p = (id, o) => ({ id, name: id, group: 'new', groups: ['new'], letGo: false, next: null, ...o });

describe('matches', () => {
  const jose = p('j', { name: 'José Ruiz', instagram: 'jose.rr', note: 'Met at the gallery', where: 'Rooftop' });
  it('finds a name, a handle (with or without @), the note, or where they met, any case and accents', () => {
    for (const q of ['jose', 'RUIZ', '@jose.rr', 'gallery', 'roof', '', '  ']) expect(F.matches(jose, q)).toBe(true);
    expect(F.matches(jose, 'maya')).toBe(false);
    expect(F.matches({ id: 'x', name: undefined }, 'a')).toBe(false);
  });
});

describe('filters', () => {
  it('are All, Due, Regulars, Clients, New and Prospects', () => {
    expect(F.FILTERS.map(([, n]) => n)).toEqual(['All', 'Due', 'Regulars', 'Clients', 'New', 'Prospects']);
  });
  it('Due is a move due today or before; let go and nothing planned are not', () => {
    expect(F.inFilter(p('a', { next: { kind: 'checkin', due: TODAY } }), 'due', WEEK, TODAY)).toBe(true);
    expect(F.inFilter(p('b', { next: { kind: 'checkin', due: '2026-11-01' } }), 'due', WEEK, TODAY)).toBe(true);
    expect(F.inFilter(p('c', { next: { kind: 'checkin', due: '2026-11-17' } }), 'due', WEEK, TODAY)).toBe(false);
    expect(F.inFilter(p('d', { next: { kind: 'checkin', due: TODAY }, letGo: true }), 'due', WEEK, TODAY)).toBe(false);
    expect(F.inFilter(p('e'), 'due', WEEK, TODAY)).toBe(false);
  });
  it('a group is anyone in it, among their other groups; All (or anything else) is everyone', () => {
    const both = p('a', { group: 'client', groups: ['regular', 'client'] });
    expect(['all', 'regular', 'client', 'new', 'prospect', 'odd'].map((f) => F.inFilter(both, f, WEEK, TODAY))).toEqual([true, true, true, false, false, true]);
  });
});

describe('lastLines and lastWords', () => {
  const lines = [
    { id: '1', personId: 'a', kind: 'checkin', day: '2026-11-10', at: 1 },
    { id: '2', personId: 'a', kind: 'moment', what: 'photos', day: '2026-11-12', at: 2 },
    { id: '3', personId: 'a', kind: 'note', how: 'call', day: '2026-11-15', at: 3 },
    { id: '4', personId: 'a', kind: 'hello', day: '2026-11-12', at: 1 },
    { id: '5', personId: 'b', kind: 'pitch', day: '2026-11-01' },
    { id: '6', personId: 'b', kind: 'other', day: '2026-11-01', at: 4 },
    { id: '7', personId: 'b', kind: 'checkin' },
    { id: '8', personId: 'b', kind: 'hello', day: '2026-11-01' }, // the same day, no time: not after 6
  ];
  it('keep each person\'s latest move or moment (a note on its own is not one)', () => {
    const last = F.lastLines(lines);
    expect(last.get('a').id).toBe('2');
    expect(last.get('b').id).toBe('6');
  });
  it('say it in lower case, with when', () => {
    expect(F.lastWords(p('a', { name: 'Ana Lee' }), lines[1], TODAY)).toBe('sent photos, Thursday');
    expect(F.lastWords(p('a', { name: 'Ana Lee' }), { kind: 'pitch', day: TODAY }, TODAY)).toBe('pitched Ana, today');
    expect(F.lastWords(p('b'), lines[5], TODAY)).toBe('reached out, 1 Nov');
  });
});

describe('sortPeople', () => {
  const people = [
    p('Cy', { next: { kind: 'checkin', due: '2026-11-20' } }),
    p('ana', { next: { kind: 'checkin', due: '2026-11-18' } }),
    p('Bo'),
    p('Di', { next: { kind: 'checkin', due: '2026-11-17' }, letGo: true }),
  ];
  const last = new Map([['Bo', { day: '2026-11-15' }], ['Cy', { day: '2026-11-01' }]]);
  it('A to Z by default (any case)', () => {
    expect(F.sortPeople(people, 'az', last, WEEK, TODAY).map((x) => x.id)).toEqual(['ana', 'Bo', 'Cy', 'Di']);
    expect(F.sortPeople(people, undefined, last, WEEK, TODAY).map((x) => x.id)).toEqual(['ana', 'Bo', 'Cy', 'Di']);
  });
  it('Next move: the soonest first, nothing planned (or let go) last', () => {
    expect(F.sortPeople(people, 'next', last, WEEK, TODAY).map((x) => x.id)).toEqual(['ana', 'Cy', 'Bo', 'Di']);
  });
  it('Recently in touch: the latest first, never in touch last', () => {
    expect(F.sortPeople(people, 'recent', last, WEEK, TODAY).map((x) => x.id)).toEqual(['Bo', 'Cy', 'ana', 'Di']);
  });
  it('leaves the list it was given as it was', () => {
    F.sortPeople(people, 'az', last, WEEK, TODAY);
    expect(people[0].id).toBe('Cy');
  });
});

describe('cardLine and pickLine', () => {
  const ana = p('a', { name: 'Ana', group: 'client', next: { kind: 'checkin', due: '2026-11-20' } });
  it('the last thing this past week, else when they are due, else the last thing', () => {
    expect(F.cardLine(ana, { kind: 'moment', what: 'photos', day: TODAY }, WEEK, TODAY)).toBe('Last: sent photos, today');
    expect(F.cardLine(ana, { kind: 'checkin', day: '2026-11-09' }, WEEK, TODAY)).toBe('Last: checked in, 9 Nov');
    expect(F.cardLine(ana, { kind: 'checkin', day: '2026-11-01' }, WEEK, TODAY)).toBe('Due Friday');
    expect(F.cardLine(ana, null, WEEK, TODAY)).toBe('Due Friday');
    expect(F.cardLine(p('b'), { kind: 'hello', day: '2026-10-01' }, WEEK, TODAY)).toBe('Last: said hello, 1 Oct');
    expect(F.cardLine({ ...ana, letGo: true }, null, WEEK, TODAY)).toBe('');
  });
  it('a row on Reach out to: their group, and the last thing', () => {
    expect(F.pickLine(ana, { kind: 'moment', what: 'photos', day: '2026-11-02' }, TODAY)).toBe('Client · last: sent photos, 2 Nov');
    expect(F.pickLine(p('b', { group: 'odd' }), null, TODAY)).toBe('New');
  });
  it('dueLine says when, as the person page does', () => {
    expect(F.dueLine({ kind: 'checkin', due: TODAY }, WEEK, TODAY)).toBe('Due today');
    expect(F.dueLine({ kind: 'checkin', due: '2026-11-17' }, WEEK, TODAY)).toBe('Due tomorrow');
  });
});
