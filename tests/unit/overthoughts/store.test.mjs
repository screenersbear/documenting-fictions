// overthoughts/data/store.js: Overthoughts' entries, photos and reviews in its own
// database, plus the small helpers that read entries and dates.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { freshIndexedDB, fakeDFData, rows, getOne, NOW, TODAY } from './fake-df-data.mjs';

let D;
let store;
beforeEach(async () => {
  freshIndexedDB();
  D = fakeDFData();
  window.DFData = D;
  vi.resetModules();
  store = await import('../../../overthoughts/data/store.js');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  delete window.DFData;
});

// Straight to the database, around the store.
// vitest's rejects.toThrow also passes when a promise rejects with no error at all
// (null, false), so rejections are checked here for a real error (an Error, or
// IndexedDB's DOMException) and its message.
async function rejectsWith(promise, message) {
  let err;
  try { await promise; } catch (e) { err = e; }
  expect(typeof err?.name).toBe('string');
  expect(typeof err?.message).toBe('string');
  if (message !== undefined) expect(() => { throw err; }).toThrow(message);
  return err;
}
const raw = async (s) => rows(await D.overthoughts(), s);
const rawOne = async (s, key) => getOne(await D.overthoughts(), s, key);
const put = async (s, list) => {
  const db = await D.overthoughts();
  const tx = db.transaction(s, 'readwrite');
  const os = tx.objectStore(s);
  list.forEach((v) => (os.keyPath ? os.put(v) : os.put(v[1], v[0])));
  await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
};
const entry = (id, more = {}) => ({ id, kind: 'free', date: '2026-11-01', title: '', body: '', tags: [], takeaway: '', shootId: null, createdAt: 'c', updatedAt: 'u', ...more });

describe('loading the module', () => {
  it('fails without df-data.js loaded first', async () => {
    delete window.DFData;
    vi.resetModules();
    await rejectsWith(import('../../../overthoughts/data/store.js'), TypeError);
  });
  it('hands on df-data.js\'s hasText as it is', () => {
    expect(store.hasText).toBe(D.hasText);
  });
});

