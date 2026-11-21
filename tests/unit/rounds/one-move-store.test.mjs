// rounds/data/one-move-store.js: the one sheet saved (Tightening Rounds,
// rounds/08): the due move done with what you said, how and a note at once,
// or another move logged as an extra line; their Undo; and DELETE on What
// you said (rounds/09), with its Undo. Over Rounds' real database
// (fake-indexeddb) and the suite's shared files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let S; // rounds/data/one-move-store.js
let db; // rounds/data/db.js
let PS; // rounds/data/promise-store.js
const TODAY = '2026-11-16'; // a Monday
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await loadDFData();
  db = await import('../../../rounds/data/db.js');
  S = await import('../../../rounds/data/one-move-store.js');
  PS = await import('../../../rounds/data/promise-store.js');
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
    expect(strip(done.line)).toEqual({ id: done.line.id, at: NOW, personId: 'a', kind: 'pitch', day: TODAY, extra: true, keeps: true, ...FIELDS, was: {}, wasLast: '2026-10-01', moved: { from: '2026-11-20', to: '2026-12-28' } });
    // A Pitch keeps its day, so their page asks how it went (21 Nov).
    expect(await saved('a')).toEqual({ ...p, lastMove: TODAY, pitched: TODAY, next: { ...p.next, due: '2026-12-28' } });
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

describe('saveOneMove: a promise made with it (21 Nov)', () => {
  it('is kept with them, tied to the move; Undo takes the move and the promise back', async () => {
    const p = ana();
    await db.savePerson(p);
    const done = await S.saveOneMove(p, 'checkin', FIELDS, { promise: { what: 'Send the selects', mine: true, due: '2026-11-20' } });
    expect(done.promised).toBe(true);
    expect(done.kept).toBe(false);
    const { promises } = await saved('a');
    expect(promises).toHaveLength(1);
    expect(promises[0]).toMatchObject({ what: 'Send the selects', mine: true, due: '2026-11-20', made: TODAY, open: true, moveId: done.line.id });
    expect(promises[0].id).toMatch(/^pr-/);
    await S.undoOneMove(done);
    expect(await saved('a')).toEqual(p);
  });
  it('on another move too, theirs; nothing typed makes none', async () => {
    const p = ana({ next: { kind: 'checkin', due: '2026-11-20', step: 0 } });
    await db.savePerson(p);
    const done = await S.saveOneMove(p, 'pitch', {}, { promise: { what: 'Intro to Dev', mine: false } });
    expect((await saved('a')).promises).toMatchObject([{ what: 'Intro to Dev', mine: false, moveId: done.line.id }]);
    await S.undoOneMove(done);
    expect(await saved('a')).toEqual(p);
    const none = await S.saveOneMove(p, 'pitch', {}, { promise: { what: '  ' } });
    expect(none.promised).toBe(false);
    expect((await saved('a')).promises).toBeUndefined();
  });
  it('someone not saved: the move is logged, and no promise', async () => {
    const ghost = ana({ id: 'ghost', next: { kind: 'pitch', due: '2026-11-20', step: 0 }, lastMove: TODAY });
    const done = await S.saveOneMove(ghost, 'other', {}, { promise: { what: 'Send the selects' } });
    expect(done.promised).toBe(false);
    expect(await db.getPerson('ghost')).toBeFalsy();
  });
  it('KEPT IT, logged: the promise closed by this move; Undo opens it again', async () => {
    const promise = { id: 'p1', mine: true, what: 'Send the selects', due: TODAY, made: '2026-11-10', open: true };
    const p = ana({ promises: [promise] });
    await db.savePerson(p);
    const done = await S.saveOneMove(p, 'other', { said: 'Here they are' }, { keeps: promise });
    expect(done.kept).toBe(true);
    expect(done.promised).toBe(false);
    expect((await saved('a')).promises).toEqual([{ ...promise, open: false, outcome: 'kept', closed: TODAY, keptBy: done.line.id }]);
    await S.undoOneMove(done);
    expect((await saved('a')).promises).toEqual([promise]);
  });
});

describe('saveLinePromise: EDIT on a logged move', () => {
  it('adds one to a move that had none', async () => {
    const p = ana();
    await db.savePerson(p);
    const { after, line } = await S.saveOneMove(p, 'checkin', FIELDS);
    const changed = await S.saveLinePromise(after, line, { what: 'Print the cover', mine: true });
    expect(changed.gone).toBe(false);
    expect((await saved('a')).promises).toMatchObject([{ what: 'Print the cover', moveId: line.id, open: true }]);
  });
  it('ticks it kept, and nothing changed gives null', async () => {
    const p = ana();
    await db.savePerson(p);
    const { after, line } = await S.saveOneMove(p, 'checkin', FIELDS, { promise: { what: 'Print the cover' } });
    expect(await S.saveLinePromise(after, line, { what: 'Print the cover', mine: true, due: '' })).toBe(null);
    await S.saveLinePromise(after, line, { what: 'Print the cover', mine: true, due: '', kept: true });
    expect((await saved('a')).promises[0]).toMatchObject({ open: false, outcome: 'kept', closed: TODAY });
  });
  it('its words cleared: taken off, and Undo puts it back', async () => {
    const p = ana();
    await db.savePerson(p);
    const { after, line } = await S.saveOneMove(p, 'checkin', FIELDS, { promise: { what: 'Print the cover' } });
    const had = (await saved('a')).promises;
    const changed = await S.saveLinePromise(after, line, null);
    expect(changed.gone).toBe(true);
    expect((await saved('a')).promises).toEqual([]);
    await PS.undoChange(changed.undo);
    expect((await saved('a')).promises).toEqual(had);
  });
  it('someone gone: null', async () => {
    expect(await S.saveLinePromise(ana({ id: 'zz' }), { id: 'l1' }, { what: 'x' })).toBe(null);
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
