// rounds/data/work-days.js: a Pitch or Follow up only comes up on a work day
// (Monday to Friday unless changed); everything else, any day but a day off
// (Sunday unless changed), when nothing comes up at all.
import { describe, it, expect } from 'vitest';
import { WORK_DAYS, DAYS_OFF, EVERY_DAY, ANY_DAY, WORK_ONLY, WEEK, workDaysOf, daysOffOf, weekOf, toggleDay, toggleOff, whenDue, comesUp } from '../../../rounds/data/work-days.js';

const SAT = '2026-11-14';
const SUN = '2026-11-15';
const MON = '2026-11-16';
const FRI = '2026-11-20';
const LAST_FRI = '2026-11-13';
const move = (kind, due) => ({ kind, due, step: 0 });
// Work days only, none off (as before days off).
const only = (work) => ({ work, off: [] });
const MON_FRI = only(WORK_DAYS);

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
    expect(whenDue(move('pitch', SAT), MON_FRI)).toBe(MON);
    expect(whenDue(move('followup', SUN), MON_FRI)).toBe(MON);
    expect(whenDue(move('pitch', SAT), weekOf(null, []))).toBe(MON);
  });
  it('one due on a work day stays', () => {
    expect(whenDue(move('pitch', MON), MON_FRI)).toBe(MON);
    expect(whenDue(move('followup', FRI), MON_FRI)).toBe(FRI);
    expect(whenDue(move('pitch', SAT), ANY_DAY)).toBe(SAT);
  });
  it('waits across a month and a year end', () => {
    expect(whenDue(move('pitch', '2026-11-28'), only([2]))).toBe('2026-12-01');
    expect(whenDue(move('followup', '2026-12-26'), MON_FRI)).toBe('2026-12-28');
    expect(whenDue(move('pitch', '2027-01-01'), only([4]))).toBe('2027-01-07');
  });
  it('the other moves come up any day', () => {
    for (const kind of ['thanks', 'hello', 'checkin', 'intros', 'refresh']) expect(whenDue(move(kind, SAT), MON_FRI)).toBe(SAT);
  });
  it('one waiting since a work day comes up on the next work day from today', () => {
    expect(whenDue(move('followup', LAST_FRI), MON_FRI, SAT)).toBe(MON);
    expect(whenDue(move('pitch', LAST_FRI), MON_FRI, MON)).toBe(MON);
    expect(whenDue(move('pitch', LAST_FRI), MON_FRI, LAST_FRI)).toBe(LAST_FRI);
    expect(whenDue(move('pitch', FRI), MON_FRI, SAT)).toBe(FRI);
    expect(whenDue(move('thanks', LAST_FRI), MON_FRI, SAT)).toBe(LAST_FRI);
  });
  it('no move: no day', () => {
    expect(whenDue(null, MON_FRI)).toBe('');
    expect(whenDue(undefined, MON_FRI)).toBe('');
  });
});

describe('comesUp', () => {
  it('a Pitch or Follow up only on a work day, even one waiting since Friday', () => {
    expect(comesUp(move('followup', LAST_FRI), SAT, MON_FRI)).toBe(false);
    expect(comesUp(move('followup', LAST_FRI), MON, MON_FRI)).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, MON_FRI)).toBe(false);
    expect(comesUp(move('pitch', SAT), SUN, MON_FRI)).toBe(false);
    expect(comesUp(move('pitch', SAT), MON, MON_FRI)).toBe(true);
    expect(comesUp(move('followup', FRI), FRI, MON_FRI)).toBe(true);
  });
  it('with Saturday on, it comes up on Saturday', () => {
    expect(comesUp(move('followup', LAST_FRI), SAT, only([1, 2, 3, 4, 5, 6]))).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, ANY_DAY)).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, weekOf(null, []))).toBe(false);
  });
  it('not before it is due', () => {
    expect(comesUp(move('pitch', FRI), MON, MON_FRI)).toBe(false);
    expect(comesUp(move('thanks', SUN), SAT, MON_FRI)).toBe(false);
  });
  it('the other moves any day they are due', () => {
    expect(comesUp(move('thanks', SAT), SAT, MON_FRI)).toBe(true);
    expect(comesUp(move('checkin', LAST_FRI), SUN, MON_FRI)).toBe(true);
  });
  it('no move never comes up', () => {
    expect(comesUp(null, SAT, MON_FRI)).toBe(false);
    expect(comesUp(undefined, MON, ANY_DAY)).toBe(false);
  });
});

