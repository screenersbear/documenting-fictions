// rounds/data/moves.js: doing a move from a Today card or a person's page
// (DONE, LATER, UNDO and Done today's undo), with the day's pick kept in step
// and the shelf told; the day's pick itself; the work week; the fill-ins.
// Run over Rounds' real database (fake-indexeddb) and the suite's shared files.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';
import { markDone, markLater, undoDone as undoPerson } from '../../../rounds/data/person.js';
import { pickFor, doneOn } from '../../../rounds/data/today.js';
import { shelfItems } from '../../../rounds/data/shelf-items.js';

let M; // rounds/data/moves.js
let db; // rounds/data/db.js
const TODAY = '2026-11-16'; // a Monday
const NOW = new Date(2026, 10, 16, 10, 0, 0).getTime();
const WEEK = { work: [1, 2, 3, 4, 5], off: [0] };
beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  await loadDFData();
  db = await import('../../../rounds/data/db.js');
  M = await import('../../../rounds/data/moves.js');
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const person = (id, o) => ({ id, name: id, group: 'regular', added: '2026-11-01', letGo: false, shoots: [], next: { kind: 'checkin', due: TODAY, step: 0 }, ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest; // db.js stamps what it saves
const saved = async (id) => strip(await db.getPerson(id));
const pickOf = (ids, marks = {}, date = TODAY) => ({ date, ids, marks });
const published = () => vi.spyOn(window.DFWaiting, 'publishWaiting');

describe('getWeek', () => {
  it('is Monday to Friday with Sunday off when nothing is set', async () => {
    expect(await M.getWeek()).toEqual(WEEK);
  });
  it('is the work days and days off set in Options', async () => {
    await db.setSetting('workDays', [1, 3]);
    await db.setSetting('daysOff', [6]);
    expect(await M.getWeek()).toEqual({ work: [1, 3], off: [6] });
  });
  it('takes each on its own: work days set and days off not', async () => {
    await db.setSetting('workDays', [2]);
    expect(await M.getWeek()).toEqual({ work: [2], off: [0] });
  });
});

describe('loadToday', () => {
  it("picks the day's people (three a day), saves the pick and tells the shelf", async () => {
    const people = ['a', 'b', 'c', 'd'].map((id) => person(id));
    await db.savePeople(people);
    const spy = published();
    const got = await M.loadToday();
    expect(got.pick).toEqual(pickOf(['a', 'b', 'c']));
    expect(got.people.map(strip)).toEqual(people);
    expect(got.week).toEqual(WEEK);
    expect(await db.getSetting('pick', null)).toEqual(got.pick);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('rounds', shelfItems(got.people, got.pick, TODAY, 3, WEEK));
    // Opened again the same day: the same pick, as saved.
    expect((await M.loadToday()).pick).toEqual(got.pick);
    expect(spy).toHaveBeenCalledTimes(2);
  });
  it('takes as many a day as Options says', async () => {
    await db.savePeople(['a', 'b', 'c'].map((id) => person(id)));
    await db.setSetting('perDay', 1);
    expect((await M.loadToday()).pick.ids).toEqual(['a']);
  });
  it("keeps today's pick as it was, marks and all, and starts afresh on a new day", async () => {
    await db.savePeople(['a', 'b'].map((id) => person(id)));
    await db.setSetting('pick', pickOf(['b'], { b: 'done' }));
    expect((await M.loadToday()).pick).toEqual(pickOf(['b', 'a'], { b: 'done' }));
    await db.setSetting('pick', pickOf(['b'], { b: 'done' }, '2026-11-13'));
    expect((await M.loadToday()).pick).toEqual(pickOf(['a', 'b']));
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a', 'b']));
  });
  it('leaves the people for a day off, and still opens with no shelf to tell', async () => {
    await db.savePeople([person('a', { next: { kind: 'pitch', due: TODAY, step: 0 } })]);
    await db.setSetting('workDays', [2, 3, 4, 5]);
    delete window.DFWaiting;
    const got = await M.loadToday();
    expect(got.pick).toEqual(pickOf([]));
    expect(got.week).toEqual({ work: [2, 3, 4, 5], off: [0] });
  });
  it('is an empty day with no one in Rounds', async () => {
    expect(await M.loadToday()).toEqual({ people: [], pick: pickOf([]), week: WEEK });
  });
});

describe('doMove with what you said, and saveHowNote', () => {
  it('keeps what was in the box with the move (nothing for an empty box)', async () => {
    const p = person('a');
    await db.savePerson(p);
    expect((await M.doMove(p, '  Thank you!  ')).line.said).toBe('Thank you!');
    const q = person('b');
    await db.savePerson(q);
    expect((await M.doMove(q, '   ')).line).not.toHaveProperty('said');
  });
  it('HOW and A NOTE are kept with the move, what you said stays', async () => {
    const p = person('a');
    await db.savePerson(p);
    const { line } = await M.doMove(p, 'Hi');
    const next = await M.saveHowNote(line, { how: 'text', note: ' Wants to shoot again. ' });
    expect(next).toEqual({ ...line, how: 'text', note: 'Wants to shoot again.' });
    expect((await db.listMoves()).map(strip)).toEqual([next]);
  });
  it('the one sheet: how and a note given with it are kept at once', async () => {
    const p = person('a');
    await db.savePerson(p);
    const { line } = await M.doMove(p, 'Hi', { how: 'email', note: 'Liked it' });
    expect(line).toMatchObject({ said: 'Hi', how: 'email', note: 'Liked it' });
    expect(await M.saveHowNote(line, { how: 'text', note: '', said: 'Hello again' })).toEqual({ ...line, how: 'text', note: undefined, said: 'Hello again' });
  });
  it('an unknown how, or a note\'s how, is left off; an empty note too', async () => {
    const p = person('a');
    await db.savePerson(p);
    const { line } = await M.doMove(p);
    expect(await M.saveHowNote(line, { how: 'call', note: '' })).toEqual(line);
  });
});

describe('doMove', () => {
  it('saves them with their next move planned and logs the move, now', async () => {
    const p = person('a');
    await db.savePerson(p);
    const got = await M.doMove(p);
    const { person: after, log } = markDone(p, TODAY);
    expect(got.before).toBe(p);
    expect(got.after).toEqual(after);
    expect(got.line).toEqual({ id: expect.any(String), at: NOW, ...log });
    expect(got.line.id).not.toBe('');
    expect(await saved('a')).toEqual(after);
    expect((await db.listMoves()).map(strip)).toEqual([got.line]);
  });
  it("marks the card done in today's pick, and tells the shelf again", async () => {
    const p = person('a');
    await db.savePerson(p);
    await db.setSetting('pick', pickOf(['a', 'b']));
    const spy = published();
    await M.doMove(p);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a', 'b'], { a: 'done' }));
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy.mock.calls[0][0]).toBe('rounds');
  });
  it("leaves a pick alone that isn't today's or hasn't got them, and no pick at all", async () => {
    const p = person('a');
    await db.setSetting('pick', pickOf(['a'], {}, '2026-11-13'));
    await M.doMove(p);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a'], {}, '2026-11-13'));
    await db.setSetting('pick', pickOf(['b']));
    await M.doMove(p);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['b']));
    await db.setSetting('pick', null);
    await M.doMove(p);
    expect(await db.getSetting('pick', 'none')).toBeNull();
  });
  it("still does the move when the shelf can't be told", async () => {
    vi.spyOn(window.DFWaiting, 'publishWaiting').mockImplementation(() => { throw new Error('full'); });
    const p = person('a');
    await expect(M.doMove(p)).resolves.toMatchObject({ before: p });
    await new Promise((r) => setTimeout(r, 20)); // the shelf's turn comes after: it fails quietly
    expect(await saved('a')).toEqual(markDone(p, TODAY).person);
  });
});

