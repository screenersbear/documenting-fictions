// ref/data/people-in.js: someone renamed, or given a new handle, elsewhere
// (their person page, or Rounds) comes into Ref: their boards say the new
// name and handle, and a board still named for them takes the new name
// (refining round, 21 Nov).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
let P; // ref/data/people-in.js
let db; // ref/data/db.js
beforeEach(async () => {
  localStorage.clear();
  D = await loadDFData();
  P = await import('../../../ref/data/people-in.js');
  db = await import('../../../ref/data/db.js');
});
afterEach(() => { vi.restoreAllMocks(); });

const board = (o) => ({ id: 'b1', name: 'June Park', pages: [], client: { name: 'June Park', handle: 'junepark' }, ...o });
const boards = async () => Object.fromEntries((await db.listBoards()).map((b) => [b.id, [b.name, b.client?.name, b.client?.handle]]));

describe('boardAfter', () => {
  it('gives a board named for them the new name and handle', () => {
    expect(P.boardAfter(board(), { name: 'June Ortiz', instagram: 'june.o' })).toMatchObject({ name: 'June Ortiz', client: { name: 'June Ortiz', handle: 'june.o' } });
  });
  it('keeps a board name of its own, and never leaves who it is for blank', () => {
    const b = P.boardAfter(board({ name: 'Rooftop' }), { name: ' ', instagram: 'june.o' });
    expect(b).toMatchObject({ name: 'Rooftop', client: { name: 'June Park', handle: 'june.o' } });
  });
  it('gives back the same board when nothing changed', () => {
    const b = board();
    expect(P.boardAfter(b, { name: 'June Park ', instagram: 'junepark' })).toBe(b);
    const none = board({ client: { name: 'June Park' } });
    expect(P.boardAfter(none, { name: 'June Park', instagram: '' })).toBe(none);
  });
});

describe('takePeopleEdits', () => {
  async function seedJune() {
    await db.saveBoard(board());
    await db.saveBoard(board({ id: 'b2', name: 'Rooftop' }));
    await db.saveBoard(board({ id: 'b3', name: 'Bo', client: { name: 'Bo Lee', handle: '' } }));
    await db.saveBoard({ id: 'b4', name: 'Loose', pages: [] });
    await db.saveBoard(board({ id: 'b5', name: 'Blank', client: { name: ' ' } }));
    const [r] = await D.gatherPeople([{ name: 'June Park', instagram: 'junepark' }, { name: 'Bo Lee' }]);
    return r;
  }
  it('takes a rename into each board for them, once', async () => {
    await seedJune();
    const june = await D.personFor({ name: 'June Park', instagram: 'junepark' });
    expect(await P.takePeopleEdits()).toEqual([]);
    await D.editPerson(june.id, { name: 'June Ortiz', instagram: 'june.o' });
    const changed = await P.takePeopleEdits();
    expect(changed.map((b) => b.id).sort()).toEqual(['b1', 'b2']);
    expect(await boards()).toMatchObject({
      b1: ['June Ortiz', 'June Ortiz', 'june.o'], b2: ['Rooftop', 'June Ortiz', 'june.o'], b3: ['Bo', 'Bo Lee', ''],
    });
    expect(await P.takePeopleEdits()).toEqual([]);
  });
  it('passes over someone whose edit leaves their boards as they are, and boards for no one in the list', async () => {
    await seedJune();
    await db.saveBoard(board({ id: 'b6', name: 'Cy', client: { name: 'Cy Moss', handle: 'cy' } }));
    const bo = await D.personFor({ name: 'Bo Lee' });
    await D.editPerson(bo.id, { name: 'Bo Lee', instagram: '' });
    expect(await P.takePeopleEdits()).toEqual([]);
  });
  it('still works when this device keeps nothing (private mode), taking the edit each time', async () => {
    await seedJune();
    const june = await D.personFor({ name: 'June Park', instagram: 'junepark' });
    await D.editPerson(june.id, { name: 'June Ortiz', instagram: 'junepark' });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect((await P.takePeopleEdits()).map((b) => b.id).sort()).toEqual(['b1', 'b2']);
    expect(await P.takePeopleEdits()).toEqual([]);
  });
  it('does nothing outside the suite or without the list loaded', async () => {
    window.DFData = { ...D, peopleAll: undefined };
    expect(await P.takePeopleEdits()).toEqual([]);
    window.DFData = undefined;
    expect(await P.takePeopleEdits()).toEqual([]);
    window.DFData = D;
  });
});