describe('days off', () => {
  const WEEKLY = weekOf(null, null); // Monday to Friday, Sunday off
  it('Sunday off unless changed; none at all is allowed', () => {
    expect(DAYS_OFF).toEqual([0]);
    expect(daysOffOf(null)).toEqual([0]);
    expect(daysOffOf(undefined)).toEqual([0]);
    expect(daysOffOf('0')).toEqual([0]);
    expect(daysOffOf([])).toEqual([]);
    expect(daysOffOf([6, 0, 6, 'x', 7, -1, 1.5])).toEqual([0, 6]);
  });
  it('a week: the work days and days off as saved', () => {
    expect(WEEKLY).toEqual({ work: [1, 2, 3, 4, 5], off: [0] });
    expect(weekOf([6, 1], [])).toEqual({ work: [1, 6], off: [] });
    expect(ANY_DAY).toEqual({ work: EVERY_DAY, off: [] });
  });
  it('a day off chip: on, and off again', () => {
    expect(toggleOff(null, 6, null)).toEqual([0, 6]);
    expect(toggleOff([0, 6], 6, null)).toEqual([0]);
    expect(toggleOff(null, 0, null)).toEqual([]);
    expect(toggleOff([], 3, [1, 3])).toEqual([3]);
  });
  it("never the last work day that isn't off", () => {
    expect(toggleOff([3], 1, [1, 3])).toEqual([3]);
    expect(toggleOff(null, 2, [2])).toEqual([0]);
    expect(toggleOff([0, 1, 2, 3, 4, 5], 6, EVERY_DAY)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("a work day chip keeps one work day that isn't off", () => {
    expect(toggleDay([0, 2], 2, [0])).toEqual([0, 2]);
    expect(toggleDay([0, 2], 0, [0])).toEqual([2]);
    expect(toggleDay([0, 2], 2, [])).toEqual([0]);
    expect(toggleDay([0, 2], 2)).toEqual([0]);
  });
  it('nothing comes up on a day off: it waits for the next day', () => {
    for (const kind of ['thanks', 'hello', 'checkin', 'intros']) {
      expect(whenDue(move(kind, SUN), WEEKLY)).toBe(MON);
      expect(comesUp(move(kind, SUN), SUN, WEEKLY)).toBe(false);
      expect(comesUp(move(kind, SUN), MON, WEEKLY)).toBe(true);
    }
  });
  it('one overdue on a day off waits too, then reads as overdue again', () => {
    expect(whenDue(move('thanks', LAST_FRI), WEEKLY, SUN)).toBe(MON);
    expect(comesUp(move('thanks', LAST_FRI), SUN, WEEKLY)).toBe(false);
    expect(whenDue(move('thanks', LAST_FRI), WEEKLY, MON)).toBe(LAST_FRI);
    expect(whenDue(move('thanks', LAST_FRI), WEEKLY, SAT)).toBe(LAST_FRI);
  });
  it('Saturday: personal moves, no Pitch or Follow up', () => {
    expect(comesUp(move('thanks', SAT), SAT, WEEKLY)).toBe(true);
    expect(comesUp(move('pitch', SAT), SAT, WEEKLY)).toBe(false);
    expect(whenDue(move('pitch', SAT), WEEKLY)).toBe(MON);
  });
  it('a day off wins over a work day', () => {
    const sundays = { work: [0, 1], off: [0] };
    expect(whenDue(move('pitch', SUN), sundays)).toBe(MON);
    expect(comesUp(move('followup', SUN), SUN, sundays)).toBe(false);
  });
  it('a week where no day fits (saved on another device): due as it is', () => {
    const none = { work: [0], off: [0] };
    expect(whenDue(move('pitch', SAT), none)).toBe(SAT);
    expect(whenDue(move('pitch', LAST_FRI), none, MON)).toBe(MON);
    expect(whenDue(move('thanks', SUN), { work: [1], off: EVERY_DAY })).toBe(SUN);
  });
  it('across a month end', () => {
    expect(whenDue(move('hello', '2026-11-29'), WEEKLY)).toBe('2026-11-30');
    expect(whenDue(move('followup', '2026-12-26'), WEEKLY)).toBe('2026-12-28');
  });
});
