// rounds/data/next-up.js: the line under "That's today." once the day's
// cards are all done (rounds/13): who's next, and when.
import { describe, it, expect } from 'vitest';
import { nextUp, nextUpWords, NOTHING_SOON } from '../../../rounds/data/next-up.js';
import { ANY_DAY } from '../../../rounds/data/work-days.js';

const T = '2026-11-16'; // a Monday
const week = { work: [1, 2, 3, 4, 5], off: [0] };
const p = (name, kind, due, o = {}) => ({ id: name, name, letGo: false, next: kind ? { kind, due, step: 0 } : null, ...o });

describe('nextUp', () => {
  it('the first move after today; let go and nothing planned left out', () => {
    const people = [p('Bo', 'checkin', '2026-11-20'), p('Ana L.', 'checkin', '2026-11-17'), p('Cy', 'hello', '2026-11-17', { letGo: true }), p('Di', null, null)];
    expect(nextUp(people, week, T)).toEqual({ person: people[1], day: '2026-11-17' });
    expect(nextUp([], week, T)).toBe(null);
    expect(nextUp([people[2], people[3]], week, T)).toBe(null);
  });
  it('anything due today or before that is still waiting comes up tomorrow', () => {
    const people = [p('Ana', 'checkin', '2026-11-10'), p('Bo', 'hello', T)];
    expect(nextUp(people, week, T).day).toBe('2026-11-17');
  });
  it('days off and work days count: a Pitch waits for a work day, nothing on a Sunday', () => {
    const sat = '2026-11-21';
    expect(nextUp([p('Ana', 'pitch', '2026-11-22')], week, sat).day).toBe('2026-11-23');
    expect(nextUp([p('Ana', 'checkin', '2026-11-20')], week, sat).day).toBe('2026-11-23');
    expect(nextUp([p('Ana', 'pitch', '2026-11-21')], week, '2026-11-20').day).toBe('2026-11-23');
    expect(nextUp([p('Ana', 'checkin', '2026-11-21')], week, '2026-11-20').day).toBe('2026-11-21');
  });
  it('on the same day, the most timely kind, then the longest waiting, then by name', () => {
    expect(nextUp([p('Bo', 'pitch', T), p('Cy', 'thanks', '2026-11-17')], ANY_DAY, T).person.name).toBe('Cy');
    expect(nextUp([p('Bo', 'checkin', '2026-11-17'), p('Cy', 'checkin', '2026-11-12')], ANY_DAY, T).person.name).toBe('Cy');
    expect(nextUp([p('Cy', 'checkin', '2026-11-17'), p('Bo', 'checkin', '2026-11-17')], ANY_DAY, T).person.name).toBe('Bo');
  });
});

describe('nextUpWords', () => {
  it('tomorrow, or the day this week, with the move and their name', () => {
    expect(nextUpWords([p('Ana L.', 'checkin', '2026-11-17')], week, T)).toBe('Next up tomorrow: a check-in with Ana L.');
    expect(nextUpWords([p('June', 'pitch', '2026-11-19')], week, T)).toBe('Next up Thursday: a pitch to June.');
    expect(nextUpWords([p('June', 'checkin', '2026-11-22')], ANY_DAY, T)).toBe('Next up Sunday: a check-in with June.');
  });
  it('each kind in words', () => {
    const say = (kind, o = {}) => nextUpWords([p('June', kind, '2026-11-17', o)], ANY_DAY, T);
    expect(['thanks', 'yes', 'photos', 'hello', 'checkin', 'intros', 'refresh', 'followup', 'pitch', 'odd'].map((k) => say(k).replace('Next up tomorrow: ', ''))).toEqual([
      'a thank-you to June.', 'a thank-you for the yes to June.', 'telling June the photos are up.', 'a hello to June.',
      'a check-in with June.', 'asking June for intros.', 'a refresh offer to June.', 'a follow-up with June.', 'a pitch to June.', 'a move with June.',
    ]);
    expect(nextUpWords([{ ...p('June', 'checkin', '2026-11-17'), next: { kind: 'checkin', due: '2026-11-17', step: 0, year: 2025 } }], ANY_DAY, T)).toBe('Next up tomorrow: a final for June, a year on.');
  });
  it('nothing in the coming week, or no one: Nothing due this week.', () => {
    expect(NOTHING_SOON).toBe('Nothing due this week.');
    expect(nextUpWords([p('June', 'checkin', '2026-11-22')], ANY_DAY, T)).not.toBe(NOTHING_SOON);
    expect(nextUpWords([p('June', 'checkin', '2026-11-23')], ANY_DAY, T)).toBe(NOTHING_SOON);
    expect(nextUpWords([], ANY_DAY, T)).toBe(NOTHING_SOON);
  });
});
