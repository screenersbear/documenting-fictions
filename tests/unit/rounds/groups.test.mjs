// More than one group (people/NOTES.md, 15 Nov): someone on the team who
// books you is a Regular and a Client at once. Client's moves lead, the light
// check-ins come between them, one card at a time. rounds/data/plan.js, and
// where people come in or change: person.js, eye-people.js, csv.js, pitch.js.
import { describe, it, expect } from 'vitest';
import { groupsOf, inGroup, leadGroup, cleanGroups, inGroups, groupWords, toggleGroup, afterShoot, afterDone, regroup, becomesRegular, madeRegular, madeClient, move } from '../../../rounds/data/plan.js';
import { newPerson, fromImport, applyEdit, markDone, undoDone } from '../../../rounds/data/person.js';
import { shootPeople, bringIn } from '../../../rounds/data/eye-people.js';
import { rowOf } from '../../../rounds/data/csv.js';
import { answerPitch } from '../../../rounds/data/pitch.js';

const T = '2026-11-14';
const both = (next = null, more = {}) => ({ group: 'client', groups: ['regular', 'client'], next, shoots: [], groupPicked: false, ...more });
const ids = () => { let n = 0; return () => `p${++n}`; };

describe("someone's groups", () => {
  it('are their list, or their one group from before', () => {
    expect(groupsOf(both())).toEqual(['regular', 'client']);
    expect(groupsOf({ group: 'regular' })).toEqual(['regular']);
    expect(groupsOf({ group: 'client', groups: ['client', 'regular', 'nonsense'] })).toEqual(['regular', 'client']);
  });
  it('are the one group when a copy that keeps only that changed it', () => {
    expect(groupsOf({ group: 'prospect', groups: ['regular', 'client'] })).toEqual(['prospect']);
    expect(groupsOf({ group: 'nonsense' })).toEqual(['new']);
    expect(groupsOf({ group: 'new', groups: [] })).toEqual(['new']);
    expect(groupsOf({})).toEqual(['new']);
  });
  it('lead with Client, then the first in order', () => {
    expect(leadGroup(['regular', 'client'])).toBe('client');
    expect(leadGroup(['new', 'guest'])).toBe('new');
    expect(inGroup(both(), 'regular')).toBe(true);
    expect(inGroup(both(), 'new')).toBe(false);
  });
  it('drop Prospect once Client is in, and are never none', () => {
    expect(cleanGroups(['client', 'prospect', 'regular'])).toEqual(['regular', 'client']);
    expect(cleanGroups(['prospect', 'guest'])).toEqual(['prospect', 'guest']);
    expect(cleanGroups(['nonsense'])).toEqual(['new']);
    expect(cleanGroups(undefined)).toEqual(['new']);
    expect(inGroups({ id: 'a', group: 'prospect', next: 'kept' }, ['prospect', 'client'])).toEqual({ id: 'a', group: 'client', groups: ['client'], next: 'kept' });
  });
  it("turn on and off in Edit: Client and Prospect never together, never none", () => {
    expect(toggleGroup(['regular'], 'client')).toEqual(['regular', 'client']);
    expect(toggleGroup(['regular', 'client'], 'regular')).toEqual(['client']);
    expect(toggleGroup(['client'], 'client')).toEqual(['client']);
    expect(toggleGroup(['prospect'], 'client')).toEqual(['client']);
    expect(toggleGroup(['regular', 'client'], 'prospect')).toEqual(['regular', 'prospect']);
    expect(toggleGroup(['new'], 'guest')).toEqual(['new', 'guest']);
  });
  it('read as words', () => {
    expect(groupWords(both())).toBe('Regular. Client');
    expect(groupWords({ group: 'guest' })).toBe('Event guest');
  });
});

describe('after a shoot', () => {
  const shot = '2026-11-13';
  it("a Regular who's a Client and booked it: the client's thanks, the day after", () => {
    expect(afterShoot(both(), shot, T, true)).toEqual(move('thanks', '2026-11-14'));
  });
  it("one they didn't book, or a Regular who isn't a Client: the check-in", () => {
    expect(afterShoot(both(), shot, T, false)).toEqual(move('checkin', '2026-12-25'));
    expect(afterShoot({ group: 'regular' }, shot, T, true)).toEqual(move('checkin', '2026-12-25'));
  });
});

describe('after a move is done, one card at a time', () => {
  it("after the thanks, a check-in first, the client's move waiting behind it", () => {
    expect(afterDone(both(move('thanks', T)), T)).toEqual({ ...move('checkin', '2026-12-26'), waits: move('intros', '2027-02-12') });
  });
  it("another check-in while the client's move is further off", () => {
    const waits = move('intros', '2027-02-12');
    expect(afterDone(both({ ...move('checkin', T), waits }), T)).toEqual({ ...move('checkin', '2026-12-26'), waits });
  });
  it("the client's move wins once it's due by the next check-in, or the same day", () => {
    const waits = move('intros', '2027-01-10');
    expect(afterDone(both({ ...move('checkin', '2026-12-26'), waits }), '2026-12-26')).toEqual(waits);
    const same = move('refresh', '2027-02-06');
    expect(afterDone(both({ ...move('checkin', '2026-12-26'), waits: same }), '2026-12-26')).toEqual(same);
  });
  it('a Client alone takes the move that waited, or the next in turn', () => {
    const waits = move('intros', '2027-01-10');
    expect(afterDone({ group: 'client', next: { ...move('checkin', T), waits } }, T)).toEqual(waits);
    expect(afterDone({ group: 'client', next: move('intros', T) }, T)).toEqual(move('refresh', '2027-02-12'));
  });
  it('no longer a Client: the check-ins go on and nothing waits', () => {
    expect(afterDone({ group: 'regular', groups: ['regular'], next: { ...move('checkin', T), waits: move('intros', '2027-01-10') } }, T)).toEqual(move('checkin', '2026-12-26'));
  });
});

