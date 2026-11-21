// rounds/data/people-store.js: two people merged into one, with Undo, the
// one list of people told once Undo's gone; and someone deleted with
// everything logged with them (Tightening Rounds, rounds/11). Over Rounds'
// real database (fake-indexeddb) and the suite's shared files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let S; // rounds/data/people-store.js
let db; // rounds/data/db.js
let D; // window.DFData
const TODAY = '2026-11-16';
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 16, 10, 0, 0));
  D = await loadDFData();
  db = await import('../../../rounds/data/db.js');
  S = await import('../../../rounds/data/people-store.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const person = (id, name, o) => ({ id, name, group: 'new', groups: ['new'], added: '2026-10-01', letGo: false, shoots: [], lastMove: '', photoKey: '', instagram: '', next: null, ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest;
const lindsey = person('l', 'Lindsey T.', { instagram: 'lindsey.t', next: { kind: 'checkin', due: '2026-12-01', step: 0 } });
const lindsay = person('n', 'Lindsay Tran', { tiktok: 'lt', next: { kind: 'hello', due: '2026-11-20', step: 0 } });
const lines = [
  { id: 'm1', personId: 'n', kind: 'hello', day: '2026-11-01', at: 1 },
  { id: 'm2', personId: 'n', kind: 'note', day: '2026-11-02', at: 2, note: 'Tall' },
  { id: 'm3', personId: 'l', kind: 'checkin', day: '2026-10-01', at: 3 },
];
const bytes = (n) => new Uint8Array([n, n, n]).buffer;
const photoBytes = async (id) => { const b = await db.getPhoto(id); return b ? [...new Uint8Array(await b.arrayBuffer())] : null; };
const tombs = async () => (await db.exportData()).tombstones?.map((t) => t.id).sort() ?? [];

async function seed() {
  await db.savePeople([lindsey, lindsay]);
  for (const l of lines) await db.logMove(l);
}

describe('mergeInto and undoMerge', () => {
  it('one person, the other\'s lines theirs, the other gone (a tombstone); Undo puts both back', async () => {
    await seed();
    const undo = await S.mergeInto(await db.getPerson('l'), await db.getPerson('n'));
    const one = await db.listPeople();
    expect(one.map((p) => [p.id, p.name, p.tiktok, p.next.kind])).toEqual([['l', 'Lindsey T.', 'lt', 'hello']]);
    expect((await db.listMoves()).map((l) => [l.id, l.personId]).sort()).toEqual([['m1', 'l'], ['m2', 'l'], ['m3', 'l']]);
    expect(await tombs()).toContain('n');
    expect(undo.photo).toBe(false);
    await S.undoMerge(undo);
    expect((await db.listPeople()).map(strip).sort((a, b) => a.id.localeCompare(b.id))).toEqual([lindsey, lindsay]);
    expect((await db.listMoves()).map(strip).sort((a, b) => a.id.localeCompare(b.id))).toEqual(lines);
  });
  it('the other\'s own photo comes along when the one kept had none, and goes back with Undo', async () => {
    await seed();
    await db.savePhoto('n', bytes(7), 'image/jpeg');
    const undo = await S.mergeInto(await db.getPerson('l'), await db.getPerson('n'));
    expect(undo.photo).toBe(true);
    expect(await photoBytes('l')).toEqual([7, 7, 7]);
    expect(await photoBytes('n')).toBeNull();
    await S.undoMerge(undo);
    expect(await photoBytes('l')).toBeNull();
    expect(await photoBytes('n')).toEqual([7, 7, 7]);
  });
  it('the kept one\'s own photo (or The Eye\'s) stays; the other\'s goes with them', async () => {
    await seed();
    await db.savePhoto('l', bytes(1), 'image/jpeg');
    await db.savePhoto('n', bytes(7), 'image/jpeg');
    const undo = await S.mergeInto(await db.getPerson('l'), await db.getPerson('n'));
    expect([undo.photo, await photoBytes('l'), await photoBytes('n')]).toEqual([false, [1, 1, 1], null]);
    await db.savePeople([person('a', 'A', { photoKey: 's__talent_1' }), person('b', 'B')]);
    await db.savePhoto('b', bytes(2), 'image/png');
    expect((await S.mergeInto(await db.getPerson('a'), await db.getPerson('b'))).photo).toBe(false);
    expect(await photoBytes('a')).toBeNull();
  });
  it('someone with nothing logged merges too', async () => {
    await db.savePeople([lindsey, lindsay]);
    const undo = await S.mergeInto(lindsey, lindsay);
    expect(undo.lines).toEqual([]);
    await S.undoMerge(undo);
    expect(await db.listMoves()).toEqual([]);
  });
});

describe('joinShared', () => {
  it('makes their two records in the one list of people one', async () => {
    await D.gatherPeople([{ name: lindsey.name, instagram: lindsey.instagram, roundsId: 'l' }, { name: lindsay.name, roundsId: 'n' }]);
    expect(await D.peopleAll()).toHaveLength(2);
    await S.joinShared({ keep: lindsey, other: lindsay });
    const all = await D.peopleAll();
    expect(all).toHaveLength(1);
    expect(all[0].sigs).toEqual(expect.arrayContaining(['rounds:l', 'rounds:n']));
  });
  it('leaves the list be when it has them as one already, or one of them not at all', async () => {
    await D.gatherPeople([{ name: lindsey.name, instagram: lindsey.instagram, roundsId: 'l' }]);
    const spy = vi.spyOn(D, 'answerSame');
    await S.joinShared({ keep: lindsey, other: lindsay });
    await S.joinShared({ keep: lindsey, other: lindsey });
    expect(spy).not.toHaveBeenCalled();
  });
  it('does nothing outside the suite', async () => {
    window.DFData = undefined;
    await expect(S.joinShared({ keep: lindsey, other: lindsay })).resolves.toBeUndefined();
    window.DFData = D;
  });
});

describe('deletePerson', () => {
  it('takes them, their photo and everything logged with them (tombstones for sync), and the list forgets them', async () => {
    await seed();
    await db.savePhoto('n', bytes(7), 'image/jpeg');
    await D.publishThings('rounds', [{ id: 'n', kind: 'person', title: 'Lindsay Tran', people: [{ name: 'Lindsay Tran', tiktok: 'lt', roundsId: 'n' }] }]);
    await S.deletePerson(await db.getPerson('n'));
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['l']);
    expect((await db.listMoves()).map((l) => l.id)).toEqual(['m3']);
    expect(await photoBytes('n')).toBeNull();
    expect(await tombs()).toEqual(['m1', 'm2', 'n']);
    expect(await D.peopleAll()).toEqual([]);
    expect(await D.thingsAll()).toEqual([]);
  });
  it('someone with nothing logged, outside the suite', async () => {
    await db.savePeople([lindsey]);
    window.DFData = undefined;
    await S.deletePerson(lindsey);
    window.DFData = D;
    expect(await db.listPeople()).toEqual([]);
    expect(await tombs()).toEqual(['l']);
  });
});

