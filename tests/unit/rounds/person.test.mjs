// rounds/data/person.js: a person as Rounds keeps them, and what happens to them.
import { describe, it, expect } from 'vitest';
import { newPerson, fromImport, markDone, undoDone, draftWaiting, markLater, applyEdit, letGo, bringBack } from '../../../rounds/data/person.js';
import { move } from '../../../rounds/data/plan.js';

const T = '2026-11-14';
const ids = () => { let n = 0; return () => `p${++n}`; };

describe('newPerson', () => {
  it('keeps a name, cleaned handles and where you met; no lists, shoots or moves yet', () => {
    const p = newPerson({ id: 'x', name: ' Maya R. ', instagram: '@maya.rr', tiktok: ' @maya ', website: 'maya.com', email: ' m@maya.com ', where: ' Brooklyn meetup ', note: ' Lovely ' }, T);
    expect(p).toEqual({
      id: 'x', name: 'Maya R.', group: 'new', groupPicked: false, instagram: 'maya.rr', tiktok: 'maya', website: 'https://maya.com',
      email: 'm@maya.com', where: 'Brooklyn meetup', note: 'Lovely', lists: { email: false, mail: false }, address: '',
      shoots: [], lastShot: '', lastMove: '', photoKey: '', source: 'added', letGo: false, added: T, next: move('hello', T),
    });
  });
  it('starts with the group\'s first move, or the one given (null for none)', () => {
    expect(newPerson({ id: 'x', name: 'Shop', group: 'prospect' }, T).next).toEqual(move('pitch', T));
    expect(newPerson({ id: 'x', name: 'Ana', next: null, source: 'eye', photoKey: 's1__talent_t1' }, T)).toMatchObject({ next: null, source: 'eye', photoKey: 's1__talent_t1', email: '', where: '', note: '' });
  });
});

describe('fromImport', () => {
  const rows = ['A', 'B', 'C', 'D', 'E'].map((name) => ({ name, group: 'prospect', instagram: '', website: '', email: '', where: '', note: '', firstMove: null }));
  it('spreads the first moves out, never more than the day\'s limit on one day', () => {
    const people = fromImport(rows, T, 2, ids());
    expect(people.map((p) => [p.id, p.next.due])).toEqual([['p1', T], ['p2', T], ['p3', '2026-11-15'], ['p4', '2026-11-15'], ['p5', '2026-11-16']]);
    expect(people.every((p) => p.source === 'import' && p.next.kind === 'pitch')).toBe(true);
  });
  it('uses the file\'s first move when it has one', () => {
    const [p] = fromImport([{ ...rows[0], group: 'client', firstMove: 'hello' }], T, 3, ids());
    expect(p.next).toEqual(move('hello', T));
    expect(p.group).toBe('client');
    const [q] = fromImport([{ ...rows[0], group: 'client', firstMove: 'wave' }], T, 3, ids());
    expect(q.next).toEqual(move('intros', T));
  });
});

describe('markDone and markLater', () => {
  const dana = newPerson({ id: 'd', name: 'Dana', group: 'client' }, T);
  it('logs the move and plans the next', () => {
    const { person, log } = markDone(dana, T);
    expect(log).toEqual({ personId: 'd', kind: 'intros', day: T, due: T, step: 0 });
    expect(person.lastMove).toBe(T);
    expect(person.next).toEqual(move('refresh', '2027-02-12'));
    expect(dana.lastMove).toBe(''); // the old one stays as it was
  });
  it('logs a move that was waiting with the day it was due and its step', () => {
    const late = { ...newPerson({ id: 'q', name: 'Q', group: 'prospect' }, T), next: move('followup', '2026-11-10', 1) };
    expect(markDone(late, T).log).toEqual({ personId: 'q', kind: 'followup', day: T, due: '2026-11-10', step: 1 });
  });
  it('moves LATER to tomorrow', () => {
    const p = markLater(dana, T);
    expect(p.next).toEqual(move('intros', '2026-11-15'));
    expect(dana.next.due).toBe(T);
  });
});

describe('applyEdit', () => {
  const maya = newPerson({ id: 'm', name: 'Maya', instagram: 'maya.rr' }, T);
  it('changes only what is given, cleaned', () => {
    const p = applyEdit(maya, { name: ' Maya Reyes ', instagram: 'instagram.com/maya.r', tiktok: '@mr', website: 'maya.com', email: ' a@b.c ', where: ' Shoot ', note: ' Hi ', address: ' 1 Main St ', lists: { email: 1, mail: 0 } }, T);
    expect(p).toMatchObject({ name: 'Maya Reyes', instagram: 'maya.r', tiktok: 'mr', website: 'https://maya.com', email: 'a@b.c', where: 'Shoot', note: 'Hi', address: '1 Main St', lists: { email: true, mail: false } });
    expect(p.group).toBe('new');
    expect(p.groupPicked).toBe(false);
    expect(applyEdit(maya, {}, T)).toEqual(maya);
  });
  it('never empties a name', () => {
    expect(applyEdit(maya, { name: '  ' }, T).name).toBe('Maya');
  });
  it('a new group picks the next move and stops The Eye changing the group', () => {
    const p = applyEdit(maya, { group: 'regular' }, T);
    expect(p).toMatchObject({ group: 'regular', groupPicked: true, next: move('checkin', T) });
    expect(applyEdit(maya, { group: 'new' }, T).groupPicked).toBe(false);
  });
});