describe('undoMove', () => {
  it('puts them back as they were, takes the line out of the log and the mark off the card', async () => {
    const p = person('a');
    await db.savePerson(p);
    await db.setSetting('pick', pickOf(['a']));
    const spy = published();
    const done = await M.doMove(p);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1)); // the move's own
    await M.undoMove(done);
    expect(await saved('a')).toEqual(p);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a']));
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });
});

describe('loadDone', () => {
  it("is the log and today's moves done from it", async () => {
    const a = person('a');
    const b = person('b');
    await db.savePeople([a, b]);
    const one = await M.doMove(a);
    vi.setSystemTime(NOW + 60000);
    const two = await M.doMove(b);
    const got = await M.loadDone();
    expect(got.lines.map(strip).sort((x, y) => x.at - y.at)).toEqual([one.line, two.line]);
    expect(got.done.map((d) => d.line.id)).toEqual(doneOn(got.lines, await db.listPeople(), TODAY).map((d) => d.line.id));
    expect(got.done.map((d) => d.person.id)).toEqual(['b', 'a']);
  });
  it('is nothing on a day with no moves', async () => {
    expect(await M.loadDone()).toEqual({ lines: [], done: [] });
  });
});

describe('undoDone', () => {
  it('puts the move back from its line, drops the line and brings the card back', async () => {
    const p = person('a', { next: { kind: 'followup', due: TODAY, step: 1 } });
    await db.savePerson(p);
    await db.setSetting('pick', pickOf(['a']));
    const { after, line } = await M.doMove(p);
    const lines = await db.listMoves();
    await M.undoDone({ line, person: after }, lines);
    expect(await saved('a')).toEqual(undoPerson(after, line, lines));
    expect((await saved('a')).next).toEqual(p.next);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a']));
  });
});

