// ref/data/who-lines.js: Who it's for (round 3, ref/09-who-its-for),
// RECENT people first, each with a short line.
import { describe, it, expect } from 'vitest';
import { whoLine, aboutPerson, recentFirst, RECENT_MOST } from '../../../ref/data/who-lines.js';

describe('whoLine', () => {
  it('says their group or role, then their shoots', () => {
    expect(whoLine({ group: 'Client', role: 'Talent', shoots: 4, handle: 'june' })).toBe('Client · 4 shoots');
    expect(whoLine({ role: 'Talent', shoots: 1 })).toBe('Talent · 1 shoot');
  });
  it('their handle when they are on no shoot', () => {
    expect(whoLine({ group: 'Client', handle: 'lindsey.t' })).toBe('Client · @lindsey.t');
    expect(whoLine({ handle: 'maya' })).toBe('@maya');
  });
  it('nothing when nothing is known', () => {
    expect(whoLine({})).toBe('');
    expect(whoLine()).toBe('');
  });
});

describe('aboutPerson', () => {
  const rounds = { app: 'rounds', kind: 'person', day: '2027-01-01', more: { group: 'Client' } };
  const shoot = (day) => ({ app: 'the-eye', kind: 'shoot', day });
  it('reads their group, their shoots and their newest day (not Rounds\' due day)', () => {
    const byApp = { rounds: [rounds], 'the-eye': [shoot('2026-11-20'), shoot('2026-10-01'), { kind: 'other', day: '' }], ref: [{ kind: 'board', day: '2026-11-02' }] };
    expect(aboutPerson({ name: 'June', instagram: 'june' }, byApp, 'Talent')).toEqual({ group: 'Client', role: 'Talent', shoots: 2, handle: 'june', last: '2026-11-20' });
  });
  it('takes a TikTok handle when there is no Instagram', () => {
    expect(aboutPerson({ name: 'Ana', tiktok: 'ana.tt' }, {}).handle).toBe('ana.tt');
  });
  it('knows nothing of someone in nothing', () => {
    expect(aboutPerson({ name: 'Dana' })).toEqual({ group: '', role: '', shoots: 0, handle: '', last: '' });
    expect(aboutPerson({ name: 'Dana' }, { rounds: [{ kind: 'person', day: '' }] }).group).toBe('');
  });
});

describe('recentFirst', () => {
  const row = (name, last, more = {}) => ({ record: { name, ...more }, last });
  it('puts the newest first, then those with nothing yet, by name', () => {
    const rows = [row('Zoe', ''), row('Ana', '2026-10-01'), row('maya', ''), row('Bea', '2026-11-20')];
    expect(recentFirst(rows).map((r) => r.record.name)).toEqual(['Bea', 'Ana', 'maya', 'Zoe']);
  });
  it('names someone by their handle when they have no name', () => {
    const rows = [row('', '', { instagram: 'zed' }), row('', '', { tiktok: 'amy' }), row('', '')];
    expect(recentFirst(rows).map((r) => r.record.instagram || r.record.tiktok || '')).toEqual(['', 'amy', 'zed']);
  });
  it('leaves the list it was given as it was', () => {
    const rows = [row('B', ''), row('A', '')];
    recentFirst(rows);
    expect(rows.map((r) => r.record.name)).toEqual(['B', 'A']);
  });
  it('shows a dozen before anything is typed', () => {
    expect(RECENT_MOST).toBe(12);
  });
});
