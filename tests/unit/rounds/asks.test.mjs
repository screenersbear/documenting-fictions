// rounds/data/asks.js: what the other notebooks ask Rounds to do (round 2,
// thanks): The Eye's SHE WROTE FIRST, and the person page's ADD A NOTE, a
// row changed and a note deleted. Rounds does each once, with its own functions.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';
import { askResult } from '../../../rounds/data/asks.js';
import { markDone } from '../../../rounds/data/person.js';

const T = '2026-11-15';
const ids = () => { let n = 0; return () => `id${++n}`; };
const person = (id, o) => ({ id, name: 'Lindsey Tran', group: 'new', added: '2026-11-01', letGo: false, shoots: ['s1'], lastMove: '', next: { kind: 'thanks', due: T, step: 0 }, ...o });
const note = { id: 'n1', at: 1, personId: 'p', kind: 'note', day: '2026-11-02', how: 'call', note: 'Booked.' };
const moveLine = { id: 'm1', at: 1, personId: 'p', kind: 'thanks', day: '2026-11-15', how: 'text', said: 'Thank you!' };

describe('askResult', () => {
  it('done: the move done with its note, as Rounds does it', () => {
    const p = person('p');
    const r = askResult({ do: 'done', personId: 'p', kind: 'thanks', note: 'Lindsey reached out first.' }, [p], [], T, ids(), 7);
    const { person: after, log } = markDone(p, T);
    expect(r).toEqual({ person: after, put: { id: 'id1', at: 7, ...log, note: 'Lindsey reached out first.' }, drop: '' });
  });
  it('done: nothing once the move is done already, changed, or the person let go or gone', () => {
    const none = { person: null, put: null, drop: '' };
    expect(askResult({ do: 'done', personId: 'p', kind: 'thanks' }, [person('p', { next: { kind: 'checkin', due: T, step: 0 } })], [], T, ids(), 1)).toEqual(none);
    expect(askResult({ do: 'done', personId: 'p', kind: 'thanks' }, [person('p', { next: null })], [], T, ids(), 1)).toEqual(none);
    expect(askResult({ do: 'done', personId: 'p', kind: 'thanks' }, [person('p', { letGo: true })], [], T, ids(), 1)).toEqual(none);
    expect(askResult({ do: 'done', personId: 'q', kind: 'thanks' }, [person('p')], [], T, ids(), 1)).toEqual(none);
  });
  it('note: a line of its own, on its day (or today)', () => {
    expect(askResult({ do: 'note', personId: 'p', day: '2026-11-02', how: 'call', note: 'Booked.' }, [person('p')], [], T, ids(), 3).put)
      .toEqual({ id: 'id1', at: 3, personId: 'p', kind: 'note', day: '2026-11-02', how: 'call', note: 'Booked.' });
    expect(askResult({ do: 'note', personId: 'p', note: 'Hi' }, [person('p')], [], T, ids(), 3).put.day).toBe(T);
    expect(askResult({ do: 'note', personId: 'p', how: 'text' }, [person('p')], [], T, ids(), 3).put.how).toBe('text');
  });
  it('note: nothing with no words and no what, or no such person', () => {
    expect(askResult({ do: 'note', personId: 'p', note: '' }, [person('p')], [], T, ids(), 3).put).toBeNull();
    expect(askResult({ do: 'note', personId: 'x', note: 'Hi' }, [person('p')], [], T, ids(), 3).put).toBeNull();
  });
  it('edit: a move keeps what you said, takes the new how and note', () => {
    expect(askResult({ do: 'edit', lineId: 'm1', how: 'person', note: 'Over coffee' }, [], [moveLine], T, ids(), 1).put)
      .toEqual({ ...moveLine, how: 'person', note: 'Over coffee' });
    expect(askResult({ do: 'edit', lineId: 'm1', how: 'call', note: '' }, [], [moveLine], T, ids(), 1).put).toEqual({ id: 'm1', at: 1, personId: 'p', kind: 'thanks', day: '2026-11-15', said: 'Thank you!' });
  });
  it('edit: a note takes a note\'s hows; nothing for a line that\'s gone', () => {
    expect(askResult({ do: 'edit', lineId: 'n1', how: 'email', note: 'Wrote.' }, [], [note], T, ids(), 1).put).toEqual({ ...note, how: 'email', note: 'Wrote.' });
    // The Eye's selects reminder on Instagram keeps its how when the note's changed.
    expect(askResult({ do: 'edit', lineId: 'n1', how: 'instagram', note: 'Sent.' }, [], [note], T, ids(), 1).put).toEqual({ ...note, how: 'instagram', note: 'Sent.' });
    expect(askResult({ do: 'edit', lineId: 'zz', how: 'email' }, [], [note], T, ids(), 1).put).toBeNull();
  });
  it('drop: only a note on its own', () => {
    expect(askResult({ do: 'drop', lineId: 'n1' }, [], [note, moveLine], T, ids(), 1).drop).toBe('n1');
    expect(askResult({ do: 'drop', lineId: 'm1' }, [], [note, moveLine], T, ids(), 1).drop).toBe('');
    expect(askResult({ do: 'drop', lineId: 'zz' }, [], [note], T, ids(), 1).drop).toBe('');
  });
  it('anything else, or no ask at all: nothing', () => {
    const none = { person: null, put: null, drop: '' };
    expect(askResult({ do: 'fly' }, [], [], T, ids(), 1)).toEqual(none);
    expect(askResult(null, [], [], T, ids(), 1)).toEqual(none);
    expect(askResult('x', [], [], T, ids(), 1)).toEqual(none);
  });
});