describe('undoDone: a move that was not the due one', () => {
  it('takes back only what it moved, and leaves the card in the day\'s pick', async () => {
    const p = person('a', { lastMove: '2026-10-01', next: { kind: 'checkin', due: '2026-11-20', step: 0 } });
    const line = { id: 'x', at: 5, personId: 'a', kind: 'pitch', day: TODAY, extra: true, keeps: true, wasLast: '2026-10-01', moved: { from: '2026-11-20', to: '2026-12-28' } };
    const after = { ...p, lastMove: TODAY, next: { ...p.next, due: '2026-12-28' } };
    await db.savePerson(after);
    await db.logMove(line);
    await db.setSetting('pick', pickOf(['a'], { a: 'later' }));
    await M.undoDone({ line, person: after }, await db.listMoves());
    expect(await saved('a')).toEqual(p);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a'], { a: 'later' }));
  });
});

describe('laterMove', () => {
  it('moves it to tomorrow, marks the card later and tells the shelf', async () => {
    const p = person('a');
    await db.savePerson(p);
    await db.setSetting('pick', pickOf(['a']));
    const spy = published();
    const after = await M.laterMove(p);
    expect(after).toEqual(markLater(p, TODAY));
    expect(after.next.due).toBe('2026-11-17');
    expect(await saved('a')).toEqual(after);
    expect(await db.getSetting('pick', null)).toEqual(pickOf(['a'], { a: 'later' }));
    expect(await db.listMoves()).toEqual([]);
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
  });
});

describe('getMe', () => {
  it('is blank before anything is filled in', async () => {
    expect(await M.getMe()).toEqual({ offer: '', city: '' });
  });
  it('is the offer and the city from Messages', async () => {
    await db.setSetting('offer', 'a free mini shoot');
    await db.setSetting('city', 'Toronto');
    expect(await M.getMe()).toEqual({ offer: 'a free mini shoot', city: 'Toronto' });
  });
  it('takes each on its own', async () => {
    await db.setSetting('city', 'Lisbon');
    expect(await M.getMe()).toEqual({ offer: '', city: 'Lisbon' });
  });
});

describe('a note on its own, from SO FAR: saveNote, dropNote, putNoteBack', () => {
  const note = { id: 'n1', at: 1, personId: 'a', kind: 'note', day: TODAY, how: 'call', note: 'Booked.' };
  it('changed: a note\'s hows (Instagram kept), the words cleaned; an empty one left off', async () => {
    await db.logMove(note);
    expect(await M.saveNote(note, { how: 'text', note: ' Texted back. ' })).toEqual({ ...note, how: 'text', note: 'Texted back.' });
    expect(await M.saveNote(note, { how: 'instagram', note: '' })).toEqual({ id: 'n1', at: 1, personId: 'a', kind: 'note', day: TODAY, how: 'instagram' });
    expect((await db.listMoves()).map(strip)).toEqual([{ id: 'n1', at: 1, personId: 'a', kind: 'note', day: TODAY, how: 'instagram' }]);
  });
  it('deleted, and put back by Undo', async () => {
    await db.logMove(note);
    await M.dropNote(note);
    expect(await db.listMoves()).toEqual([]);
    await M.putNoteBack(note);
    expect((await db.listMoves()).map(strip)).toEqual([note]);
  });
});