describe('MONTHS', () => {
  it('lists the twelve months in order, in full', () => {
    expect(store.MONTHS).toEqual(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']);
  });
});

describe('allEntries', () => {
  it('is empty for a new database', async () => {
    expect(await store.allEntries()).toEqual([]);
  });
  it('returns every written entry (the values, not the keys)', async () => {
    await put('entries', [entry('a'), entry('b', { title: 'B' })]);
    expect(await store.allEntries()).toEqual([entry('a'), entry('b', { title: 'B' })]);
  });
  it('leaves out reflections copied over from The Eye', async () => {
    await put('entries', [entry('a'), entry('r', { kind: 'reflection' }), entry('j', { from: 'the-eye' }), entry('k', { from: 'ref' })]);
    expect((await store.allEntries()).map((e) => e.id)).toEqual(['a', 'k']);
  });
  it('is empty when every row came from The Eye', async () => {
    await put('entries', [entry('r', { kind: 'reflection', from: 'the-eye' })]);
    expect(await store.allEntries()).toEqual([]);
  });
});

describe('getEntry', () => {
  it('returns a written entry', async () => {
    await put('entries', [entry('a', { body: 'hi' })]);
    expect(await store.getEntry('a')).toEqual(entry('a', { body: 'hi' }));
  });
  it('returns null for an id that is not there', async () => {
    expect(await store.getEntry('nope')).toBeNull();
  });
  it('returns null for a reflection kind entry', async () => {
    await put('entries', [entry('r', { kind: 'reflection' })]);
    expect(await store.getEntry('r')).toBeNull();
  });
  it("returns null for an entry from The Eye's Journal", async () => {
    await put('entries', [entry('j', { kind: 'free', from: 'the-eye' })]);
    expect(await store.getEntry('j')).toBeNull();
  });
  it('rejects a key IndexedDB cannot use', async () => {
    await rejectsWith(store.getEntry({}));
  });
});

describe('saveEntry', () => {
  it('stamps updatedAt, stores the entry and returns the same object', async () => {
    const e = entry('a', { title: 'T' });
    const back = await store.saveEntry(e);
    expect(back).toBe(e);
    expect(e.updatedAt).toBe(NOW);
    expect(await store.getEntry('a')).toEqual({ ...entry('a', { title: 'T' }), updatedAt: NOW });
    expect(D.putMany).toHaveBeenCalledTimes(1);
    expect(D.putMany.mock.calls[0][1]).toBe('entries');
    expect(D.putMany.mock.calls[0][2]).toEqual([e]);
  });
  it('replaces an entry saved before under the same id', async () => {
    await store.saveEntry(entry('a', { body: 'one' }));
    await store.saveEntry(entry('a', { body: 'two' }));
    expect((await raw('entries')).map(([, e]) => e.body)).toEqual(['two']);
  });
  it('rejects an entry with no id', async () => {
    await rejectsWith(store.saveEntry({ body: 'x' }));
    expect(await raw('entries')).toEqual([]);
  });
});

describe('deleteEntry', () => {
  beforeEach(async () => {
    await put('entries', [entry('a'), entry('b')]);
    await put('images', [['a', [{ src: 'x', caption: '' }]], ['b', [{ src: 'y', caption: '' }]]]);
    await put('links', [
      { id: 'to-a', fromId: 's1', toId: 'a' },
      { id: 'from-a', fromId: 'a', toId: 's2' },
      { id: 'to-b', fromId: 's1', toId: 'b' },
      { id: 'other', fromId: 'q', toId: 'r' },
    ]);
  });
  it('removes the entry, its photos and every link to or from it', async () => {
    await store.deleteEntry('a');
    expect((await raw('entries')).map(([k]) => k)).toEqual(['b']);
    expect((await raw('images')).map(([k]) => k)).toEqual(['b']);
    expect((await raw('links')).map(([k]) => k)).toEqual(['other', 'to-b']);
  });
  it('removes a link that both starts and ends at the entry', async () => {
    await put('links', [{ id: 'self', fromId: 'b', toId: 'b' }]);
    await store.deleteEntry('b');
    expect((await raw('links')).map(([k]) => k)).toEqual(['from-a', 'other', 'to-a']);
  });
  it('does nothing to the rest for an id that is not there', async () => {
    await expect(store.deleteEntry('zzz')).resolves.toBeUndefined();
    expect((await raw('entries')).length).toBe(2);
    expect((await raw('images')).length).toBe(2);
    expect((await raw('links')).length).toBe(4);
  });
  it('rejects, and keeps everything, when the write is cut short', async () => {
    const opening = D.overthoughts.getMockImplementation();
    D.overthoughts.mockImplementation(async () => {
      const db = await opening();
      const tx0 = db.transaction.bind(db);
      db.transaction = (stores, mode) => {
        const tx = tx0(stores, mode);
        if (mode === 'readwrite') queueMicrotask(() => tx.abort()); // nothing gives an error for an abort
        return tx;
      };
      return db;
    });
    await rejectsWith(store.deleteEntry('a'), "That entry wasn't deleted.");
    D.overthoughts.mockImplementation(opening);
    expect((await raw('entries')).map(([k]) => k)).toEqual(['a', 'b']);
    expect((await raw('links')).length).toBe(4);
  });
  it('rejects a key IndexedDB cannot use', async () => {
    await rejectsWith(store.deleteEntry(null));
  });
});

describe('newEntry', () => {
  it('makes a blank free entry for the day given', () => {
    expect(store.newEntry('2026-02-28')).toEqual({
      id: 'uid-1', kind: 'free', date: '2026-02-28', title: '', body: '', tags: [], takeaway: '', shootId: null, createdAt: NOW, updatedAt: NOW,
    });
    expect(D.nowIso).toHaveBeenCalledTimes(1);
    expect(D.todayStr).not.toHaveBeenCalled();
  });
  it('uses today with no day given', () => {
    expect(store.newEntry().date).toBe(TODAY);
    expect(store.newEntry('').date).toBe(TODAY);
    expect(store.newEntry(null).date).toBe(TODAY);
  });
  it('gives every new entry its own tags list', () => {
    const a = store.newEntry();
    const b = store.newEntry();
    a.tags.push('x');
    expect(b.tags).toEqual([]);
  });
});

describe('photos', () => {
  it('is empty for an entry with none', async () => {
    expect(await store.photos('a')).toEqual([]);
  });
  it('returns the stored { src, caption } list', async () => {
    await put('images', [['a', [{ src: 'data:1', caption: 'one' }, { src: 'data:2', caption: '' }]]]);
    expect(await store.photos('a')).toEqual([{ src: 'data:1', caption: 'one' }, { src: 'data:2', caption: '' }]);
  });
  it('turns plain data URLs (older Journal entries) into { src, caption: "" }', async () => {
    await put('images', [['a', ['data:1', { src: 'data:2', caption: 'c' }]]]);
    expect(await store.photos('a')).toEqual([{ src: 'data:1', caption: '' }, { src: 'data:2', caption: 'c' }]);
  });
  it('is empty when the stored value is not a list', async () => {
    await put('images', [['a', 'data:1'], ['b', { src: 'x' }]]);
    expect(await store.photos('a')).toEqual([]);
    expect(await store.photos('b')).toEqual([]);
  });
});

describe('setPhotos', () => {
  it('stores the list under the entry id', async () => {
    await store.setPhotos('a', [{ src: 's', caption: 'c' }]);
    expect(await raw('images')).toEqual([['a', [{ src: 's', caption: 'c' }]]]);
    expect(D.deleteOne).not.toHaveBeenCalled();
  });
  it('removes the row altogether for an empty list', async () => {
    await put('images', [['a', [{ src: 's', caption: '' }]], ['b', ['x']]]);
    await store.setPhotos('a', []);
    expect(await rawOne('images', 'a')).toBeUndefined();
    expect((await raw('images')).map(([k]) => k)).toEqual(['b']);
    expect(D.putMany).not.toHaveBeenCalled();
  });
  it('is fine emptying an entry that had no photos', async () => {
    await expect(store.setPhotos('none', [])).resolves.toBeUndefined();
    expect(await raw('images')).toEqual([]);
  });
  it('throws with no list at all', async () => {
    await rejectsWith(store.setPhotos('a', undefined), TypeError);
  });
});

describe('photoIds', () => {
  it('is an empty Set for a new database', async () => {
    const ids = await store.photoIds();
    expect(ids).toBeInstanceOf(Set);
    expect([...ids]).toEqual([]);
  });
  it('lists only the entries that have at least one photo', async () => {
    await put('images', [['a', ['x']], ['b', []], ['c', 'text'], ['d', { length: 2 }], ['e', [{ src: 'y' }, { src: 'z' }]]]);
    expect([...(await store.photoIds())]).toEqual(['a', 'e']);
  });
});

describe('reviews', () => {
  it('allReviews is empty for a new database', async () => {
    expect(await store.allReviews()).toEqual([]);
  });
  it('saveReview stamps updatedAt and stores it; allReviews and getReview read it back', async () => {
    const r = { id: 'month-2026-11', notes: 'n' };
    expect(await store.saveReview(r)).toBeUndefined();
    expect(r.updatedAt).toBe(NOW);
    expect(await store.allReviews()).toEqual([{ id: 'month-2026-11', notes: 'n', updatedAt: NOW }]);
    expect(await store.getReview('month-2026-11')).toEqual({ id: 'month-2026-11', notes: 'n', updatedAt: NOW });
  });
  it('allReviews returns the values of every review', async () => {
    await put('reviews', [{ id: 'year-2026' }, { id: 'month-2026-01' }]);
    expect(await store.allReviews()).toEqual([{ id: 'month-2026-01' }, { id: 'year-2026' }]);
  });
  it('getReview is undefined for a review not written yet', async () => {
    expect(await store.getReview('year-1999')).toBeUndefined();
  });
  it('saveReview rejects a review with no id', async () => {
    await rejectsWith(store.saveReview({ notes: 'x' }));
  });
});

describe('hasWords', () => {
  it('is true with a title, a body or a takeaway', () => {
    expect(store.hasWords({ title: 'T' })).toBe(true);
    expect(store.hasWords({ body: 'B' })).toBe(true);
    expect(store.hasWords({ takeaway: 'K' })).toBe(true);
  });
  it('is false when everything is blank or missing', () => {
    expect(store.hasWords({})).toBe(false);
    expect(store.hasWords({ title: '  ', body: '\n', takeaway: '' })).toBe(false);
  });
  it('ignores fields that are not text', () => {
    expect(store.hasWords({ title: 5, body: ['x'], takeaway: null })).toBe(false);
  });
  it('throws for no entry at all', () => {
    expect(() => store.hasWords(undefined)).toThrow(TypeError);
  });
});

describe('entryTitle', () => {
  it('uses the title when there is one', () => {
    expect(store.entryTitle({ title: 'My title', body: 'Body' })).toBe('My title');
  });
  it('falls back to the first written line of the body, trimmed', () => {
    expect(store.entryTitle({ title: '', body: '\n   \n  First line  \nSecond' })).toBe('First line');
  });
  it('skips a [prompt] at the start of the body', () => {
    expect(store.entryTitle({ body: '[What did the light do?]\n\nIt went gold.' })).toBe('It went gold.');
    expect(store.entryTitle({ body: '[Prompt]Right after' })).toBe('Right after');
    expect(store.entryTitle({ body: '[] Empty prompt' })).toBe('Empty prompt');
  });
  it('keeps brackets that are not at the very start', () => {
    expect(store.entryTitle({ body: 'Notes [aside] more' })).toBe('Notes [aside] more');
    expect(store.entryTitle({ body: ' [aside] more' })).toBe('[aside] more');
  });
  it('only skips the first [prompt]', () => {
    expect(store.entryTitle({ body: '[one] [two] three' })).toBe('[two] three');
  });
  it('says "Untitled entry" when there is nothing to show', () => {
    expect(store.entryTitle({})).toBe('Untitled entry');
    expect(store.entryTitle({ title: '', body: '' })).toBe('Untitled entry');
    expect(store.entryTitle({ body: '  \n \t\n' })).toBe('Untitled entry');
    expect(store.entryTitle({ body: '[only a prompt]' })).toBe('Untitled entry');
  });
  it('throws for no entry at all', () => {
    expect(() => store.entryTitle(null)).toThrow(TypeError);
  });
});

describe('oneLine', () => {
  it('joins lines with single spaces', () => {
    expect(store.oneLine('one\ntwo\nthree')).toBe('one two three');
  });
  it('folds blank lines and the spaces around line breaks', () => {
    expect(store.oneLine('one  \n\n\n   two')).toBe('one two');
    expect(store.oneLine('a\r\n b')).toBe('a b');
  });
  it('keeps the spacing inside a line, trims the ends', () => {
    expect(store.oneLine('  a  b  ')).toBe('a  b');
  });
  it('is empty for nothing', () => {
    expect(store.oneLine(undefined)).toBe('');
    expect(store.oneLine('')).toBe('');
    expect(store.oneLine('\n\n')).toBe('');
  });
  it('throws for text that is not a string', () => {
    expect(() => store.oneLine(42)).toThrow(TypeError);
  });
});

describe('dayOf', () => {
  const same = (d, y, m, day) => expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([y, m, day, 0, 0]);
  it('reads YYYY-MM-DD as that local day', () => {
    same(store.dayOf('2026-11-12'), 2026, 10, 12);
    same(store.dayOf('2026-01-01'), 2026, 0, 1);
    same(store.dayOf('2026-12-31'), 2026, 11, 31);
  });
  it('ignores a time after the day', () => {
    same(store.dayOf('2026-11-12T23:59:59.000Z'), 2026, 10, 12);
  });
  it('takes the first of the month, or January, when they are missing', () => {
    same(store.dayOf('2026-03'), 2026, 2, 1);
    same(store.dayOf('2026'), 2026, 0, 1);
  });
  it('rolls an impossible day over into the next month', () => {
    same(store.dayOf('2026-02-30'), 2026, 2, 2);
  });
  it('is now for no date, a blank one or nonsense', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 4, 6, 7, 8, 9));
    for (const s of [undefined, null, '', 'not a date', '0000-01-01']) {
      expect(store.dayOf(s).getTime()).toBe(new Date(2026, 4, 6, 7, 8, 9).getTime());
    }
  });
});