describe('changing groups', () => {
  it("keeps a next move that's one of any of their groups'", () => {
    expect(regroup({ next: move('checkin', T) }, ['client', 'regular'], T)).toEqual(move('checkin', T));
    expect(regroup({ next: move('pitch', T) }, ['regular', 'client'], T)).toEqual(move('intros', T));
  });
  it('a New person made Regular keeps being a Client', () => {
    const p = { group: 'client', groups: ['new', 'client'], shoots: ['a', 'b', 'c'], groupPicked: false };
    expect(becomesRegular(p)).toBe(true);
    expect(madeRegular(p)).toMatchObject({ group: 'client', groups: ['regular', 'client'] });
  });
  it('made a Client: Prospect drops away, Regular stays', () => {
    expect(madeClient({ group: 'regular' })).toMatchObject({ group: 'client', groups: ['regular', 'client'] });
    expect(madeClient({ group: 'prospect' })).toMatchObject({ group: 'client', groups: ['client'] });
  });
});

describe('a person in more than one group', () => {
  it("is made with their groups, and the leading one's first move", () => {
    expect(newPerson({ id: 'a', name: 'Iryna', groups: ['regular', 'client'] }, T)).toMatchObject({ group: 'client', groups: ['regular', 'client'], next: move('intros', T) });
    const [row] = fromImport([{ name: 'Iryna', groups: ['regular', 'client'] }], T, 3, () => 'x');
    expect(row).toMatchObject({ group: 'client', groups: ['regular', 'client'], next: move('intros', T) });
  });
  it("Edit's groups are picked by hand; the next move stays when it's still theirs", () => {
    const p = newPerson({ id: 'a', name: 'Iryna', group: 'regular' }, T);
    const q = applyEdit(p, { groups: ['regular', 'client'] }, T);
    expect(q).toMatchObject({ group: 'client', groups: ['regular', 'client'], groupPicked: true, next: move('checkin', T) });
    expect(applyEdit(q, { groups: ['client', 'regular'] }, T)).toEqual(q); // the same groups: nothing changes
    expect(applyEdit(p, { group: 'prospect' }, T)).toMatchObject({ group: 'prospect', groups: ['prospect'], next: move('pitch', T) });
    expect(applyEdit(p, { name: 'Iryna V.' }, T).groups).toEqual(['regular']);
  });
  it("Done keeps the client's move that waited in the log, and Undo puts it back", () => {
    const waits = move('intros', '2027-01-10');
    const p = { ...newPerson({ id: 'a', name: 'Iryna', groups: ['regular', 'client'] }, T), next: { ...move('checkin', T), waits } };
    const { person, log } = markDone(p, T);
    expect(log.waits).toEqual(waits);
    expect(person.next).toEqual({ ...move('checkin', '2026-12-26'), waits });
    expect(undoDone(person, { ...log, id: 'l1' }).next).toEqual({ ...move('checkin', T), waits });
  });
});

describe('booked you, from The Eye', () => {
  const shoot = (talents, team = []) => ({ id: 's1', date: '2026-11-13', status: 'captured', title: 'Iryna, headshots', talents, teamMembers: team });
  it('a talent marked Booked me booked you; the team never did', () => {
    const [t, m] = shootPeople(shoot([{ name: 'Iryna V.', bookedMe: true }], [{ name: 'Jo', role: 'Hair', bookedMe: true }]));
    expect(t.booked).toBe(true);
    expect(m.booked).toBe(false);
  });
  it("makes a Regular a Client too, with the client's thanks the day after", () => {
    const iryna = { ...newPerson({ id: 'i', name: 'Iryna V.', group: 'regular' }, T), shoots: ['x'] };
    const { changed } = bringIn([iryna], [shoot([{ name: 'Iryna V.', bookedMe: true }])], [], T, ids());
    expect(changed[0]).toMatchObject({ group: 'client', groups: ['regular', 'client'], next: move('thanks', '2026-11-14') });
  });
  it('someone new who booked you comes in New and a Client', () => {
    const { changed } = bringIn([], [shoot([{ name: 'Lindsey', bookedMe: true }, { name: 'Ana' }])], [], T, ids());
    expect(changed.map((p) => p.groups)).toEqual([['new', 'client'], ['new']]);
  });
});

describe('a file, and a yes', () => {
  it('reads more than one group in a cell', () => {
    expect(rowOf({ name: 'Iryna', group: 'Regular, Client' })).toMatchObject({ group: 'client', groups: ['regular', 'client'] });
    expect(rowOf({ name: 'Iryna', group: 'regular and clients' }).groups).toEqual(['regular', 'client']);
    expect(rowOf({ name: 'Bo', group: 'Prospect + Client' }).groups).toEqual(['client']);
  });
  it('a yes keeps their other groups, and taking it back puts them back', () => {
    const p = { id: 'a', name: 'Iryna', group: 'regular', groups: ['regular', 'prospect'], groupPicked: false, next: move('followup', T, 1) };
    const yes = answerPitch(p, 'yes', T);
    expect(yes).toMatchObject({ group: 'client', groups: ['regular', 'client'] });
    expect(answerPitch(yes, 'no', T)).toMatchObject({ group: 'regular', groups: ['regular', 'prospect'] });
    // An answer from before 15 Nov kept only the group.
    const old = { ...yes, pitch: { ...yes.pitch, before: { group: 'prospect', groupPicked: false, next: null } } };
    expect(answerPitch(old, 'waiting', T)).toMatchObject({ group: 'prospect', groups: ['prospect'] });
  });
});
