// the-eye/components/row-words.js: the words on a shoot's row, the Next shoot
// card and the Today card.
import { describe, it, expect, beforeAll, vi } from 'vitest';

let ed;
beforeAll(async () => {
  delete window.EyeParts;
  await import('../../../the-eye/components/row-words.js');
  ed = {};
  window.EyeParts.addRowWords(ed);
});
const TODAY = '2026-11-13'; // a Friday

describe('addRowWords', () => {
  it('adds the word helpers and nothing else', () => {
    expect(Object.keys(ed)).toEqual(['daysBetween', 'rowDate', 'rowDateRange', 'daysAwayTag', 'setForWords', 'dueWords', 'overdueWords', 'pastDeadlineWords', 'metaLine']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules(); // the script runs once per import: run it again
    await import('../../../the-eye/components/row-words.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addRowWords).toBe('function');
  });
});

describe('daysBetween', () => {
  it('counts forward and back', () => {
    expect(ed.daysBetween(TODAY, '2026-11-21')).toBe(8);
    expect(ed.daysBetween('2026-11-10', TODAY)).toBe(3);
    expect(ed.daysBetween(TODAY, '2026-11-12')).toBe(-1);
  });
  it('is 0 for the same day', () => {
    expect(ed.daysBetween(TODAY, TODAY)).toBe(0);
  });
  it('crosses months, years and a clock change in whole days', () => {
    expect(ed.daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(ed.daysBetween('2026-12-31', '2027-01-01')).toBe(1);
    expect(ed.daysBetween('2026-03-28', '2026-03-30')).toBe(2);
    expect(ed.daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(ed.daysBetween('2024-02-28', '2024-03-01')).toBe(2);
  });
  it('counts a long way', () => {
    expect(ed.daysBetween('2026-01-01', '2027-01-01')).toBe(365);
  });
});

describe('rowDate', () => {
  it('writes the day and month, with the weekday when asked', () => {
    expect(ed.rowDate('2026-11-28', TODAY, true)).toBe('Sat 28 Nov');
    expect(ed.rowDate('2026-11-10', TODAY, false)).toBe('10 Nov');
  });
  it('adds the year when it is not this year', () => {
    expect(ed.rowDate('2025-08-14', TODAY, false)).toBe('14 Aug 2025');
    expect(ed.rowDate('2027-01-04', TODAY, true)).toBe('Mon 4 Jan 2027');
  });
  it('has every month and weekday', () => {
    const months = Array.from({ length: 12 }, (_, i) => ed.rowDate(`2026-${String(i + 1).padStart(2, '0')}-01`, TODAY, false));
    expect(months).toEqual(['1 Jan', '1 Feb', '1 Mar', '1 Apr', '1 May', '1 Jun', '1 Jul', '1 Aug', '1 Sep', '1 Oct', '1 Nov', '1 Dec']);
    const days = Array.from({ length: 7 }, (_, i) => ed.rowDate(`2026-11-${String(15 + i)}`, TODAY, true).slice(0, 3));
    expect(days).toEqual(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  });
});

describe('rowDateRange', () => {
  it('writes days in one month once', () => {
    expect(ed.rowDateRange('2026-12-09', '2026-12-11', TODAY)).toBe('9 to 11 Dec');
  });
  it('writes both months when they differ', () => {
    expect(ed.rowDateRange('2026-11-28', '2026-12-02', TODAY)).toBe('28 Nov to 2 Dec');
  });
  it('writes both years when they differ', () => {
    expect(ed.rowDateRange('2026-12-30', '2027-01-02', TODAY)).toBe('30 Dec 2026 to 2 Jan 2027');
  });
  it('writes both years when they differ, even with one of them this year', () => {
    expect(ed.rowDateRange('2025-12-30', '2026-01-02', TODAY)).toBe('30 Dec 2025 to 2 Jan 2026');
  });
  it('adds the year once for a range in another year', () => {
    expect(ed.rowDateRange('2025-08-14', '2025-08-16', TODAY)).toBe('14 to 16 Aug 2025');
    expect(ed.rowDateRange('2025-07-30', '2025-08-02', TODAY)).toBe('30 Jul to 2 Aug 2025');
  });
  it('is one date for one day', () => {
    expect(ed.rowDateRange('2026-12-09', '2026-12-09', TODAY)).toBe('9 Dec');
  });
});

describe('daysAwayTag', () => {
  it('says today and tomorrow', () => {
    expect(ed.daysAwayTag(TODAY, TODAY)).toBe('Today');
    expect(ed.daysAwayTag('2026-11-14', TODAY)).toBe('Tomorrow');
  });
  it('counts the days after that', () => {
    expect(ed.daysAwayTag('2026-11-15', TODAY)).toBe('In 2 days');
    expect(ed.daysAwayTag('2026-11-21', TODAY)).toBe('In 8 days');
    expect(ed.daysAwayTag('2027-11-13', TODAY)).toBe('In 365 days');
  });
  it('says nothing for a day gone by', () => {
    expect(ed.daysAwayTag('2026-11-12', TODAY)).toBe('');
  });
});

describe('setForWords', () => {
  it('says yesterday', () => {
    expect(ed.setForWords('2026-11-12', TODAY)).toBe('yesterday');
  });
  it('names a weekday within the last week', () => {
    expect(ed.setForWords('2026-11-11', TODAY)).toBe('Wednesday');
    expect(ed.setForWords('2026-11-07', TODAY)).toBe('Saturday');
    expect(ed.setForWords('2026-11-08', TODAY)).toBe('Sunday');
    expect(ed.setForWords('2026-11-09', TODAY)).toBe('Monday');
    expect(ed.setForWords('2026-11-10', TODAY)).toBe('Tuesday');
  });
  it('gives the date for a week ago or more', () => {
    expect(ed.setForWords('2026-11-06', TODAY)).toBe('6 Nov');
    expect(ed.setForWords('2025-12-20', TODAY)).toBe('20 Dec 2025');
  });
  it('gives the date for today or later', () => {
    expect(ed.setForWords(TODAY, TODAY)).toBe('13 Nov');
    expect(ed.setForWords('2026-11-14', TODAY)).toBe('14 Nov');
  });
  it('names Thursday and Friday too', () => {
    expect(ed.setForWords('2026-11-05', '2026-11-07')).toBe('Thursday');
    expect(ed.setForWords('2026-11-06', '2026-11-08')).toBe('Friday');
  });
});

describe('dueWords', () => {
  it('says due today', () => {
    expect(ed.dueWords(TODAY, TODAY)).toBe('Due today');
  });
  it('adds the weekday within the week', () => {
    expect(ed.dueWords('2026-11-14', TODAY)).toBe('Due Sat 14 Nov');
    expect(ed.dueWords('2026-11-20', TODAY)).toBe('Due Fri 20 Nov');
  });
  it('leaves it out further off', () => {
    expect(ed.dueWords('2026-11-21', TODAY)).toBe('Due 21 Nov');
    expect(ed.dueWords('2027-01-04', TODAY)).toBe('Due 4 Jan 2027');
  });
  it('leaves it out for a day gone by', () => {
    expect(ed.dueWords('2026-11-10', TODAY)).toBe('Due 10 Nov');
  });
});

describe('overdueWords and pastDeadlineWords', () => {
  it('count the days gone by', () => {
    expect(ed.overdueWords('2026-11-10', TODAY)).toBe('Overdue by 3 days');
    expect(ed.pastDeadlineWords('2026-11-10', TODAY)).toBe('3 days past');
  });
  it('say one day, not one days', () => {
    expect(ed.overdueWords('2026-11-12', TODAY)).toBe('Overdue by 1 day');
    expect(ed.pastDeadlineWords('2026-11-12', TODAY)).toBe('1 day past');
  });
  it('count across a year', () => {
    expect(ed.overdueWords('2025-11-13', TODAY)).toBe('Overdue by 365 days');
    expect(ed.pastDeadlineWords('2026-10-31', TODAY)).toBe('13 days past');
  });
});

describe('metaLine', () => {
  it('joins the parts with commas', () => {
    expect(ed.metaLine(['Prospect', 'Sat 28 Nov'])).toBe('Prospect, Sat 28 Nov');
  });
  it('leaves out empty parts', () => {
    expect(ed.metaLine(['', 'Shot 10 Nov', null, undefined, 'Due 4 Dec'])).toBe('Shot 10 Nov, Due 4 Dec');
  });
  it('is empty with nothing to say', () => {
    expect(ed.metaLine([])).toBe('');
    expect(ed.metaLine(['', false])).toBe('');
  });
  it('is one part alone', () => {
    expect(ed.metaLine(['Editing'])).toBe('Editing');
  });
});
