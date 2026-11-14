// rounds/data/dates.js: days as 'YYYY-MM-DD' in the phone's own time, and how they read.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { dayOf, dateOf, isDay, addDays, daysBetween, later, whenWords, dueWords, sinceWords } from '../../../rounds/data/dates.js';

afterEach(() => vi.useRealTimers());
const SAT = '2026-11-14'; // a Saturday

describe('dayOf and dateOf', () => {
  it('writes a date as its day, late at night too', () => {
    expect(dayOf(new Date(2026, 10, 14, 23, 59))).toBe(SAT);
    expect(dayOf(new Date(2026, 0, 5, 0, 1))).toBe('2026-01-05');
  });
  it('is today with no date given', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 8));
    expect(dayOf()).toBe('2026-12-31');
  });
  it('reads a day as noon that day', () => {
    const d = dateOf(SAT);
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 10, 14, 12]);
  });
});

describe('isDay', () => {
  it('takes only real days written in full', () => {
    expect(isDay(SAT)).toBe(true);
    expect(isDay('2024-02-29')).toBe(true);
    expect(isDay('2026-02-30')).toBe(false);
    expect(isDay('2026-1-05')).toBe(false);
    expect(isDay('2026-11-14x')).toBe(false);
    expect(isDay('x2026-11-14')).toBe(false);
    expect(isDay('')).toBe(false);
    expect(isDay(20261114)).toBe(false);
    expect(isDay(undefined)).toBe(false);
  });
});

describe('addDays and daysBetween', () => {
  it('counts across months, years and clock changes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays(SAT, -14)).toBe('2026-10-31');
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-10-31', 2)).toBe('2026-11-02');
    expect(addDays(SAT, 0)).toBe(SAT);
  });
  it('says how many days from one to the other', () => {
    expect(daysBetween(SAT, '2026-11-21')).toBe(7);
    expect(daysBetween('2026-11-21', SAT)).toBe(-7);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-10-25', '2026-11-08')).toBe(14);
    expect(daysBetween(SAT, SAT)).toBe(0);
  });
});

describe('later', () => {
  it('picks the later day, and a day over none', () => {
    expect(later(SAT, '2026-11-01')).toBe(SAT);
    expect(later('2026-11-01', SAT)).toBe(SAT);
    expect(later('', SAT)).toBe(SAT);
    expect(later(SAT, '')).toBe(SAT);
    expect(later(SAT, SAT)).toBe(SAT);
  });
});

describe('whenWords', () => {
  it('says today, yesterday, a weekday this past week, then the date', () => {
    expect(whenWords(SAT, SAT)).toBe('today');
    expect(whenWords('2026-11-13', SAT)).toBe('yesterday');
    expect(whenWords('2026-11-12', SAT)).toBe('Thursday');
    expect(whenWords('2026-11-08', SAT)).toBe('Sunday');
    expect(whenWords('2026-11-07', SAT)).toBe('7 Nov');
    expect(whenWords('2025-12-25', SAT)).toBe('25 Dec');
    expect(whenWords('2026-01-02', SAT)).toBe('2 Jan');
  });
  it('gives a day still to come as its date', () => {
    expect(whenWords('2026-11-16', SAT)).toBe('16 Nov');
  });
});

describe('dueWords', () => {
  it('says Today for today and any day gone', () => {
    expect(dueWords(SAT, SAT)).toBe('Today');
    expect(dueWords('2026-11-01', SAT)).toBe('Today');
  });
  it('says Tomorrow, a weekday this coming week, then the date', () => {
    expect(dueWords('2026-11-15', SAT)).toBe('Tomorrow');
    expect(dueWords('2026-11-16', SAT)).toBe('Monday');
    expect(dueWords('2026-11-20', SAT)).toBe('Friday');
    expect(dueWords('2026-11-21', SAT)).toBe('21 Nov');
    expect(dueWords('2027-02-01', SAT)).toBe('1 Feb');
  });
});

describe('sinceWords', () => {
  it('says nothing under two weeks', () => {
    expect(sinceWords(SAT, SAT)).toBe('');
    expect(sinceWords(addDays(SAT, -13), SAT)).toBe('');
  });
  it('counts weeks up to two months, then months', () => {
    expect(sinceWords(addDays(SAT, -14), SAT)).toBe('2 weeks');
    expect(sinceWords(addDays(SAT, -45), SAT)).toBe('6 weeks');
    expect(sinceWords(addDays(SAT, -59), SAT)).toBe('8 weeks');
    expect(sinceWords(addDays(SAT, -60), SAT)).toBe('2 months');
    expect(sinceWords(addDays(SAT, -91), SAT)).toBe('3 months');
    expect(sinceWords(addDays(SAT, -400), SAT)).toBe('13 months');
  });
});
