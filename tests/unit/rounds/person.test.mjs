// rounds/data/person.js: a person as Rounds keeps them, and what happens to them.
import { describe, it, expect } from 'vitest';
import { newPerson, fromImport, markDone, markLater, applyEdit, letGo, bringBack } from '../../../rounds/data/person.js';
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
    expect(log).toEqual({ personId: 'd', kind: 'intros', day: T });
    expect(person.lastMove).toBe(T);
    expect(person.next).toEqual(move('refresh', '2027-02-12'));
    expect(dana.lastMove).toBe(''); // the old one stays as it was
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
