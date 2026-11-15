// rounds/data/year-tally.js: Rounds' part of the year page (round 2,
// connect/15): people pitched, yeses, and WHAT LED TO WORK.
import { describe, it, expect } from 'vitest';
import { yesesOf, bookingsOf, ledBy, ledLine, yearTally, WITHIN, LED_WORDS } from '../../../rounds/data/year-tally.js';
import { KINDS, markSvg } from '../../../rounds/data/kinds.js';

const line = (personId, kind, day, at = 0) => ({ id: `${personId}-${kind}-${day}`, personId, kind, day, at });
const yes = (id, on, more = {}) => ({ id, name: id, group: 'client', pitch: { answer: 'yes', on }, shoots: [], ...more });
const shoot = (id, date, status = 'delivered') => ({ id, date, status });

describe('yesesOf', () => {
  it('is everyone whose answer was yes, on its day', () => {
    expect(yesesOf([yes('a', '2026-05-01'), yes('b', '2026-06-01')])).toEqual([{ id: 'a', day: '2026-05-01' }, { id: 'b', day: '2026-06-01' }]);
  });
  it('leaves out other answers, no answer and an answer with no day', () => {
    expect(yesesOf([{ id: 'a', pitch: { answer: 'no', on: '2026-05-01' } }, { id: 'b' }, { id: 'c', pitch: { answer: 'yes', on: '' } }, { id: 'd', pitch: null }])).toEqual([]);
  });
  it('is no one for no people', () => {
    expect(yesesOf([])).toEqual([]);
  });
});

describe('bookingsOf', () => {
  const shoots = [shoot('s1', '2026-01-10'), shoot('s2', '2026-04-02', 'editing'), shoot('s3', '2026-09-09'), shoot('s4', '2026-10-01', 'planning'), shoot('s5', '')];
  it("is each shoot someone was on after their first, by its day", () => {
    expect(bookingsOf([{ id: 'a', shoots: ['s3', 's1', 's2'] }], shoots)).toEqual([{ id: 'a', day: '2026-04-02' }, { id: 'a', day: '2026-09-09' }]);
  });
  it('is nothing for one shoot, shoots not shot yet, or shoots The Eye no longer has', () => {
    expect(bookingsOf([{ id: 'a', shoots: ['s1'] }, { id: 'b', shoots: ['s4', 's1', 's5', 'gone'] }, { id: 'c' }], shoots)).toEqual([]);
  });
  it('is nothing with no shoots at all', () => {
    expect(bookingsOf([{ id: 'a', shoots: ['s1', 's2'] }], undefined)).toEqual([]);
    expect(bookingsOf([{ id: 'a', shoots: ['s1', 's2'] }], [null])).toEqual([]);
  });
});

describe('ledBy', () => {
  it('is the last move done with them on or before the day', () => {
    const lines = [line('a', 'pitch', '2026-03-01'), line('a', 'followup', '2026-03-08'), line('a', 'checkin', '2026-03-20'), line('b', 'intros', '2026-03-09')];
    expect(ledBy(lines, { id: 'a', day: '2026-03-10' }).kind).toBe('followup');
    expect(ledBy(lines, { id: 'a', day: '2026-03-08' }).kind).toBe('followup');
  });
  it('takes the later of two the same day, and skips the thank-yous', () => {
    const lines = [line('a', 'pitch', '2026-03-01', 2), line('a', 'hello', '2026-03-01', 1), line('a', 'thanks', '2026-03-02'), line('a', 'yes', '2026-03-03')];
    expect(ledBy(lines, { id: 'a', day: '2026-03-05' }).kind).toBe('pitch');
  });
  it('is none for a move more than three months before, after, or none at all', () => {
    expect(WITHIN).toBe(90);
    expect(ledBy([line('a', 'pitch', '2026-01-01')], { id: 'a', day: '2026-04-02' })).toBe(null);
    expect(ledBy([line('a', 'pitch', '2026-01-01')], { id: 'a', day: '2026-04-01' }).kind).toBe('pitch');
    expect(ledBy([line('a', 'pitch', '2026-05-01')], { id: 'a', day: '2026-04-01' })).toBe(null);
    expect(ledBy([line('a', 'odd', '2026-03-01'), line('a', 'pitch', '')], { id: 'a', day: '2026-04-01' })).toBe(null);
    expect(ledBy([], { id: 'a', day: '2026-04-01' })).toBe(null);
  });
});

describe('ledLine', () => {
  it('says how many were sent, how many of the yeses and how many booked again', () => {
    expect(ledLine({ sent: 11, yes: 2, booked: 1 }, 6)).toBe('11 sent, 2 of the 6 yeses, 1 booked again');
    expect(ledLine({ sent: 4, booked: 1 }, 6)).toBe('4 sent, 1 booked again');
  });
  it('says all of them when it led to every yes', () => {
    expect(ledLine({ sent: 3, yes: 2 }, 2)).toBe('3 sent, all 2 yeses');
    expect(ledLine({ sent: 1, yes: 1 }, 1)).toBe('1 sent, 1 yes');
  });
  it('leaves out what is nothing', () => {
    expect(ledLine({ yes: 1 }, 3)).toBe('1 of the 3 yeses');
    expect(ledLine({}, 0)).toBe('');
  });
});

