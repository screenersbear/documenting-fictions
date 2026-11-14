// the-eye/components/today-items.js: what needs you today, for the Today
// card and the top of the daily report.
import { describe, it, expect, vi } from 'vitest';

// Loaded first, as the page does (some describes below make their app as they're read).
delete window.EyeParts;
await import('../../../the-eye/components/today-items.js');

const NAMES = ['todayItems', 'todayItemHtml', 'todayCountWords', 'todayMoreWords', 'runTodayAct'];

// A pretend app around the list: today is Fri 13 Nov 2026 (the report's day
// too, unless a test says otherwise).
function app(shoots = [], over = {}) {
  const ed = {
    state: { shoots },
    effectiveReportDateStr: () => '2026-11-13',
    todayStr: () => '2026-11-13',
    dateTimeSortKey: s => `${s.date || ''} ${s.startTime || ''}`,
    shootDisplayName: s => s.title,
    POST_CAPTURE_STATUSES: ['captured', 'waiting_for_selects', 'editing', 'delivered'],
    isOriginalPlanDate: s => !!s.planFellThrough,
    projectDayInfo: s => (s.dayOf ? { day: s.dayOf } : null),
    setForWords: (date, day) => `${date} (from ${day})`,
    isUpcomingDeadline: s => !!s.deadline && s.status !== 'delivered',
    // Shoots of a project come back as one; the rest one each.
    collapseProjects: (list) => {
      const out = [];
      list.forEach((s) => {
        if (!s.projectId) { out.push({ kind: 'shoot', shoot: s }); return; }
        const had = out.find(o => o.kind === 'project' && o.project.id === s.projectId);
        if (had) had.members.push(s);
        else out.push({ kind: 'project', project: { id: s.projectId, name: s.projectName }, members: [s] });
      });
      return out;
    },
    pastDeadlineWords: (deadline, today) => `past ${deadline} on ${today}`,
    mondayBriefDue: () => false,
    UNTITLED_PROJECT_NAME: 'Untitled project',
    escapeHtml: t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    ...over,
  };
  window.EyeParts.addTodayItems(ed);
  return ed;
}
const shoot = o => ({ id: o.title, status: 'planning', archived: false, ...o });

describe('addTodayItems', () => {
  it('adds the Today helpers and nothing else', () => {
    const ed = {};
    window.EyeParts.addTodayItems(ed);
    expect(Object.keys(ed)).toEqual(NAMES);
    NAMES.forEach(k => expect(typeof ed[k]).toBe('function'));
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/today-items.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addTodayItems).toBe('function');
  });
});

