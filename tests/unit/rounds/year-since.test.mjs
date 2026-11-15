// rounds/data/year-since.js: A year since, a year after a shoot in The Eye was delivered.
import { describe, it, expect } from 'vitest';
import { yearAfter, yearsDue, yearSince, takeYears, LATE, YEAR_GROUPS } from '../../../rounds/data/year-since.js';
import { newPerson } from '../../../rounds/data/person.js';
import { move } from '../../../rounds/data/plan.js';

const T = '2026-11-15';
const shoot = (id, date, more = {}) => ({ id, title: 'Rooftop portraits', status: 'delivered', date, ...more });
const person = (id, group, shoots, more = {}) => ({ ...newPerson({ id, name: `${id} Park`, group, next: move('checkin', '2026-12-20') }, T), shoots, ...more });

describe('yearAfter', () => {
  it('is the same day a year on', () => {
    expect(yearAfter('2025-11-15')).toBe('2026-11-15');
    expect(yearAfter('2025-01-31')).toBe('2026-01-31');
  });
  it('crosses into the next year from the last day of one', () => {
    expect(yearAfter('2025-12-31')).toBe('2026-12-31');
    expect(yearAfter('2026-01-01')).toBe('2027-01-01');
  });
  it('gives 28 Feb for 29 Feb in a year without one, and 29 Feb in a year with one', () => {
    expect(yearAfter('2024-02-29')).toBe('2025-02-28');
    expect(yearAfter('2027-02-28')).toBe('2028-02-28');
    expect(yearAfter('2027-03-01')).toBe('2028-03-01');
  });
});

describe('yearsDue', () => {
  it('takes a delivered shoot on the day its year comes, or up to a month after', () => {
    const due = yearsDue([shoot('a', '2025-11-15'), shoot('b', '2025-10-16')], T);
    expect(due.map((s) => s.id)).toEqual(['b', 'a']);
    expect(LATE).toBe(30);
  });
  it('passes by a shoot whose year is still to come, or came more than a month ago', () => {
    expect(yearsDue([shoot('a', '2025-11-16'), shoot('b', '2025-10-15'), shoot('c', '2026-11-15'), shoot('d', '2020-11-15')], T)).toEqual([]);
  });
  it('takes only delivered shoots, never one seen before', () => {
    const shoots = ['captured', 'editing', 'waiting_for_selects', 'booked', undefined].map((status, i) => shoot(`s${i}`, '2025-11-15', { status }));
    expect(yearsDue(shoots, T)).toEqual([]);
    expect(yearsDue([shoot('a', '2025-11-15')], T, ['a'])).toEqual([]);
  });
  it('passes by shoots with no id or no real day, and nothing at all', () => {
    expect(yearsDue([null, shoot('', '2025-11-15'), shoot('a', ''), shoot('b', '2025-13-01'), shoot('c', '15/11/2025'), shoot('d', undefined)], T)).toEqual([]);
    expect(yearsDue(undefined, T)).toEqual([]);
    expect(yearsDue([], T)).toEqual([]);
  });
});

describe('yearSince', () => {
  it('gives them A year since today, a Check in with the shoot, standing in for the move they had', () => {
    const p = person('june', 'regular', ['a']);
    expect(yearSince(p, shoot('a', '2025-11-15', { title: '  Rooftop portraits ' }), T).next).toEqual({
      kind: 'checkin', due: T, step: 0, year: { shootId: 'a', shoot: 'Rooftop portraits' }, then: move('checkin', '2026-12-20'),
    });
  });
  it('stands in for nothing when they had nothing planned, and keeps the rest of them', () => {
    const p = { ...person('june', 'client', ['a']), next: null };
    const q = yearSince(p, shoot('a', '2025-11-15'), T);
    expect(q.next).toEqual({ kind: 'checkin', due: T, step: 0, year: { shootId: 'a', shoot: 'Rooftop portraits' } });
    expect({ ...q, next: null }).toEqual(p);
    expect(p.next).toBe(null);
  });
  it('a second one gives back what the first stood in for, or nothing', () => {
    const first = yearSince(person('june', 'regular', ['a', 'b']), shoot('a', '2025-10-20'), T);
    expect(yearSince(first, shoot('b', '2025-11-15'), T).next.then).toEqual(move('checkin', '2026-12-20'));
    const none = yearSince({ ...first, next: { ...first.next, then: undefined } }, shoot('b', '2025-11-15'), T);
    expect(none.next).not.toHaveProperty('then');
  });
  it('keeps Your photos are up, with what it stood in for, to come back after', () => {
    const photos = { ...move('photos', '2026-11-14'), shoot: 'Beach day', then: move('checkin', '2026-12-20') };
    expect(yearSince({ ...person('june', 'regular', ['a']), next: photos }, shoot('a', '2025-11-15'), T).next.then).toEqual(photos);
  });
  it('a shoot with no title gives an empty one', () => {
    expect(yearSince(person('june', 'regular', ['a']), shoot('a', '2025-11-15', { title: undefined }), T).next.year).toEqual({ shootId: 'a', shoot: '' });
    expect(yearSince(person('june', 'regular', ['a']), shoot('a', '2025-11-15', { title: 42 }), T).next.year.shoot).toBe('42');
  });
});

describe('takeYears', () => {
  it("gives the shoot's Regulars and Clients the move, and notes the shoot as seen", () => {
    const people = [person('reg', 'regular', ['a']), person('cli', 'client', ['x', 'a']), person('new', 'new', ['a']), person('pro', 'prospect', ['a']), person('gue', 'guest', ['a'])];
    const { changed, seen } = takeYears(people, [shoot('a', '2025-11-15')], T, ['old']);
    expect(changed.map((p) => p.id)).toEqual(['reg', 'cli']);
    expect(changed.every((p) => p.next.year.shootId === 'a' && p.next.due === T)).toBe(true);
    expect(seen).toEqual(['old', 'a']);
    expect(YEAR_GROUPS).toEqual(['regular', 'client']);
  });
  it('leaves out anyone let go, and anyone not on the shoot', () => {
    const people = [person('gone', 'regular', ['a'], { letGo: true }), person('else', 'regular', ['b']), { ...person('none', 'regular', []), shoots: undefined }];
    const { changed, seen } = takeYears(people, [shoot('a', '2025-11-15')], T);
    expect(changed).toEqual([]);
    expect(seen).toEqual(['a']);
  });
  it('someone on two shoots due changes once: the later shoot on top, the move they had after both', () => {
    const { changed } = takeYears([person('june', 'regular', ['a', 'b'])], [shoot('b', '2025-11-10', { title: 'Beach day' }), shoot('a', '2025-10-20')], T);
    expect(changed).toHaveLength(1);
    expect(changed[0].next.year).toEqual({ shootId: 'b', shoot: 'Beach day' });
    expect(changed[0].next.then).toEqual(move('checkin', '2026-12-20'));
  });
  it('changes no one, and notes nothing new, when no shoot is due', () => {
    expect(takeYears([person('june', 'regular', ['a'])], [shoot('a', '2025-11-15')], T, ['a'])).toEqual({ changed: [], seen: ['a'] });
    expect(takeYears([], [], T)).toEqual({ changed: [], seen: [] });
    expect(takeYears([person('june', 'regular', ['a'])], undefined, T)).toEqual({ changed: [], seen: [] });
  });
});