describe('letGo and bringBack', () => {
  const maya = newPerson({ id: 'm', name: 'Maya' }, T);
  it('lets someone go, keeping everything', () => {
    expect(letGo(maya)).toEqual({ ...maya, letGo: true });
  });
  it('brings them back with their move, or their group\'s first', () => {
    expect(bringBack(letGo(maya), T)).toEqual(maya);
    expect(bringBack({ ...letGo(maya), next: null, group: 'prospect' }, T).next).toEqual(move('pitch', T));
  });
});

describe('undoDone', () => {
  const prospect = newPerson({ id: 'a', name: 'Abrams', group: 'prospect' }, T);
  it('puts back the move exactly as it was, from a line with its due day and step', () => {
    const was = { ...prospect, next: move('followup', '2026-11-10', 1), lastMove: '2026-11-03' };
    const { person, log } = markDone(was, T);
    const line = { id: 'l2', ...log };
    const lines = [{ id: 'l1', personId: 'a', kind: 'pitch', day: '2026-11-03' }, line];
    expect(undoDone(person, line, lines)).toEqual(was);
  });
  it('a swiped pitch comes back as the pitch, due that day', () => {
    const { person, log } = markDone(prospect, T);
    expect(person.next).toEqual(move('followup', '2026-11-21', 1));
    expect(undoDone(person, { id: 'l', ...log }, [{ id: 'l', ...log }])).toEqual(prospect);
  });
  it('a line from before 14 Nov (only its kind and day) gives the move due that day', () => {
    const after = { ...prospect, lastMove: T, next: move('followup', '2026-11-21', 1) };
    const back = undoDone(after, { id: 'old', personId: 'a', kind: 'pitch', day: '2026-11-13' });
    expect(back.next).toEqual(move('pitch', '2026-11-13', 0));
    expect(back.lastMove).toBe('');
  });
  it('an older follow up line takes the step before the one planned now', () => {
    const line = { id: 'old', personId: 'a', kind: 'followup', day: T };
    expect(undoDone({ ...prospect, next: move('followup', '2026-12-05', 2) }, line).next).toEqual(move('followup', T, 1));
    expect(undoDone({ ...prospect, next: move('followup', '2026-12-05', 0) }, line).next.step).toBe(0);
  });
  it("an older line for a prospect's last follow up (nothing planned after) was step 2", () => {
    const line = { id: 'old', personId: 'a', kind: 'followup', day: T };
    expect(undoDone({ ...prospect, next: null }, line).next).toEqual(move('followup', T, 2));
  });
  it('an older follow up for anyone else, or with another move planned, was step 0', () => {
    const line = { id: 'old', personId: 'n', kind: 'followup', day: T };
    const fresh = newPerson({ id: 'n', name: 'N' }, T);
    expect(undoDone({ ...fresh, next: move('checkin', '2026-12-26') }, line).next).toEqual(move('followup', T, 0));
    expect(undoDone({ ...fresh, next: null }, line).next.step).toBe(0);
    expect(undoDone({ ...prospect, next: move('hello', T) }, line).next.step).toBe(0);
  });
  it('a step kept on the line wins, even 0', () => {
    const line = { id: 'l', personId: 'a', kind: 'followup', day: T, due: '2026-11-12', step: 0 };
    expect(undoDone({ ...prospect, next: move('followup', '2026-12-05', 2) }, line).next).toEqual(move('followup', '2026-11-12', 0));
    expect(undoDone({ ...prospect, next: move('followup', '2026-12-05', 2) }, { ...line, step: 'x' }).next.step).toBe(1);
  });
  it("the last move goes back to the latest of their other lines, not anyone else's", () => {
    const lines = [
      { id: 'l1', personId: 'a', kind: 'pitch', day: '2026-10-20' },
      { id: 'l2', personId: 'a', kind: 'followup', day: '2026-10-27' },
      { id: 'zz', personId: 'b', kind: 'pitch', day: '2026-11-13' },
      { id: 'l3', personId: 'a', kind: 'followup', day: T },
    ];
    expect(undoDone({ ...prospect, lastMove: T, next: null }, lines[3], lines).lastMove).toBe('2026-10-27');
    expect(undoDone({ ...prospect, lastMove: T }, lines[3], [lines[3]]).lastMove).toBe('');
  });
  it('keeps everything else about them, and leaves the person given as it was', () => {
    const after = { ...prospect, note: 'Big agency', lastMove: T, next: move('followup', '2026-11-21', 1) };
    const back = undoDone(after, { id: 'l', personId: 'a', kind: 'pitch', day: T, due: T, step: 0 });
    expect(back.note).toBe('Big agency');
    expect(back.name).toBe('Abrams');
    expect(after.next).toEqual(move('followup', '2026-11-21', 1));
    expect(after.lastMove).toBe(T);
  });
});

describe("Claude's drafts", () => {
  const pitch = { ...newPerson({ id: 'a', name: 'Abrams', group: 'prospect' }, T), draft: { kind: 'pitch', where: 'Gmail', added: T } };
  it('a draft for the move that is next is waiting', () => {
    expect(draftWaiting(pitch)).toBe(true);
  });
  it('a draft for another move, no draft, or no move: not', () => {
    expect(draftWaiting({ ...pitch, next: move('followup', T, 1) })).toBe(false);
    expect(draftWaiting({ ...pitch, draft: undefined })).toBe(false);
    expect(draftWaiting({ ...pitch, next: null })).toBe(false);
  });
  it('the move done uses the draft up; LATER keeps it', () => {
    expect('draft' in markDone(pitch, T).person).toBe(false);
    expect(markLater(pitch, T).draft).toEqual(pitch.draft);
    expect(pitch.draft.kind).toBe('pitch');
  });
});
