// rounds/data/work-days.js: a Pitch or Follow up only comes up on a work day
// (Monday to Friday unless changed); everything else, any day.
import { describe, it, expect } from 'vitest';
import { WORK_DAYS, EVERY_DAY, WORK_ONLY, WEEK, workDaysOf, toggleDay, whenDue, comesUp } from '../../../rounds/data/work-days.js';

const SAT = '2026-11-14';
const SUN = '2026-11-15';
const MON = '2026-11-16';
const FRI = '2026-11-20';
const LAST_FRI = '2026-11-13';
const move = (kind, due) => ({ kind, due, step: 0 });

describe('the days', () => {
  it('are Monday to Friday unless changed; the chips go Monday first', () => {
    expect(WORK_DAYS).toEqual([1, 2, 3, 4, 5]);
    expect(EVERY_DAY).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(WORK_ONLY).toEqual(['pitch', 'followup']);
    expect(WEEK.map(([d]) => d)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    expect(WEEK.map(([, n]) => n)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('workDaysOf', () => {
  it('keeps the days saved, in order, each once', () => {
    expect(workDaysOf([6, 1, 3, 1])).toEqual([1, 3, 6]);
    expect(workDaysOf([0])).toEqual([0]);
    expect(workDaysOf([10, 0, 2])).toEqual([0, 2]);
    expect(workDaysOf(EVERY_DAY)).toEqual(EVERY_DAY);
  });
  it('is Monday to Friday with nothing saved, or none at all', () => {
    expect(workDaysOf(null)).toEqual(WORK_DAYS);
    expect(workDaysOf(undefined)).toEqual(WORK_DAYS);
    expect(workDaysOf([])).toEqual(WORK_DAYS);
  });
  it('leaves out anything that is not a day', () => {
    expect(workDaysOf([-1, 7, 1.5, '2', null, 4])).toEqual([4]);
    expect(workDaysOf(['x', 9])).toEqual(WORK_DAYS);
    expect(workDaysOf('1,2')).toEqual(WORK_DAYS);
    expect(workDaysOf({ 0: 1 })).toEqual(WORK_DAYS);
  });
  it('gives a fresh list each time', () => {
    const a = workDaysOf(null);
    a.push(6);
    expect(workDaysOf(null)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('toggleDay', () => {
  it('turns a day on, in order', () => {
    expect(toggleDay(WORK_DAYS, 6)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(toggleDay([2, 4], 0)).toEqual([0, 2, 4]);
    expect(toggleDay([1, 2, 3, 4, 5, 6], 0)).toEqual(EVERY_DAY);
  });
  it('turns a day off', () => {
    expect(toggleDay(WORK_DAYS, 3)).toEqual([1, 2, 4, 5]);
    expect(toggleDay([0, 6], 0)).toEqual([6]);
  });
  it('keeps the last day on', () => {
    expect(toggleDay([2], 2)).toEqual([2]);
  });
  it('starts from Monday to Friday when nothing was saved', () => {
    expect(toggleDay(null, 5)).toEqual([1, 2, 3, 4]);
    expect(toggleDay(undefined, 0)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

describe('whenDue', () => {
  it('a Pitch or Follow up due on a day off waits for the next work day', () => {
    expect(whenDue(move('pitch', SAT), WORK_DAYS)).toBe(MON);
    expect(whenDue(move('followup', SUN), WORK_DAYS)).toBe(MON);
    expect(whenDue(move('pitch', SAT), null)).toBe(MON);
  });
  it('one due on a work day stays', () => {
    expect(whenDue(move('pitch', MON), WORK_DAYS)).toBe(MON);
    expect(whenDue(move('followup', FRI), WORK_DAYS)).toBe(FRI);
    expect(whenDue(move('pitch', SAT), EVERY_DAY)).toBe(SAT);
  });
  it('waits across a month and a year end', () => {
    expect(whenDue(move('pitch', '2026-11-28'), [2])).toBe('2026-12-01');
    expect(whenDue(move('followup', '2026-12-26'), WORK_DAYS)).toBe('2026-12-28');
    expect(whenDue(move('pitch', '2027-01-01'), [4])).toBe('2027-01-07');
  });
  it('the other moves come up any day', () => {
    for (const kind of ['thanks', 'hello', 'checkin', 'intros', 'refresh']) expect(whenDue(move(kind, SAT), WORK_DAYS)).toBe(SAT);
  });
  it('one waiting since a work day comes up on the next work day from today', () => {
    expect(whenDue(move('followup', LAST_FRI), WORK_DAYS, SAT)).toBe(MON);
    expect(whenDue(move('pitch', LAST_FRI), WORK_DAYS, MON)).toBe(MON);
    expect(whenDue(move('pitch', LAST_FRI), WORK_DAYS, LAST_FRI)).toBe(LAST_FRI);
    expect(whenDue(move('pitch', FRI), WORK_DAYS, SAT)).toBe(FRI);
    expect(whenDue(move('thanks', LAST_FRI), WORK_DAYS, SAT)).toBe(LAST_FRI);
  });
  it('no move: no day', () => {
    expect(whenDue(null, WORK_DAYS)).toBe('');
    expect(whenDue(undefined, WORK_DAYS)).toBe('');
  });
});

describe('comesUp', () => {
  it('a Pitch or Follow up only on a work day, even one waiting since Friday', () => {
    expect(comesUp(move('followup', LAST_FRI), SAT, WORK_DAYS)).toBe(false);
    expect(comesUp(move('followup', LAST_FRI), MON, WORK_DAYS)).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, WORK_DAYS)).toBe(false);
    expect(comesUp(move('pitch', SAT), SUN, WORK_DAYS)).toBe(false);
    expect(comesUp(move('pitch', SAT), MON, WORK_DAYS)).toBe(true);
    expect(comesUp(move('followup', FRI), FRI, WORK_DAYS)).toBe(true);
  });
  it('with Saturday on, it comes up on Saturday', () => {
    expect(comesUp(move('followup', LAST_FRI), SAT, [1, 2, 3, 4, 5, 6])).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, EVERY_DAY)).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, null)).toBe(false);
  });
  it('not before it is due', () => {
    expect(comesUp(move('pitch', FRI), MON, WORK_DAYS)).toBe(false);
    expect(comesUp(move('thanks', SUN), SAT, WORK_DAYS)).toBe(false);
  });
  it('the other moves any day they are due', () => {
    expect(comesUp(move('thanks', SAT), SAT, WORK_DAYS)).toBe(true);
    expect(comesUp(move('checkin', LAST_FRI), SUN, WORK_DAYS)).toBe(true);
  });
  it('no move never comes up', () => {
    expect(comesUp(null, SAT, WORK_DAYS)).toBe(false);
    expect(comesUp(undefined, MON, EVERY_DAY)).toBe(false);
  });
});
