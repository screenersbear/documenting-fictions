// rounds/data/moment-store.js: moments saved (round 2, thanks/05) from a
// person's page and Done today: added, changed and deleted, and Undo, over
// Rounds' real database (fake-indexeddb). The shelf's waiting list is told
// again only when a moment moved their next move.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let S; // rounds/data/moment-store.js
let db; // rounds/data/db.js
const TODAY = '2026-11-16'; // a Monday
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await loadDFData();
  db = await import('../../../rounds/data/db.js');
  S = await import('../../../rounds/data/moment-store.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const june = (o) => ({ id: 'j', name: 'June Park', group: 'regular', added: '2026-10-01', letGo: false, shoots: [], lastMove: '2026-10-01', next: { kind: 'checkin', due: '2026-11-20', step: 0 }, ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest; // db.js stamps what it saves
const saved = async (id) => strip(await db.getPerson(id));
const told = () => vi.spyOn(window.DFWaiting, 'publishWaiting');
const settle = () => new Promise((r) => setTimeout(r, 0));

describe('addMoment', () => {
  it('logs the moment and moves their Check in out; the shelf is told; Undo puts both back', async () => {
    await db.savePerson(june());
    const spy = told();
    const undo = await S.addMoment(june(), { what: 'photos', day: TODAY, note: 'Teasers.', keeps: true });
    await settle();
    const [line] = (await db.listMoves()).map(strip);
    expect(line).toMatchObject({ personId: 'j', kind: 'moment', day: TODAY, what: 'photos', keeps: true, note: 'Teasers.', at: NOW, moved: { from: '2026-11-20', to: '2026-12-28' }, wasLast: '2026-10-01' });
    expect(typeof line.id).toBe('string');
    expect(await saved('j')).toEqual(june({ lastMove: TODAY, next: { kind: 'checkin', due: '2026-12-28', step: 0 } }));
    expect(spy).toHaveBeenCalled();
    expect(undo).toEqual({ before: june(), line: expect.objectContaining({ id: line.id }) });
    await S.undoMomentAdd(undo);
    expect(await db.listMoves()).toEqual([]);
    expect(await saved('j')).toEqual(june());
  });
  it('one that doesn\'t count leaves them as they were, and the shelf isn\'t told', async () => {
    await db.savePerson(june());
    const before = await db.getPerson('j');
    const spy = told();
    await S.addMoment(june(), { what: 'text', day: TODAY, keeps: false });
    await settle();
    expect((await db.listMoves()).length).toBe(1);
    expect(await db.getPerson('j')).toEqual(before); // not even saved again
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('changeMoment', () => {
  it('taken out as it was, in again as it is now: the same line, a new day moves from there', async () => {
    await db.savePerson(june());
    const { line } = await S.addMoment(june(), { what: 'photos', day: TODAY, keeps: true });
    const now = await saved('j');
    const changed = await S.changeMoment(now, line, { what: 'call', day: '2026-11-10', note: 'Rang.', keeps: true });
    expect(changed).toMatchObject({ id: line.id, at: line.at, what: 'call', day: '2026-11-10', note: 'Rang.', moved: { from: '2026-11-20', to: '2026-12-22' } });
    expect((await db.listMoves()).map(strip)).toEqual([changed]);
    expect(await saved('j')).toEqual(june({ lastMove: '2026-11-10', next: { kind: 'checkin', due: '2026-12-22', step: 0 } }));
  });
  it('switched off: their move and last move go back', async () => {
    await db.savePerson(june());
    const { line } = await S.addMoment(june(), { what: 'photos', day: TODAY, keeps: true });
    await S.changeMoment(await saved('j'), line, { what: 'photos', day: TODAY, keeps: false });
    expect(await saved('j')).toEqual(june());
    expect((await db.listMoves()).map(strip)[0]).toMatchObject({ id: line.id, keeps: false });
  });
});

describe('dropMoment', () => {
  it('deleted: gone from the log, their move back; Undo puts it back as it was', async () => {
    await db.savePerson(june());
    const { line } = await S.addMoment(june(), { what: 'met', day: TODAY, keeps: true });
    const now = await saved('j');
    const undo = await S.dropMoment(now, line);
    expect(await db.listMoves()).toEqual([]);
    expect(await saved('j')).toEqual(june());
    expect(undo).toEqual({ before: now, line });
    await S.undoMomentDrop(undo);
    expect((await db.listMoves()).map(strip)).toEqual([line]);
    expect(await saved('j')).toEqual(now);
  });
});
