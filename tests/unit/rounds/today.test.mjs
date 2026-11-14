// rounds/data/today.js: the day's moves, three a day (at most five), the pick fixed for the day.
import { describe, it, expect } from 'vitest';
import { PER_DAY, MOST, perDayOf, dueOn, pickFor, waiting, markPick, unmarkPick, doneOn, stops } from '../../../rounds/data/today.js';

const T = '2026-11-14';
const p = (id, kind, due, more = {}) => ({ id, name: id, added: '2026-11-01', letGo: false, next: kind ? { kind, due, step: 0 } : null, ...more });

describe('perDayOf', () => {
  it('is three unless set, from one to five', () => {
    expect([PER_DAY, MOST]).toEqual([3, 5]);
    expect(perDayOf(undefined)).toBe(3);
    expect(perDayOf('x')).toBe(3);
    expect(perDayOf(0)).toBe(3);
    expect(perDayOf(-2)).toBe(1);
    expect(perDayOf(1)).toBe(1);
    expect(perDayOf('2')).toBe(2);
    expect(perDayOf(4.7)).toBe(4);
    expect(perDayOf(5)).toBe(5);
    expect(perDayOf(9)).toBe(5);
  });
});

describe('dueOn', () => {
  it('takes only moves due, of people not let go', () => {
    const list = [p('a', 'pitch', T), p('b', 'pitch', '2026-11-15'), p('c', null), p('d', 'pitch', T, { letGo: true }), p('e', 'pitch', '2026-11-01')];
    expect(dueOn(list, T).map((x) => x.id)).toEqual(['e', 'a']);
  });
  it('puts the most timely kind first, then the longest waiting, the first added, then by name', () => {
    const list = [
      p('pitch', 'pitch', '2026-11-01'), p('thanks', 'thanks', T), p('hello', 'hello', T), p('check2', 'checkin', T),
      p('check1', 'checkin', '2026-11-10'), p('zed', 'checkin', T, { added: '2026-10-01' }), p('amy', 'checkin', T, { added: '2026-10-01' }),
    ];
    expect(dueOn(list, T).map((x) => x.id)).toEqual(['thanks', 'hello', 'check1', 'amy', 'zed', 'check2', 'pitch']);
  });
});

describe('pickFor', () => {
  const people = [p('a', 'thanks', T), p('b', 'hello', T), p('c', 'checkin', T), p('d', 'pitch', T)];
  it('picks the day\'s first moves, as many as the day allows', () => {
    expect(pickFor(people, null, T)).toEqual({ date: T, ids: ['a', 'b', 'c'], marks: {} });
    expect(pickFor(people, null, T, 1).ids).toEqual(['a']);
    expect(pickFor(people, { date: '2026-11-13', ids: ['d'], marks: { d: 'done' } }, T, 2)).toEqual({ date: T, ids: ['a', 'b'], marks: {} });
  });
  it('keeps the day\'s pick, done ones too, and tops it up while there\'s room', () => {
    const later = [{ ...people[0], next: { kind: 'checkin', due: '2026-12-26' } }, ...people.slice(1)];
    const saved = { date: T, ids: ['a', 'd'], marks: { a: 'done' } };
    expect(pickFor(later, saved, T)).toEqual({ date: T, ids: ['a', 'd', 'b'], marks: { a: 'done' } });
    expect(saved.marks).toEqual({ a: 'done' });
  });
  it('never takes more once the day is full', () => {
    const saved = { date: T, ids: ['d', 'c', 'b'], marks: {} };
    expect(pickFor(people, saved, T).ids).toEqual(['d', 'c', 'b']);
    expect(pickFor(people, saved, T, 2).ids).toEqual(['d', 'c', 'b']);
  });
  it('drops anyone gone, let go, or no longer due without being marked', () => {
    const now = [p('a', 'thanks', T, { letGo: true }), p('b', 'hello', '2026-11-20'), p('c', 'checkin', T)];
    expect(pickFor(now, { date: T, ids: ['x', 'a', 'b', 'c'], marks: {} }, T, 5).ids).toEqual(['c']);
  });
});

describe('waiting, markPick and unmarkPick', () => {
  const pick = { date: T, ids: ['a', 'b', 'c'], marks: { a: 'done' } };
  it('lists the cards still to do, in order', () => {
    expect(waiting(pick)).toEqual(['b', 'c']);
  });
  it('marks and unmarks a card without changing the old pick', () => {
    const later = markPick(pick, 'b', 'later');
    expect(later.marks).toEqual({ a: 'done', b: 'later' });
    expect(waiting(later)).toEqual(['c']);
    expect(pick.marks).toEqual({ a: 'done' });
    const back = unmarkPick(later, 'a');
    expect(back).toEqual({ date: T, ids: ['a', 'b', 'c'], marks: { b: 'later' } });
    expect(later.marks).toEqual({ a: 'done', b: 'later' });
  });
});