describe('todayItems', () => {
  it('is empty when nothing needs you', () => {
    expect(app().todayItems()).toEqual([]);
    expect(app([shoot({ title: 'Later', date: '2026-11-20' })]).todayItems()).toEqual([]);
  });

  it('lists a shoot ready to shoot today, earliest first', () => {
    const ed = app([
      shoot({ title: 'Evening', status: 'waiting_to_shoot', date: '2026-11-13', startTime: '18:00' }),
      shoot({ title: 'Morning', status: 'waiting_to_shoot', date: '2026-11-13', startTime: '09:00' }),
    ]);
    expect(ed.todayItems()).toEqual([
      { kind: 'shoot-day', id: 'Morning', name: 'Morning' },
      { kind: 'shoot-day', id: 'Evening', name: 'Evening' },
    ]);
  });

  it('leaves out a shoot day that is archived, not ready, or another day', () => {
    const ed = app([
      shoot({ title: 'Archived', status: 'waiting_to_shoot', date: '2026-11-13', archived: true }),
      shoot({ title: 'Planning', status: 'planning', date: '2026-11-13' }),
      shoot({ title: 'Tomorrow', status: 'waiting_to_shoot', date: '2026-11-14' }),
    ]);
    expect(ed.todayItems()).toEqual([]);
  });

  it('asks nothing about today\'s shoot while Shoot mode is up', () => {
    const ready = [shoot({ title: 'Today', status: 'waiting_to_shoot', date: '2026-11-13' })];
    expect(app(ready, { shootModeOverlay: { hidden: false } }).todayItems()).toEqual([]);
    expect(app(ready, { shootModeOverlay: { hidden: true } }).todayItems()).toHaveLength(1);
    expect(app(ready, { shootModeOverlay: null }).todayItems()).toHaveLength(1);
  });

  it('asks about a shoot whose day went by, oldest first, with its project day', () => {
    const ed = app([
      shoot({ title: 'Yesterday', date: '2026-11-12' }),
      shoot({ title: 'Last week', status: 'prospect', date: '2026-11-06', dayOf: 2 }),
    ]);
    expect(ed.todayItems()).toEqual([
      { kind: 'happened', id: 'Last week', name: 'Last week', day: 2, setFor: '2026-11-06 (from 2026-11-13)' },
      { kind: 'happened', id: 'Yesterday', name: 'Yesterday', day: 0, setFor: '2026-11-12 (from 2026-11-13)' },
    ]);
  });

  it('asks nothing about a shoot that is shot, archived, postponed on that date, undated, today or to come', () => {
    const ed = app([
      shoot({ title: 'Shot', status: 'captured', date: '2026-11-10' }),
      shoot({ title: 'Delivered', status: 'delivered', date: '2026-11-10' }),
      shoot({ title: 'Archived', date: '2026-11-10', archived: true }),
      shoot({ title: 'Postponed', status: 'rescheduled', date: '2026-11-10', planFellThrough: true }),
      shoot({ title: 'Undated', date: '' }),
      shoot({ title: 'No date' }),
      shoot({ title: 'Today', date: '2026-11-13' }),
      shoot({ title: 'Soon', date: '2026-11-15' }),
    ]);
    expect(ed.todayItems()).toEqual([]);
  });

  it('asks again about a postponed shoot\'s new date once it goes by', () => {
    const ed = app([shoot({ title: 'Moved', status: 'rescheduled', date: '2026-11-11' })]);
    expect(ed.todayItems().map(i => i.kind)).toEqual(['happened']);
  });

  it('lists deadlines gone by, a shoot by its name and a project once', () => {
    const ed = app([
      shoot({ title: 'Solo', status: 'editing', date: '2026-11-01', deadline: '2026-11-10' }),
      shoot({ title: 'Day 1', status: 'editing', date: '2026-11-01', deadline: '2026-11-09', projectId: 'p1', projectName: 'Lookbook' }),
      shoot({ title: 'Day 2', status: 'editing', date: '2026-11-02', deadline: '2026-11-07', projectId: 'p1', projectName: 'Lookbook' }),
      shoot({ title: 'Nameless 1', status: 'editing', date: '2026-11-03', deadline: '2026-11-12', projectId: 'p2' }),
    ]);
    expect(ed.todayItems()).toEqual([
      { kind: 'late', act: 'shoot', id: 'Solo', name: 'Solo', late: 'past 2026-11-10 on 2026-11-13' },
      // The earliest of its days' deadlines.
      { kind: 'late', act: 'project', id: 'p1', name: 'Lookbook', late: 'past 2026-11-07 on 2026-11-13' },
      { kind: 'late', act: 'project', id: 'p2', name: 'Untitled project', late: 'past 2026-11-12 on 2026-11-13' },
    ]);
  });

  it('leaves out a deadline that is today, still to come, or done with', () => {
    const ed = app([
      shoot({ title: 'Due today', status: 'editing', date: '2026-11-01', deadline: '2026-11-13' }),
      shoot({ title: 'Due soon', status: 'editing', date: '2026-11-01', deadline: '2026-11-20' }),
      shoot({ title: 'Delivered', status: 'delivered', date: '2026-11-01', deadline: '2026-11-02' }),
    ]);
    expect(ed.todayItems()).toEqual([]);
  });

  it('adds Monday\'s look back last, until it is read', () => {
    expect(app([], { mondayBriefDue: () => true }).todayItems()).toEqual([{ kind: 'brief', id: '' }]);
  });

  it('puts them in order: today\'s shoot, the questions, deadlines, the look back', () => {
    const ed = app([
      shoot({ title: 'Late', status: 'editing', date: '2026-11-01', deadline: '2026-11-05' }),
      shoot({ title: 'Asked', date: '2026-11-12' }),
      shoot({ title: 'Ready', status: 'waiting_to_shoot', date: '2026-11-13' }),
    ], { mondayBriefDue: () => true });
    expect(ed.todayItems().map(i => i.kind)).toEqual(['shoot-day', 'happened', 'late', 'brief']);
  });

  it('starts the day at 5am for shoots, but goes by the clock for deadlines', () => {
    // 1am on the 14th: the report's day is still the 13th.
    const ed = app([
      shoot({ title: 'Ready', status: 'waiting_to_shoot', date: '2026-11-13' }),
      shoot({ title: 'Late night', date: '2026-11-13' }),
      shoot({ title: 'Due', status: 'editing', date: '2026-11-01', deadline: '2026-11-13' }),
    ], { todayStr: () => '2026-11-14' });
    expect(ed.todayItems().map(i => `${i.kind} ${i.id}`)).toEqual(['shoot-day Ready', 'late Due']);
  });
});