describe('iso', () => {
  it('writes a local day as YYYY-MM-DD', () => {
    expect(store.iso(new Date(2026, 10, 12))).toBe('2026-11-12');
  });
  it('pads single-digit months and days', () => {
    expect(store.iso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('uses the local day, late at night too', () => {
    expect(store.iso(new Date(2026, 11, 31, 23, 59, 59))).toBe('2026-12-31');
    expect(store.iso(new Date(2027, 0, 1, 0, 0, 0))).toBe('2027-01-01');
  });
  it('reads back what dayOf made', () => {
    expect(store.iso(store.dayOf('2024-02-29'))).toBe('2024-02-29');
  });
  it('gives NaN parts for an invalid date and throws for a non-date', () => {
    expect(store.iso(new Date('nope'))).toBe('NaN-NaN-NaN');
    expect(() => store.iso('2026-11-12')).toThrow(TypeError);
  });
});

describe('prettyDay', () => {
  it('shows a day as "Mon D, YYYY"', () => {
    expect(store.prettyDay('2026-11-12')).toBe('Nov 12, 2026');
    expect(store.prettyDay('2026-01-01')).toBe('Jan 1, 2026');
    expect(store.prettyDay('2025-12-31')).toBe('Dec 31, 2025');
  });
  it('shows today for no date or nonsense', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 6, 4, 12));
    expect(store.prettyDay('')).toBe('Jul 4, 2026');
    expect(store.prettyDay('garbage')).toBe('Jul 4, 2026');
  });
});