describe('takeAsks', () => {
  let D; let db; let A;
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 15, 10, 0, 0));
    D = await loadDFData();
    db = await import('../../../rounds/data/db.js');
    A = await import('../../../rounds/data/asks.js?' + Math.random());
  });
  afterEach(() => { vi.useRealTimers(); });
  const strip = ({ createdAt, updatedAt, ...rest }) => rest;

  it('does each ask waiting once, in order, and marks it taken', async () => {
    await db.savePeople([person('p'), person('other')]);
    await db.logMove(note);
    let s = 0;
    const later = () => vi.setSystemTime(new Date(2026, 10, 15, 10, 0, ++s)); // asks come a moment apart
    await D.askRounds('the-eye', { do: 'done', personId: 'p', kind: 'thanks', note: 'Lindsey reached out first.' }); later();
    await D.askRounds('shelf', { do: 'note', personId: 'p', day: T, how: 'text', note: 'Sent the selects.' }); later();
    await D.askRounds('shelf', { do: 'drop', personId: 'p', lineId: 'n1' }); later();
    await D.askRounds('shelf', { do: 'done', personId: 'p', kind: 'thanks' }); // done already by then
    expect(await A.takeAsks()).toBe(3);
    expect((await db.getPerson('p')).next.kind).toBe('checkin');
    expect((await db.getPerson('other')).next.kind).toBe('thanks');
    const lines = (await db.listMoves()).map(({ id, at, ...l }) => l);
    expect(lines).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'thanks', day: T, note: 'Lindsey reached out first.' }),
      expect.objectContaining({ kind: 'note', day: T, how: 'text', note: 'Sent the selects.' }),
    ]));
    expect(lines).toHaveLength(2);
    expect(await D.roundsAsks('p')).toEqual([]);
    expect(await A.takeAsks()).toBe(0);
  });
  it('an edit after a note, in one go', async () => {
    await db.savePeople([person('p')]);
    await db.logMove(note);
    await D.askRounds('shelf', { do: 'edit', personId: 'p', lineId: 'n1', how: 'person', note: 'Coffee.' });
    expect(await A.takeAsks()).toBe(1);
    expect(strip((await db.listMoves())[0])).toMatchObject({ id: 'n1', how: 'person', note: 'Coffee.' });
  });
  it('nothing outside the suite\'s shared files, or with nothing waiting', async () => {
    expect(await A.takeAsks()).toBe(0);
    const keep = window.DFData;
    delete window.DFData;
    expect(await A.takeAsks()).toBe(0);
    window.DFData = keep;
  });
});
