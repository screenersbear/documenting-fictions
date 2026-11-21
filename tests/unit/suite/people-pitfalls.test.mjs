// Pitfalls we can see coming with one person in four notebooks (Starky, 21
// Nov: "if you delete a person, I don't think it should delete their mood
// board, even if it was attached to them"). Each test is a guard: what
// should never be lost or mixed up when people are deleted, merged or
// answered for in Rounds while Ref and The Eye have them too. Over Rounds'
// and Ref's real databases (fake-indexeddb) and the suite's shared files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D; // window.DFData
let rounds; // rounds/data/db.js
let store; // rounds/data/people-store.js
let toRef; // rounds/data/to-ref.js
let ref; // ref/data/db.js
let boardFor; // ref/data/client-board.js clientBoard
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 21, 10, 0, 0));
  D = await loadDFData();
  window.DF_SUITE = { get: () => null };
  vi.resetModules(); // each notebook's open database is cached in its module
  rounds = await import('../../../rounds/data/db.js');
  store = await import('../../../rounds/data/people-store.js');
  toRef = await import('../../../rounds/data/to-ref.js');
  ref = await import('../../../ref/data/db.js');
  ({ clientBoard: boardFor } = await import('../../../ref/data/client-board.js'));
});
afterEach(() => { delete window.DF_SUITE; vi.useRealTimers(); vi.restoreAllMocks(); });

const person = (id, name, o) => ({ id, name, group: 'client', groups: ['client'], added: '2026-10-01', letGo: false, shoots: [], lastMove: '', photoKey: '', instagram: '', next: null, ...o });
const june = person('j', 'June Park', { instagram: 'junepark', pitch: { answer: 'yes', on: '2026-11-20' } });
const listed = (p) => ({ name: p.name, instagram: p.instagram || '', roundsId: p.id });
const yesOf = async (id) => (await D.linksWhere({ fromApp: 'rounds', fromId: id, type: 'new-client' }))[0] || null;

// In Rounds, passed to Ref, and (started) a board Ref made for them, as
// START THE BOARD makes it, told to the one list of people as Ref tells it.
async function withBoard(p, started = true) {
  await rounds.savePeople([p]);
  const link = await toRef.passToRef(p, '2026-11-20');
  if (!started) return { link };
  const board = await ref.saveBoard(boardFor(link, 'portrait'));
  await D.saveLink({ ...link, toId: board.id });
  await D.publishThings('ref', [{ id: board.id, kind: 'board', title: board.name, people: [{ name: p.name, instagram: p.instagram }] }]);
  return { link, board };
}
const tellRounds = (list) => D.publishThings('rounds', list.map((p) => ({ id: p.id, kind: 'person', title: p.name, people: [listed(p)] })));

describe('deleting a person never deletes their mood board', () => {
  it('in Rounds: the board Ref started stays whole, still theirs, and the shelf still has them through it', async () => {
    const { board } = await withBoard(june);
    await tellRounds([june]);
    await store.deletePerson(await rounds.getPerson('j'));
    expect(await rounds.getPerson('j')).toBeUndefined();
    const kept = await ref.getBoard(board.id);
    expect(kept).toMatchObject({ name: 'June Park', client: { name: 'June Park', handle: 'junepark' } });
    expect(kept.pages).toHaveLength(3);
    expect(await yesOf('j')).toMatchObject({ toId: board.id });
    expect((await D.thingsAll()).map((t) => [t.app, t.title])).toEqual([['ref', 'June Park']]);
    expect((await D.peopleAll()).map((r) => r.name)).toEqual(['June Park']);
  });
  it('an offer Ref never started goes with them, and no board is made or touched', async () => {
    await withBoard(june, false);
    await store.deletePerson(await rounds.getPerson('j'));
    expect(await yesOf('j')).toBeNull();
    expect(await ref.listBoards()).toEqual([]);
  });
  it('a yes changed to Not now after the board started leaves the board and its link', async () => {
    const { board } = await withBoard(june);
    await toRef.takeBackFromRef(june);
    expect(await ref.getBoard(board.id)).toBeTruthy();
    expect(await yesOf('j')).toMatchObject({ toId: board.id });
  });
});

describe('merging two people keeps both boards', () => {
  it('each with a board Ref started: both boards stay, each still linked', async () => {
    const jp = person('p', 'J. Park', { instagram: 'jpark', pitch: { answer: 'yes', on: '2026-11-19' } });
    const a = await withBoard(june);
    const b = await withBoard(jp);
    await store.mergeInto(await rounds.getPerson('p'), await rounds.getPerson('j'));
    expect((await ref.listBoards()).map((x) => x.id).sort()).toEqual([a.board.id, b.board.id].sort());
    expect(await yesOf('p')).toMatchObject({ toId: b.board.id });
    expect(await yesOf('j')).toMatchObject({ toId: a.board.id });
  });
});

describe('deleting someone on a shoot in The Eye', () => {
  it("keeps the shoot's people, and them on the shelf, with The Eye's find of them", async () => {
    await rounds.savePeople([june]);
    await tellRounds([june]);
    await D.publishThings('the-eye', [{ id: 's1', kind: 'shoot', title: 'Rooftop', day: '2026-11-25', people: [{ name: 'June Park', instagram: 'junepark', role: 'Talent' }] }]);
    await store.deletePerson(await rounds.getPerson('j'));
    expect((await D.thingsAll()).map((t) => [t.app, t.title])).toEqual([['the-eye', 'Rooftop']]);
    const [r] = await D.peopleAll();
    expect(r).toMatchObject({ name: 'June Park', instagram: 'junepark' });
    expect(r.sigs).not.toContain('rounds:j');
  });
});

describe('two people with the same name', () => {
  const alexA = person('a', 'Alex Kim', { group: 'new', groups: ['new'] });
  const alexB = person('b', 'Alex Kim', { group: 'new', groups: ['new'] });
  it('stay two people on the shelf, asked about, not one', async () => {
    await rounds.savePeople([alexA, alexB]);
    await tellRounds([alexA, alexB]);
    const all = await D.peopleAll();
    expect(all).toHaveLength(2);
    expect(all.map((r) => r.sigs)).toEqual(expect.arrayContaining([['rounds:a'], ['rounds:b']]));
  });
  it('deleting one leaves the other, with everything of theirs', async () => {
    await rounds.savePeople([alexA, alexB]);
    await tellRounds([alexA, alexB]);
    await store.deletePerson(await rounds.getPerson('a'));
    expect((await rounds.listPeople()).map((p) => p.id)).toEqual(['b']);
    const all = await D.peopleAll();
    expect(all.map((r) => r.sigs)).toEqual([['rounds:b']]);
    expect((await D.thingsAll()).map((t) => t.key)).toEqual([expect.stringContaining('b')]);
  });
});