describe('todayItemHtml', () => {
  const ed = app();
  const CHEVRON = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';

  it('asks about today\'s shoot with Shoot mode', () => {
    expect(ed.todayItemHtml({ kind: 'shoot-day', id: 's1', name: 'Rooftop' })).toBe(
      '<div class="today-item"><p>You\'re shooting <b>Rooftop</b> today.</p><div class="today-btns"><button type="button" class="primary" data-act="shoot-mode" data-id="s1">Shoot mode</button></div></div>');
  });

  it('asks whether a shoot happened, with its two answers', () => {
    expect(ed.todayItemHtml({ kind: 'happened', id: 's2', name: 'Beach', day: 0, setFor: 'yesterday' })).toBe(
      '<div class="today-item"><p>Did <b>Beach</b> happen? It was set for yesterday.</p><div class="today-btns">'
      + '<button type="button" class="primary" data-act="happened" data-id="s2">Yes, it happened</button>'
      + '<button type="button" class="secondary" data-act="move" data-id="s2">Move the date</button></div></div>');
  });

  it('names the day of a project', () => {
    expect(ed.todayItemHtml({ kind: 'happened', id: 's3', name: 'Lookbook', day: 2, setFor: 'Tuesday' })).toContain('Did <b>Lookbook</b> (day 2) happen? It was set for Tuesday.');
  });

  it('makes a deadline gone by a line to tap, crimson', () => {
    expect(ed.todayItemHtml({ kind: 'late', act: 'project', id: 'p1', name: 'Lookbook', late: '3 days past' })).toBe(
      `<button type="button" class="today-item today-link" data-act="project" data-id="p1"><span><b>Lookbook</b> is <span class="today-late">3 days past</span> its deadline.</span>${CHEVRON}</button>`);
  });

  it('makes Monday\'s look back a line to tap', () => {
    expect(ed.todayItemHtml({ kind: 'brief', id: '' })).toBe(
      `<button type="button" class="today-item today-link" data-act="brief" data-id=""><span><b>Last week</b>: your shoots and what you took from them.</span>${CHEVRON}</button>`);
  });

  it('keeps names and ids as plain text', () => {
    const asked = ed.todayItemHtml({ kind: 'happened', id: 'a"b', name: '<i>Rose</i> & co', day: 0, setFor: '<b>then</b>' });
    expect(asked).toContain('Did <b>&lt;i&gt;Rose&lt;/i&gt; &amp; co</b> happen? It was set for &lt;b&gt;then&lt;/b&gt;.');
    expect(asked).toContain('data-id="a&quot;b"');
    expect(ed.todayItemHtml({ kind: 'shoot-day', id: '<x>', name: 'A & B' })).toContain('<b>A &amp; B</b>');
    expect(ed.todayItemHtml({ kind: 'shoot-day', id: '<x>', name: 'A' })).toContain('data-id="&lt;x&gt;"');
    const late = ed.todayItemHtml({ kind: 'late', act: 'shoot', id: '"q"', name: 'Q & A', late: '<1 day>' });
    expect(late).toContain('data-id="&quot;q&quot;"');
    expect(late).toContain('<b>Q &amp; A</b> is <span class="today-late">&lt;1 day&gt;</span>');
  });
});

