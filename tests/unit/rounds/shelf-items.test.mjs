// rounds/data/shelf-items.js: the cards Rounds tells the shelf about, each
// for its day, so the floating ! shows on a day with cards.
import { describe, it, expect } from 'vitest';
import { shelfItems, DAYS_AHEAD } from '../../../rounds/data/shelf-items.js';
import { ANY_DAY } from '../../../rounds/data/work-days.js';

const T = '2026-11-14';
const p = (id, kind, due, more = {}) => ({ id, name: `${id} name`, added: '2026-11-01', letGo: false, next: kind ? { kind, due, step: 0 } : null, ...more });
const item = (id, line, day) => ({ title: `${id} name`, line, from: day, until: day, params: { at: 'today' } });

describe('shelfItems', () => {
  it("today's cards still to do, then each day's as things stand, two weeks ahead", () => {
    const people = [p('a', 'thanks', T), p('b', 'checkin', '2026-11-15'), p('c', 'pitch', '2026-12-01'), p('d', null)];
    const items = shelfItems(people, null, T, 3, ANY_DAY);
    expect(DAYS_AHEAD).toBe(14);
    expect(items.filter((x) => x.from === T)).toEqual([item('a', 'Say thanks', T)]);
    // Nothing done, a card stays on the days after too; the next day brings b as well.
    expect(items.filter((x) => x.from === '2026-11-15')).toEqual([item('a', 'Say thanks', '2026-11-15'), item('b', 'Check in', '2026-11-15')]);
    expect(items[items.length - 1].from).toBe('2026-11-27');
    expect(items.some((x) => x.title === 'c name')).toBe(false);
  });
  it("leaves out today's cards already done or put off, and keeps to the day's limit", () => {
    const people = [p('a', 'thanks', T), p('b', 'hello', T), p('c', 'pitch', T)];
    const saved = { date: T, ids: ['a', 'b'], marks: { a: 'done' } };
    expect(shelfItems(people, saved, T, 2, ANY_DAY, 1)).toEqual([item('b', 'Say hello', T)]);
    expect(shelfItems(people, null, T, 1, ANY_DAY, 1)).toEqual([item('a', 'Say thanks', T)]);
  });
  it('names A year since as itself', () => {
    const people = [p('a', 'checkin', T, { next: { kind: 'checkin', due: T, step: 0, year: { shootId: 's1', shoot: 'Rooftop portraits' } } })];
    expect(shelfItems(people, null, T, 3, ANY_DAY, 1)).toEqual([item('a', 'A year since', T)]);
  });
  it('nothing on days off, and nothing for no one', () => {
    const week = { work: [1, 2, 3, 4, 5], off: [0, 6] };
    expect(shelfItems([p('a', 'thanks', T)], null, T, 3, week, 1)).toEqual([]); // the 14th is a Saturday
    expect(shelfItems([], null, T, 3, ANY_DAY)).toEqual([]);
    expect(shelfItems([p('a', 'thanks', T)], null, T, 3, ANY_DAY, 0)).toEqual([]);
  });
});