describe('stops', () => {
  it('puts one stop at the top of the arc', () => {
    expect(stops(1)).toEqual([{ x: 40, y: 6 }]);
  });
  it('spreads three as in the mockup, and five', () => {
    expect(stops(3)).toEqual([{ x: 16, y: 16 }, { x: 40, y: 6 }, { x: 64, y: 16 }]);
    expect(stops(5)).toEqual([{ x: 16, y: 16 }, { x: 27, y: 8.6 }, { x: 40, y: 6 }, { x: 53, y: 8.6 }, { x: 64, y: 16 }]);
  });
  it('has none for none', () => {
    expect(stops(0)).toEqual([]);
  });
});

describe('doneOn', () => {
  const people = [p('a', 'followup', '2026-11-21'), p('b', 'checkin', '2026-12-26'), p('c', null, null), p('gone', 'pitch', T, { letGo: true })];
  const line = (id, personId, day, at, kind = 'pitch') => ({ id, personId, kind, day, ...(at === undefined ? {} : { at }) });
  it("lists the day's done moves, the newest first, with who they were for", () => {
    const lines = [line('1', 'a', T, 100), line('2', 'b', T, 300, 'thanks'), line('3', 'c', T, 200, 'hello')];
    const done = doneOn(lines, people, T);
    expect(done.map((d) => d.line.id)).toEqual(['2', '3', '1']);
    expect(done[0].person).toBe(people[1]);
  });
  it("only that day's, and only each person's latest", () => {
    const lines = [line('old', 'a', '2026-11-13', 900), line('1', 'a', T, 100), line('2', 'a', T, 200, 'followup'), line('3', 'b', T, 50)];
    expect(doneOn(lines, people, T).map((d) => d.line.id)).toEqual(['2', '3']);
    expect(doneOn([line('2', 'a', T, 200), line('1', 'a', T, 100)], people, T).map((d) => d.line.id)).toEqual(['2']);
  });
  it('lines from before 14 Nov (no time) come after, by name', () => {
    const lines = [line('c1', 'c', T), line('b1', 'b', T), line('a1', 'a', T, 5)];
    expect(doneOn(lines, people, T).map((d) => d.line.id)).toEqual(['a1', 'b1', 'c1']);
    expect(doneOn([line('x', 'a', T), line('y', 'a', T)], people, T).map((d) => d.line.id)).toEqual(['x']);
  });
  it('leaves out anyone let go or no longer here, and lines with no known move', () => {
    const lines = [line('1', 'gone', T, 1), line('2', 'nobody', T, 2), line('3', 'a', T, 3, 'wave'), line('4', 'b', T, 4, null)];
    expect(doneOn(lines, people, T)).toEqual([]);
  });
  it('is empty with no lines or no people', () => {
    expect(doneOn([], people, T)).toEqual([]);
    expect(doneOn([line('1', 'a', T, 1)], [], T)).toEqual([]);
  });
});

describe('work days (a Pitch or Follow up waits for one)', () => {
  const SAT = T; // 14 Nov 2026 is a Saturday
  const people = [p('pitch', 'pitch', SAT), p('fu', 'followup', '2026-11-13'), p('thanks', 'thanks', SAT)];
  it('on a day off, only the moves that come up any day are due', () => {
    expect(dueOn(people, SAT, [1, 2, 3, 4, 5]).map((x) => x.id)).toEqual(['thanks']);
    expect(dueOn(people, SAT).map((x) => x.id)).toEqual(['thanks', 'fu', 'pitch']);
    expect(dueOn(people, SAT, [6]).map((x) => x.id)).toEqual(['thanks', 'fu', 'pitch']);
  });
  it('on the next work day they come up', () => {
    expect(dueOn(people, '2026-11-16', [1, 2, 3, 4, 5]).map((x) => x.id)).toEqual(['thanks', 'fu', 'pitch']);
    expect(dueOn(people, '2026-11-15', [1, 2, 3, 4, 5]).map((x) => x.id)).toEqual(['thanks']);
  });
  it("the day's pick leaves them for a work day, and keeps what's already done", () => {
    expect(pickFor(people, null, SAT, 3, [1, 2, 3, 4, 5])).toEqual({ date: SAT, ids: ['thanks'], marks: {} });
    const saved = { date: SAT, ids: ['pitch', 'fu', 'thanks'], marks: { pitch: 'done' } };
    expect(pickFor(people, saved, SAT, 3, [1, 2, 3, 4, 5])).toEqual({ date: SAT, ids: ['pitch', 'thanks'], marks: { pitch: 'done' } });
    expect(pickFor(people, saved, SAT, 3).ids).toEqual(['pitch', 'fu', 'thanks']);
  });
});
