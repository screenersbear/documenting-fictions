// rounds/data/eye-people.js: people from The Eye's shoots, once a shoot is captured.
import { describe, it, expect } from 'vitest';
import { AFTER_SHOOT, shootPeople, bringIn } from '../../../rounds/data/eye-people.js';
import { newPerson } from '../../../rounds/data/person.js';
import { move } from '../../../rounds/data/plan.js';

const T = '2026-11-14';
const ids = () => { let n = 0; return () => `p${++n}`; };
const shoot = (id, date, more = {}) => ({ id, date, status: 'captured', title: 'Rooftop portraits', talents: [], teamMembers: [], ...more });
const maya = { id: 't1', name: ' Maya R. ', socialHandles: [{ platform: 'tiktok', handle: '@mayatok' }, { platform: 'instagram', handle: '@maya.rr' }] };

describe('AFTER_SHOOT', () => {
  it('is Captured and every stage after it', () => {
    expect(AFTER_SHOOT).toEqual(['captured', 'waiting_for_selects', 'editing', 'delivered']);
  });
});

describe('shootPeople', () => {
  it('lists the talent with their handles and photo, then the team', () => {
    const s = shoot('s1', T, {
      talents: [maya, { name: '  ' }, null, { name: 'Ana' }],
      teamMembers: [{ role: 'Makeup', name: 'Jules', socialPlatform: 'tiktok', socialHandle: '@jules' }, { name: 'Sam', socialHandle: 'sam.k' }, { role: 'Styling', name: 'Lee', socialPlatform: 'other', socialHandle: 'lee' }, { role: 'Hair' }],
    });
    expect(shootPeople(s)).toEqual([
      { name: 'Maya R.', role: 'Talent', instagram: 'maya.rr', tiktok: 'mayatok', photoKey: 's1__talent_t1' },
      { name: 'Ana', role: 'Talent', instagram: '', tiktok: '', photoKey: '' },
      { name: 'Jules', role: 'Makeup', instagram: '', tiktok: 'jules', photoKey: '' },
      { name: 'Sam', role: 'Team', instagram: 'sam.k', tiktok: '', photoKey: '' },
      { name: 'Lee', role: 'Styling', instagram: '', tiktok: '', photoKey: '' },
    ]);
  });
  it('is no one for a shoot with no one on it', () => {
    expect(shootPeople({ id: 's' })).toEqual([]);
  });
});

describe('bringIn', () => {
  it('brings in everyone from a captured shoot, with a ready thank you', () => {
    const s = shoot('s1', '2026-11-10', { talents: [maya], teamMembers: [{ role: 'Makeup', name: 'Jules' }] });
    const { changed, seen } = bringIn([], [s], [], T, ids());
    expect(seen).toEqual(['s1']);
    expect(changed.map((p) => [p.id, p.name, p.group, p.source, p.where, p.shoots, p.lastShot, p.photoKey, p.next])).toEqual([
      ['p1', 'Maya R.', 'new', 'eye', 'Talent on Rooftop portraits', ['s1'], '2026-11-10', 's1__talent_t1', move('thanks', T)],
      ['p2', 'Jules', 'new', 'eye', 'Makeup on Rooftop portraits', ['s1'], '2026-11-10', '', move('thanks', T)],
    ]);
  });
  it('leaves shoots not captured yet, seen before, with no day, or not shoots at all', () => {
    const shoots = [shoot('a', T, { status: 'planning', talents: [maya] }), shoot('b', T, { talents: [maya] }), shoot('c', '', { talents: [maya] }), null, { date: T, status: 'captured' }];
    const { changed, seen } = bringIn([], shoots, ['b'], T, ids());
    expect(changed).toEqual([]);
    expect(seen).toEqual(['b']);
    expect(bringIn([], undefined, [], T, ids())).toEqual({ changed: [], seen: [] });
  });
  it('adds a shoot to someone Rounds has, and they become a Regular after three', () => {
    const had = { ...newPerson({ id: 'm', name: 'Maya', instagram: 'maya.rr', photoKey: 'old' }, T), shoots: ['x', 'y'], lastShot: '2026-11-12' };
    const { changed } = bringIn([had], [shoot('s1', '2026-11-11', { talents: [maya] })], [], T, ids());
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ id: 'm', name: 'Maya', group: 'regular', shoots: ['x', 'y', 's1'], lastShot: '2026-11-12', photoKey: 'old', next: move('checkin', '2026-12-23') });
  });
  it('takes a handle or photo from The Eye when Rounds has none', () => {
    const had = newPerson({ id: 'm', name: 'Maya R.' }, T);
    const { changed } = bringIn([had], [shoot('s1', T, { talents: [maya] })], [], T, ids());
    expect(changed[0]).toMatchObject({ id: 'm', instagram: 'maya.rr', photoKey: 's1__talent_t1' });
  });
  it('keeps a group picked by hand, and leaves the moves of someone let go', () => {
    const picked = { ...newPerson({ id: 'a', name: 'Ana' }, T), groupPicked: true, shoots: ['x', 'y'] };
    const gone = { ...newPerson({ id: 'b', name: 'Bo', next: null }, T), letGo: true };
    const { changed } = bringIn([picked, gone], [shoot('s1', T, { talents: [{ name: 'Ana' }, { name: 'Bo' }] })], [], T, ids());
    expect(changed.map((p) => [p.id, p.group, p.next])).toEqual([['a', 'new', move('thanks', T)], ['b', 'new', null]]);
  });
  it('counts a shoot once for someone on it twice, and goes through shoots in date order', () => {
    const s1 = shoot('s1', '2026-11-12', { talents: [{ name: 'Ana' }], teamMembers: [{ role: 'Styling', name: 'ana' }] });
    const s0 = shoot('s0', '2026-08-01', { status: 'delivered', title: '', talents: [{ name: 'Ana' }] });
    const { changed, seen } = bringIn([], [s1, s0], [], T, ids());
    expect(seen).toEqual(['s0', 's1']);
    expect(changed).toHaveLength(1);
    expect(changed[0]).toMatchObject({ where: 'Talent on a shoot', shoots: ['s0', 's1'], lastShot: '2026-11-12', next: move('thanks', T) });
  });
  it('gives someone from an old shoot a check-in, not a thank you', () => {
    const { changed } = bringIn([], [shoot('s0', '2026-08-01', { talents: [{ name: 'Ana' }] })], [], T, ids());
    expect(changed[0].next).toEqual(move('checkin', T));
  });
});