describe('todayCountWords and todayMoreWords', () => {
  const ed = app();
  it('counts the things, one in the singular', () => {
    expect(ed.todayCountWords(1)).toBe('1 thing');
    expect(ed.todayCountWords(2)).toBe('2 things');
    expect(ed.todayCountWords(0)).toBe('0 things');
    expect(ed.todayCountWords(12)).toBe('12 things');
  });
  it('says how many more are in the report', () => {
    expect(ed.todayMoreWords(1)).toBe("1 more in today's report");
    expect(ed.todayMoreWords(2)).toBe("2 more in today's report");
    expect(ed.todayMoreWords(40)).toBe("40 more in today's report");
  });
});

describe('runTodayAct', () => {
  const spies = (applied) => app([], {
    openShootMode: vi.fn(),
    applyStatusChange: vi.fn(() => applied),
    openShootModal: vi.fn(),
    openProjectPopup: vi.fn(),
    maybeShowMondayBrief: vi.fn(),
  });
  const called = ed => ['openShootMode', 'applyStatusChange', 'openShootModal', 'openProjectPopup', 'maybeShowMondayBrief'].filter(k => ed[k].mock.calls.length);

  it('opens Shoot mode', () => {
    const ed = spies();
    ed.runTodayAct('shoot-mode', 's1');
    expect(ed.openShootMode).toHaveBeenCalledWith('s1');
    expect(called(ed)).toEqual(['openShootMode']);
  });
  it('marks a shoot shot, with no follow-up questions', () => {
    const ed = spies('captured');
    ed.runTodayAct('happened', 's2');
    expect(ed.applyStatusChange).toHaveBeenCalledWith('s2', 'captured', { followUps: false });
    expect(called(ed)).toEqual(['applyStatusChange']);
  });
  it('postpones a shoot, then opens its page for the new date', () => {
    const ed = spies('rescheduled');
    ed.runTodayAct('move', 's3');
    expect(ed.applyStatusChange).toHaveBeenCalledWith('s3', 'rescheduled', { followUps: false });
    expect(ed.openShootModal).toHaveBeenCalledWith('s3');
  });
  it('opens nothing when postponing didn\'t happen', () => {
    const ed = spies(null);
    ed.runTodayAct('move', 's3');
    expect(called(ed)).toEqual(['applyStatusChange']);
  });
  it('opens a shoot, a project or last week', () => {
    const ed = spies();
    ed.runTodayAct('shoot', 's4');
    ed.runTodayAct('project', 'p1');
    ed.runTodayAct('brief', '');
    expect(ed.openShootModal).toHaveBeenCalledWith('s4');
    expect(ed.openProjectPopup).toHaveBeenCalledWith('p1');
    expect(ed.maybeShowMondayBrief).toHaveBeenCalledTimes(1);
    expect(called(ed)).toEqual(['openShootModal', 'openProjectPopup', 'maybeShowMondayBrief']);
  });
  it('does nothing for anything else', () => {
    const ed = spies();
    ed.runTodayAct('nope', 'x');
    ed.runTodayAct(undefined, undefined);
    expect(called(ed)).toEqual([]);
  });
});