describe('monthKey', () => {
  it('is the YYYY-MM part of a day', () => {
    expect(store.monthKey('2026-11-12')).toBe('2026-11');
    expect(store.monthKey('2026-11-12T10:00:00Z')).toBe('2026-11');
  });
  it('keeps a shorter value as it is', () => {
    expect(store.monthKey('2026')).toBe('2026');
  });
  it('is empty for no date', () => {
    expect(store.monthKey(undefined)).toBe('');
    expect(store.monthKey(null)).toBe('');
    expect(store.monthKey('')).toBe('');
  });
  it('reads a non-string as text', () => {
    expect(store.monthKey(202611121)).toBe('2026111');
  });
});

describe('monthName', () => {
  it('names a month key', () => {
    expect(store.monthName('2026-11')).toBe('November 2026');
    expect(store.monthName('2026-01')).toBe('January 2026');
    expect(store.monthName('1999-12')).toBe('December 1999');
  });
  it('has no name for a month out of range', () => {
    expect(store.monthName('2026-13')).toBe('undefined 2026');
    expect(store.monthName('2026-00')).toBe('undefined 2026');
  });
  it('throws for no key', () => {
    expect(() => store.monthName(undefined)).toThrow(TypeError);
  });
});

describe('byNewest', () => {
  it('puts later days first', () => {
    expect(store.byNewest({ date: '2026-11-01' }, { date: '2026-11-12' })).toBeGreaterThan(0);
    expect(store.byNewest({ date: '2026-11-12' }, { date: '2026-11-01' })).toBeLessThan(0);
  });
  it('goes by the day before the time it was made', () => {
    expect(store.byNewest({ date: '2026-11-12', createdAt: '2026-01-01' }, { date: '2026-11-01', createdAt: '2026-12-01' })).toBeLessThan(0);
  });
  it('on the same day, puts the one made later first', () => {
    expect(store.byNewest({ date: '2026-11-12', createdAt: '2026-11-12T09:00' }, { date: '2026-11-12', createdAt: '2026-11-12T10:00' })).toBeGreaterThan(0);
    expect(store.byNewest({ date: '2026-11-12', createdAt: '2026-11-12T10:00' }, { date: '2026-11-12', createdAt: '2026-11-12T09:00' })).toBeLessThan(0);
  });
  it('puts entries with no day or no time last', () => {
    expect(store.byNewest({}, { date: '2026-01-01' })).toBeGreaterThan(0);
    expect(store.byNewest({ date: '2026-01-01' }, {})).toBeLessThan(0);
    expect(store.byNewest({ date: 'd' }, { date: 'd', createdAt: 'x' })).toBeGreaterThan(0);
    expect(store.byNewest({ date: 'd', createdAt: 'x' }, { date: 'd' })).toBeLessThan(0);
  });
  it('is 0 for two the same, or two with nothing', () => {
    expect(store.byNewest({ date: 'd', createdAt: 'c' }, { date: 'd', createdAt: 'c' })).toBe(0);
    expect(store.byNewest({}, {})).toBe(0);
  });
  it('sorts a list newest first', () => {
    const list = [
      { id: 1, date: '2026-10-01', createdAt: 'a' },
      { id: 2, date: '2026-11-12', createdAt: 'a' },
      { id: 3 },
      { id: 4, date: '2026-11-12', createdAt: 'b' },
    ];
    expect(list.sort(store.byNewest).map((e) => e.id)).toEqual([4, 2, 1, 3]);
  });
});
