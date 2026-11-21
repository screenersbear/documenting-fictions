// rounds/data/merge-people.js: two people made one (Tightening Rounds,
// rounds/11): the one kept keeps its name, id and photo; the rest comes together.
import { describe, it, expect } from 'vitest';
import * as M from '../../../rounds/data/merge-people.js';

const lindsey = {
  id: 'l', name: 'Lindsey T.', group: 'client', groups: ['client'], groupPicked: false, instagram: 'lindsey.t', tiktok: '', website: '',
  email: '', where: 'Rooftop shoot', note: '', lists: { email: false, mail: false }, address: '', shoots: ['s1'], lastShot: '2026-10-01',
  lastMove: '2026-11-16', photoKey: '', source: 'eye', letGo: false, added: '2026-09-01', next: { kind: 'refresh', due: '2027-01-01', step: 0 },
};
const lindsay = {
  id: 'n', name: 'Lindsay Tran', group: 'new', groups: ['new', 'regular'], groupPicked: true, instagram: '', tiktok: 'lt', website: 'lt.com',
  email: 'l@t.com', where: 'Rooftop shoot', note: 'Does her own hair', lists: { email: true }, address: '1 Main St', shoots: ['s1', 's2'], lastShot: '2026-11-02',
  lastMove: '2026-10-01', photoKey: 's2__talent_1', source: 'added', letGo: false, added: '2026-08-01', next: { kind: 'checkin', due: '2026-11-20', step: 0 },
  pitched: '2026-10-01',
};

describe('mergePeople', () => {
  it('keeps the one picked, with what the other had that it did not', () => {
    expect(M.mergePeople(lindsey, lindsay)).toEqual({
      ...lindsey,
      group: 'client', groups: ['regular', 'new', 'client'], groupPicked: true, tiktok: 'lt', website: 'lt.com', email: 'l@t.com',
      where: 'Rooftop shoot', note: 'Does her own hair', lists: { email: true, mail: false }, address: '1 Main St',
      shoots: ['s1', 's2'], lastShot: '2026-11-02', lastMove: '2026-11-16', photoKey: 's2__talent_1', added: '2026-08-01',
      next: { kind: 'checkin', due: '2026-11-20', step: 0 }, pitched: '2026-10-01',
    });
  });
  it('the other way round: its name, its id', () => {
    const one = M.mergePeople(lindsay, lindsey);
    expect([one.id, one.name, one.instagram, one.photoKey, one.next.kind]).toEqual(['n', 'Lindsay Tran', 'lindsey.t', 's2__talent_1', 'checkin']);
  });
  it('puts two different notes together', () => {
    expect(M.mergePeople({ ...lindsey, note: 'Tall' }, lindsay).note).toBe('Tall. Does her own hair');
  });
  it('keeps the move of the one not let go; let go only when both were', () => {
    const gone = { ...lindsay, letGo: true };
    expect(M.mergePeople(lindsey, gone)).toMatchObject({ letGo: false, next: lindsey.next });
    expect(M.mergePeople(gone, lindsey)).toMatchObject({ letGo: false, next: lindsey.next });
    expect(M.mergePeople({ ...lindsey, letGo: true }, gone)).toMatchObject({ letGo: true, next: lindsey.next });
    expect(M.mergePeople({ ...lindsey, next: null }, { ...lindsay, next: null }).next).toBeNull();
    expect(M.mergePeople(lindsey, { ...lindsay, next: { kind: 'hello', due: '2027-02-01' } }).next).toBe(lindsey.next);
  });
  it('brings both lists of promises together, each once, the kept one\'s first', () => {
    const a = { id: 'a', mine: true, what: 'Send the selects', due: '', made: '2026-11-01', open: true };
    const b = { id: 'b', mine: false, what: 'Tag me in the post', due: '2026-11-30', made: '2026-11-02', open: true };
    expect(M.mergePeople({ ...lindsey, promises: [a] }, { ...lindsay, promises: [b, a] }).promises).toEqual([a, b]);
    expect(M.mergePeople(lindsey, { ...lindsay, promises: [b] }).promises).toEqual([b]);
  });
  it('adds no promises when neither had any', () => {
    expect('promises' in M.mergePeople(lindsey, { ...lindsay, promises: [] })).toBe(false);
    expect('promises' in M.mergePeople(lindsey, { ...lindsay, promises: 'nonsense' })).toBe(false);
  });
  it('copes with what an older record leaves out', () => {
    const bare = { id: 'b', name: 'B', group: 'new', letGo: false };
    expect(M.mergePeople(bare, { id: 'c', name: 'C', group: 'new', letGo: false })).toEqual({
      id: 'b', name: 'B', group: 'new', groups: ['new'], groupPicked: false, where: '', note: '', lists: { email: false, mail: false },
      shoots: [], lastShot: '', lastMove: '', added: '', letGo: false, next: null,
    });
  });
});

describe('movedLines and loggedWords', () => {
  const lines = [{ id: '1', personId: 'n', day: 'a' }, { id: '2', personId: 'l', day: 'b' }, { id: '3', personId: 'n', day: 'c' }, { id: '4', personId: 'n' }];
  it('the other one\'s lines, now the kept one\'s', () => {
    expect(M.movedLines(lines, 'n', 'l').map((l) => [l.id, l.personId])).toEqual([['1', 'l'], ['3', 'l'], ['4', 'l']]);
  });
  it('counts what was logged with them', () => {
    expect(M.loggedWords(lines, 'n')).toBe('2 things logged');
    expect(M.loggedWords(lines, 'l')).toBe('1 thing logged');
    expect(M.loggedWords(lines, 'x')).toBe('0 things logged');
  });
});