describe('yearTally', () => {
  it("counts each year's people pitched (once a year each) and yeses, and what led to work", () => {
    const people = [
      yes('a', '2026-03-05', { pitched: '2026-03-01' }), // pitched, then yes
      yes('b', '2026-06-02', { pitched: '2026-05-20' }),
      { id: 'c', name: 'c', group: 'prospect', pitched: '2025-12-01', pitch: { answer: 'no', on: '2025-12-09' }, shoots: [] },
      { id: 'd', name: 'd', group: 'regular', shoots: ['s1', 's2'] }, // booked again after a check in
      yes('e', '2026-07-01'), // a yes with nothing before it
    ];
    const lines = [
      line('a', 'pitch', '2026-03-01'), line('a', 'yes', '2026-03-05'),
      line('b', 'pitch', '2026-05-20'), line('b', 'followup', '2026-05-27'),
      line('c', 'pitch', '2025-12-01'), line('c', 'pitch', '2026-02-01'),
      line('d', 'checkin', '2026-08-01'), line('d', 'checkin', '2025-11-01'),
      null, line('x', 'pitch', 'never'),
    ];
    const shoots = [shoot('s1', '2025-10-01'), shoot('s2', '2026-09-15')];
    const t = yearTally(people, lines, shoots);
    expect(Object.keys(t).sort()).toEqual(['2025', '2026']);
    expect(t[2026]).toMatchObject({ pitched: 3, yes: 3 });
    // (As many each: in the order Today takes the kinds.)
    expect(t[2026].led).toEqual([
      { title: 'Check ins', line: '1 sent, 1 booked again', bg: KINDS.checkin.bg, icon: markSvg('checkin', 10) },
      { title: 'Follow ups', line: '1 sent, 1 of the 3 yeses', bg: KINDS.followup.bg, icon: markSvg('followup', 10) },
      { title: 'Pitches', line: '3 sent, 1 of the 3 yeses', bg: KINDS.pitch.bg, icon: markSvg('pitch', 10) },
    ]);
    expect(t[2025]).toEqual({ pitched: 1, led: [] });
  });
  it('puts the kinds that led to most first', () => {
    const people = [yes('a', '2026-03-05'), yes('b', '2026-03-06'), yes('c', '2026-03-07')];
    const lines = [line('a', 'intros', '2026-03-01'), line('b', 'intros', '2026-03-01'), line('c', 'pitch', '2026-03-01')];
    expect(yearTally(people, lines, [])['2026'].led.map((r) => r.title)).toEqual(['Asking past clients for intros', 'Pitches']);
  });
  it('a move one year can lead to work the next; a year can have bookings and no yeses, or a pitch and no log', () => {
    const people = [
      yes('a', '2026-01-10'), // pitched in December, yes in January
      { id: 'b', name: 'b', group: 'regular', shoots: ['s1', 's2'] },
      { id: 'c', name: 'c', group: 'prospect', pitched: '2024-04-04', shoots: [] }, // pitched before the log kept days
    ];
    const lines = [{ personId: 'a', kind: 'pitch', day: '2025-12-20' }, { personId: 'b', kind: 'photos', day: '2027-02-01' }, { personId: 'b', kind: 'hello', day: '2027-02-01' }];
    const t = yearTally(people, lines, [shoot('s1', '2026-05-01'), shoot('s2', '2027-03-01')]);
    expect(t[2026]).toEqual({ yes: 1, led: [{ title: 'Pitches', line: '1 yes', bg: KINDS.pitch.bg, icon: markSvg('pitch', 10) }] });
    expect(t[2025]).toEqual({ pitched: 1, led: [] });
    expect(t[2027].led.map((r) => [r.title, r.line])).toEqual([['Saying hello', '1 sent, 1 booked again']]);
    expect(t[2024]).toEqual({ pitched: 1, led: [] });
  });
  it('a year with only moves sent has its count of nothing, and no rows', () => {
    expect(yearTally([{ id: 'a', shoots: [] }], [line('a', 'hello', '2026-02-02')], [])).toEqual({ 2026: { led: [] } });
  });
  it('is nothing with no people and no log', () => {
    expect(yearTally([], [], [])).toEqual({});
    expect(yearTally([], undefined, undefined)).toEqual({});
  });
  it('names every kind that can lead to work', () => {
    expect(Object.keys(LED_WORDS)).toEqual(['pitch', 'followup', 'intros', 'refresh', 'checkin', 'photos', 'hello']);
  });
});
