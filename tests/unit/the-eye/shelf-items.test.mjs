// the-eye/components/shelf-items.js: what The Eye tells the shelf is waiting
// in it, for the floating ! (round 2, connect/16 and 17).
import { describe, it, expect, vi, afterEach } from 'vitest';

delete window.EyeParts;
await import('../../../the-eye/components/shelf-items.js');

// A pretend app: the report's day is Fri 13 Nov 2026, and todayItems gives
// the Today card's list as given.
function app(shoots = [], today = [], over = {}) {
  const ed = {
    state: { shoots },
    effectiveReportDateStr: () => '2026-11-13',
    todayStr: () => '2026-11-13',
    dateTimeSortKey: s => `${s.date || ''} ${s.startTime || ''}`,
    shootDisplayName: s => s.title,
    todayItems: () => today,
    ...over,
  };
  window.EyeParts.addShelfItems(ed);
  return ed;
}
const ready = (title, date, more = {}) => ({ id: title, title, date, status: 'waiting_to_shoot', archived: false, ...more });
afterEach(() => { delete window.DFWaiting; vi.restoreAllMocks(); });

describe('addShelfItems', () => {
  it('adds shelfItems and tellShelf, and keeps what is on window.EyeParts', async () => {
    const ed = {};
    window.EyeParts.addShelfItems(ed);
    expect(Object.keys(ed)).toEqual(['shelfItems', 'tellShelf']);
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/shelf-items.js');
    expect(window.EyeParts.other).toBe(1);
  });
});

describe('shelfItems', () => {
  it("turns each of the Today card's items into one for the shelf", () => {
    const ed = app([], [
      { kind: 'shoot-day', id: 'a', name: 'Rooftop portraits' },
      { kind: 'happened', id: 'b', name: 'Garden', day: 0, setFor: 'Tuesday' },
      { kind: 'late', act: 'shoot', id: 'c', name: 'Prints', late: '2 days' },
      { kind: 'brief' },
    ]);
    expect(ed.shelfItems()).toEqual([
      { title: 'Rooftop portraits', line: 'Shooting today', from: '2026-11-13', until: '2026-11-13' },
      { title: 'Garden', line: 'Did it happen?', from: '2026-11-13' },
      { title: 'Prints', line: 'Past its deadline', from: '2026-11-13' },
      { title: 'Last week', line: 'Your shoots and what you took from them', from: '2026-11-13', until: '2026-11-13' },
    ]);
  });
  it("keeps an item for The Eye's day through the night, until 5am, when its day ends", () => {
    const ed = app([ready('Tomorrow', '2026-11-13')], [{ kind: 'shoot-day', name: 'Late shoot' }, { kind: 'happened', name: 'Garden' }, { kind: 'brief' }], { effectiveReportDateStr: () => '2026-11-12' });
    expect(ed.shelfItems()).toEqual([
      { title: 'Late shoot', line: 'Shooting today', from: '2026-11-12', until: '2026-11-13' },
      { title: 'Garden', line: 'Did it happen?', from: '2026-11-12' },
      { title: 'Last week', line: 'Your shoots and what you took from them', from: '2026-11-12', until: '2026-11-13' },
      { title: 'Tomorrow', line: 'Shooting today', from: '2026-11-13', until: '2026-11-13' },
    ]);
  });
  it('uses the list it is given instead, when there is one', () => {
    const ed = app([], [{ kind: 'brief' }]);
    expect(ed.shelfItems([])).toEqual([]);
    expect(ed.shelfItems([{ kind: 'shoot-day', name: 'Beach' }])).toEqual([{ title: 'Beach', line: 'Shooting today', from: '2026-11-13', until: '2026-11-13' }]);
  });
  it('adds each ready shoot of the next two weeks, on its day, soonest first', () => {
    const ed = app([
      ready('Later', '2026-11-20', { startTime: '18:00' }),
      ready('Sooner', '2026-11-20', { startTime: '09:00' }),
      ready('Tomorrow', '2026-11-14'),
      ready('Last day', '2026-11-27'),
      ready('Too far', '2026-11-28'),
      ready('Today, on the card already', '2026-11-13'),
      ready('Went by', '2026-11-12'),
      ready('Put away', '2026-11-15', { archived: true }),
      ready('Not ready', '2026-11-15', { status: 'planning' }),
    ]);
    expect(ed.shelfItems().map(x => [x.title, x.from, x.until, x.line])).toEqual([
      ['Tomorrow', '2026-11-14', '2026-11-14', 'Shooting today'],
      ['Sooner', '2026-11-20', '2026-11-20', 'Shooting today'],
      ['Later', '2026-11-20', '2026-11-20', 'Shooting today'],
      ['Last day', '2026-11-27', '2026-11-27', 'Shooting today'],
    ]);
  });
  it('counts the two weeks across a month and a year', () => {
    const ed = app([ready('New year', '2027-01-03'), ready('Too far', '2027-01-04')], [], { effectiveReportDateStr: () => '2026-12-20', todayStr: () => '2026-12-20' });
    expect(ed.shelfItems().map(x => x.title)).toEqual(['New year']);
  });
  it('gives nothing when nothing is waiting', () => {
    expect(app().shelfItems()).toEqual([]);
  });
});

describe('tellShelf', () => {
  it('writes the items for the shelf when the shared files are there', () => {
    window.DFWaiting = { publishWaiting: vi.fn() };
    const ed = app([ready('Tomorrow', '2026-11-14')], [{ kind: 'brief' }]);
    ed.tellShelf();
    expect(window.DFWaiting.publishWaiting).toHaveBeenCalledWith('the-eye', [
      { title: 'Last week', line: 'Your shoots and what you took from them', from: '2026-11-13', until: '2026-11-13' },
      { title: 'Tomorrow', line: 'Shooting today', from: '2026-11-14', until: '2026-11-14' },
    ]);
    ed.tellShelf([]);
    expect(window.DFWaiting.publishWaiting).toHaveBeenLastCalledWith('the-eye', [{ title: 'Tomorrow', line: 'Shooting today', from: '2026-11-14', until: '2026-11-14' }]);
  });
  it('does nothing in a copy of The Eye without them', () => {
    const ed = app([], [{ kind: 'brief' }]);
    expect(() => ed.tellShelf()).not.toThrow();
  });
});