describe('a yes passed to Ref goes with them', () => {
  const refOf = async (id) => (await D.linksWhere({ fromApp: 'rounds', fromId: id, type: 'new-client' }))[0] || null;
  const pass = (p) => D.saveLink({ fromApp: 'rounds', fromId: p.id, toApp: 'ref', toId: '', type: 'new-client', name: p.name, handle: p.instagram || '', pitched: '2026-11-02' });
  beforeEach(() => { window.DF_SUITE = { get: () => null }; });
  afterEach(() => { delete window.DF_SUITE; });
  it("a merge gives the other one's yes to the one kept, under the kept name; Undo gives it back", async () => {
    await seed();
    const l = await pass(lindsay);
    const undo = await S.mergeInto(await db.getPerson('l'), await db.getPerson('n'));
    expect(await refOf('n')).toBeNull();
    expect(await refOf('l')).toMatchObject({ id: l.id, name: 'Lindsey T.', handle: 'lindsey.t' });
    await S.undoMerge(undo);
    expect(await refOf('l')).toBeNull();
    expect(await refOf('n')).toMatchObject({ id: l.id, name: 'Lindsay Tran' });
  });
  it('a merge still goes through when the hand-offs cannot be read, and so does its Undo', async () => {
    await seed();
    await pass(lindsay);
    vi.spyOn(D, 'linksWhere').mockRejectedValue(new Error('blocked'));
    const undo = await S.mergeInto(await db.getPerson('l'), await db.getPerson('n'));
    expect(undo.ref).toBeNull();
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['l']);
    vi.spyOn(D, 'saveLink').mockRejectedValue(new Error('blocked'));
    await S.undoMerge({ ...undo, ref: { link: { id: 'x' } } });
    expect((await db.listPeople()).map((p) => p.id).sort()).toEqual(['l', 'n']);
  });
  it('a delete takes back a yes Ref has not made a board for, and leaves one it has', async () => {
    await seed();
    await pass(lindsay);
    await D.saveLink({ ...(await pass(lindsey)), toId: 'board-1' });
    await S.deletePerson(await db.getPerson('n'));
    expect(await refOf('n')).toBeNull();
    await S.deletePerson(await db.getPerson('l'));
    expect(await refOf('l')).toMatchObject({ toId: 'board-1' });
  });
  it('a delete still goes through when the hand-offs cannot be read', async () => {
    await seed();
    vi.spyOn(D, 'linksWhere').mockRejectedValue(new Error('blocked'));
    await S.deletePerson(await db.getPerson('n'));
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['l']);
  });
});
