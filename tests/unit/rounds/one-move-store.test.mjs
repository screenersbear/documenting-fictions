// rounds/data/one-move-store.js: the one sheet saved (Tightening Rounds,
// rounds/08): the due move done with what you said, how and a note at once,
// or another move logged as an extra line; their Undo; and DELETE on What
// you said (rounds/09), with its Undo. Over Rounds' real database
// (fake-indexeddb) and the suite's shared files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let S; // rounds/data/one-move-store.js
let db; // rounds/data/db.js
const TODAY = '2026-11-16'; // a Monday
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await loadDFData();
  db = await import('../../../rounds/data/db.js');
  S = await import('../../../rounds/data/one-move-store.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const ana = (o) => ({ id: 'a', name: 'Ana Lee', group: 'regular', added: '2026-10-01', letGo: false, shoots: [], lastMove: '2026-10-01', next: { kind: 'checkin', due: TODAY, step: 0 }, ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest; // db.js stamps what it saves
const saved = async (id) => strip(await db.getPerson(id));
const pick = (marks = {}) => ({ date: TODAY, ids: ['a'], marks });
const told = () => vi.spyOn(window.DFWaiting, 'publishWaiting');
const FIELDS = { said: 'Hey Ana!', how: 'instagram', note: 'Wants a summer shoot' };

describe('saveOneMove: their due move', () => {
  it('is done with everything at once, its card marked done, and Undo puts it all back', async () => {
    const p = ana();
    await db.savePerson(p);
    await db.setSetting('pick', pick());
    const done = await S.saveOneMove(p, 'checkin', FIELDS);
    expect(done.line).toMatchObject({ kind: 'checkin', day: TODAY, said: 'Hey Ana!', how: 'instagram', note: 'Wants a summer shoot' });
    expect(done.line).not.toHaveProperty('extra');
    expect((await saved('a')).next.due).toBe('2026-12-28');
    expect(await db.getSetting('pick', null)).toEqual(pick({ a: 'done' }));
    await S.undoOneMove(done);
    expect(await saved('a')).toEqual(p);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getSetting('pick', null)).toEqual(pick());
  });
});

describe('saveOneMove: another move', () => {
  it('is an extra line that counts as keeping in touch; the card stays; Undo takes it back', async () => {
    const p = ana({ next: { kind: 'checkin', due: '2026-11-20', step: 0 } });
    await db.savePerson(p);
    await db.setSetting('pick', pick());
    const spy = told();
    const done = await S.saveOneMove(p, 'pitch', FIELDS);
    expect(strip(done.line)).toEqual({ id: done.line.id, at: NOW, personId: 'a', kind: 'pitch', day: TODAY, extra: true, keeps: true, ...FIELDS, wasLast: '2026-10-01', moved: { from: '2026-11-20', to: '2026-12-28' } });
    expect(await saved('a')).toEqual({ ...p, lastMove: TODAY, next: { ...p.next, due: '2026-12-28' } });
    expect((await db.listMoves()).map(strip)).toEqual([done.line]);
    expect(await db.getSetting('pick', null)).toEqual(pick());
    await vi.waitFor(() => expect(spy).toHaveBeenCalled());
    await S.undoOneMove(done);
    expect(await saved('a')).toEqual(p);
    expect(await db.listMoves()).toEqual([]);
  });
  it('one that moves nothing saves only its line (Other, for someone with a pitch next)', async () => {
    const p = ana({ next: { kind: 'pitch', due: '2026-11-20', step: 0 }, lastMove: TODAY });
    await db.savePerson(p);
    const before = await db.getPerson('a');
    const done = await S.saveOneMove(before, 'other', {});
    expect(done.line).toMatchObject({ kind: 'other', extra: true });
    expect((await db.getPerson('a')).updatedAt).toBe(before.updatedAt);
    await S.undoOneMove(done);
    expect(await db.listMoves()).toEqual([]);
  });
});

describe('deleteLine', () => {
  it('a due move done today: due again, its card back; Undo puts the line and the card back', async () => {
    const p = ana();
    await db.savePerson(p);
    await db.setSetting('pick', pick());
    const { after, line } = await S.saveOneMove(p, 'checkin', FIELDS);
    const gone = await S.deleteLine(after, line);
    expect(gone.undone).toBe(true);
    expect((await saved('a')).next).toEqual(p.next);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getSetting('pick', null)).toEqual(pick());
    await S.undoDelete(gone);
    expect((await saved('a')).next.due).toBe('2026-12-28');
    expect((await db.listMoves()).map(strip)).toEqual([line]);
    expect(await db.getSetting('pick', null)).toEqual(pick({ a: 'done' }));
  });
  it('an extra one takes back what it moved, and leaves the card be', async () => {
    const p = ana({ next: { kind: 'checkin', due: '2026-11-20', step: 0 } });
    await db.savePerson(p);
    await db.setSetting('pick', pick({ a: 'later' }));
    const { after, line } = await S.saveOneMove(p, 'hello', {});
    const gone = await S.deleteLine(after, line);
    expect(gone.undone).toBe(false);
    expect(await saved('a')).toEqual(p);
    await S.undoDelete(gone);
    expect((await saved('a')).next.due).toBe('2026-12-28');
    expect(await db.getSetting('pick', null)).toEqual(pick({ a: 'later' }));
  });
});
