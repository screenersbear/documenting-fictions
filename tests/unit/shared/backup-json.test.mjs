// shared/data/backup-json.js: backups made the first way, one .json file,
// going back in: one of all four (all of it, or just one notebook's part,
// an Overthoughts part skipped), a notebook's own, and The Eye's.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { open } from './fake-idb.mjs';
import {
  DBS, EYE_DB, EYE, EYE_BAD, NOT_A_BACKUP, OTHER, load, fakeDFData, rejectsWith, lsKeys, exists, makeDb, readDb,
  fileOf, suite, part, eyePart, cutWritesTo as cutWrites,
} from './_backups.mjs';

let D;
let B;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  D = fakeDFData();
  B = await load(D);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.DFData;
  delete window.DFBackups;
});
const cutWritesTo = (name) => cutWrites(D, name);

// ---------- restoreJson: refusing a file ----------
describe('restoreJson refuses', () => {
  it("a file that isn't JSON", async () => {
    await rejectsWith(B.restoreJson(fileOf('{ nope')), "That file isn't a Documenting Fictions backup.");
  });
  it("a file that can't be read", async () => {
    await rejectsWith(B.restoreJson({ text: () => Promise.reject(new Error('gone')) }), "That file isn't a Documenting Fictions backup.");
  });
  it('JSON that is no kind of backup', async () => {
    const notOne = [null, 0, '"text"', {}, { kind: 'notebook', notebooks: {} }, { kind: 'suite-backup' }, { kind: 'suite-backup', notebooks: null },
      { kind: 'suite-backup', notebooks: 'x' }, part('df-links', {}), part('overthoughts', {}), { database: 'ref-notebook' }, { state: { shoots: {} } }, { state: null }];
    for (const data of notOne) await rejectsWith(B.restoreJson(fileOf(data)), NOT_A_BACKUP);
    expect(D.open).not.toHaveBeenCalled();
  });
  it('a notebook part with no stores, naming it, before anything is written', async () => {
    const data = suite({ ref: part('ref-notebook', { s: { rows: [['k', 'v']] } }), 'contact-sheet': { database: 'contact-sheet' } });
    await rejectsWith(B.restoreJson(fileOf(data)), "The contact-sheet part of that file isn't right. Nothing was changed.");
    expect(D.open).not.toHaveBeenCalled();
    expect(await exists('ref-notebook')).toBe(false);
  });
  it('a notebook part for a different database', async () => {
    const data = suite({ links: part('df-stickers', {}) });
    await rejectsWith(B.restoreJson(fileOf(data)), "The links part of that file isn't right. Nothing was changed.");
    const data2 = suite({ stickers: part('df-stickers', {}), rounds: part('ref-notebook', {}) });
    await rejectsWith(B.restoreJson(fileOf(data2)), "The rounds part of that file isn't right. Nothing was changed.");
    expect(D.open).not.toHaveBeenCalled();
  });
  it("an Eye part with no state or no list of shoots, before anything is written", async () => {
    for (const eye of [{}, { state: null }, { state: {} }, { state: { shoots: {} } }, { state: { shoots: 'x' } }]) {
      const data = suite({ ref: part('ref-notebook', {}), 'the-eye': eye });
      await rejectsWith(B.restoreJson(fileOf(data)), EYE_BAD);
    }
    expect(D.open).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
});

// ---------- restoreJson: putting notebooks back ----------
describe('restoreJson puts a notebook back', () => {
  it('does nothing for a backup with every part empty', async () => {
    const all = { ref: null, 'contact-sheet': null, overthoughts: null, links: null, stickers: null, 'the-eye': null };
    await expect(B.restoreJson(fileOf(suite(all)))).resolves.toBeUndefined();
    await expect(B.restoreJson(fileOf(suite({})))).resolves.toBeUndefined();
    expect(D.open).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
  it('makes a database never opened here, the way the backup says it looked', async () => {
    const data = suite({
      ref: part('ref-notebook', {
        boards: {
          meta: { keyPath: 'id', autoIncrement: false, indexes: [{ name: 'byName', keyPath: 'name', unique: true, multiEntry: false }, { name: 'byTag', keyPath: 'tags', unique: false, multiEntry: true }] },
          rows: [['b1', { id: 'b1', name: 'One', tags: ['x'] }], ['b2', { id: 'b2', name: 'Two', tags: [] }]],
        },
        pictures: { meta: { keyPath: null, autoIncrement: false, indexes: [] }, rows: [['b1', 'pic-1']] },
        counter: { meta: { keyPath: null, autoIncrement: true }, rows: [[1, 'first']] },
        auto: { meta: { keyPath: 'n', autoIncrement: true }, rows: [] },
        plain: {},
      }, { version: 7, extra: { book: '{"color":"red"}' } }),
    });
    await B.restoreJson(fileOf(data));
    expect(D.open).toHaveBeenCalledTimes(1);
    expect(D.open.mock.calls[0][0]).toBe('ref-notebook');
    expect(D.open.mock.calls[0][1]).toBe(7);
    expect(typeof D.open.mock.calls[0][2]).toBe('function');
    expect(await readDb('ref-notebook')).toEqual({
      version: 7,
      stores: {
        auto: { keyPath: 'n', autoIncrement: true, indexes: [], rows: [] },
        boards: {
          keyPath: 'id', autoIncrement: false,
          indexes: [{ name: 'byName', keyPath: 'name', unique: true, multiEntry: false }, { name: 'byTag', keyPath: 'tags', unique: false, multiEntry: true }],
          rows: [['b1', { id: 'b1', name: 'One', tags: ['x'] }], ['b2', { id: 'b2', name: 'Two', tags: [] }]],
        },
        counter: { keyPath: null, autoIncrement: true, indexes: [], rows: [[1, 'first']] },
        pictures: { keyPath: null, autoIncrement: false, indexes: [], rows: [['b1', 'pic-1']] },
        plain: { keyPath: null, autoIncrement: false, indexes: [], rows: [] },
      },
    });
    expect(localStorage.getItem('ref-notebook-book')).toBe('{"color":"red"}');
    expect(lsKeys()).toEqual(['ref-notebook-book']);
  });
  it('swaps an existing database\'s stores for the backup\'s, leaving its version and other stores', async () => {
    await makeDb('contact-sheet', 2, {
      shoots: { keyPath: 'id', rows: [['old', { id: 'old' }], ['s1', { id: 's1', v: 'old' }]] },
      keep: { rows: [['k', 'kept']] },
    });
    const data = suite({
      'contact-sheet': part('contact-sheet', {
        shoots: { meta: { keyPath: 'id', autoIncrement: false, indexes: [] }, rows: [['s1', { id: 's1', v: 'new' }], ['s2', { id: 's2' }]] },
        gone: { meta: { keyPath: null }, rows: [['x', 'y']] },
      }, { version: 1 }),
    });
    await B.restoreJson(fileOf(data));
    expect(D.open.mock.calls[0]).toEqual(['contact-sheet', undefined, null]);
    const after = await readDb('contact-sheet');
    expect(after.version).toBe(2);
    expect(Object.keys(after.stores).sort()).toEqual(['keep', 'shoots']);
    expect(after.stores.shoots.rows).toEqual([['s1', { id: 's1', v: 'new' }], ['s2', { id: 's2' }]]);
    expect(after.stores.keep.rows).toEqual([['k', 'kept']]);
  });
  it('clears a store the backup has empty', async () => {
    await makeDb('rounds', 1, { people: { keyPath: 'id', rows: [['a', { id: 'a' }]] } });
    await B.restoreJson(fileOf(suite({ rounds: part('rounds', { people: { meta: { keyPath: 'id' } } }) })));
    expect((await readDb('rounds')).stores.people.rows).toEqual([]);
  });
  it('writes nothing when none of its stores are in the database', async () => {
    await makeDb('df-links', 1, { links: { keyPath: 'id', rows: [['l', { id: 'l' }]] } });
    await expect(B.restoreJson(fileOf(suite({ links: part('df-links', { other: { rows: [['a', 'b']] } }) })))).resolves.toBeUndefined();
    expect((await readDb('df-links')).stores).toEqual({ links: { keyPath: 'id', autoIncrement: false, indexes: [], rows: [['l', { id: 'l' }]] } });
  });
  it("adds the missing stores when the browser's list of databases is out of date", async () => {
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['old', { id: 'old' }]] } });
    indexedDB.databases = async () => [];
    const data = suite({
      ref: part('ref-notebook', {
        boards: { meta: { keyPath: 'n', autoIncrement: true }, rows: [['b', { id: 'b' }]] },
        pages: { meta: { keyPath: null }, rows: [['p', 'page']] },
      }, { version: 2 }),
    });
    await B.restoreJson(fileOf(data));
    expect(D.open.mock.calls[0][1]).toBe(2);
    const after = await readDb('ref-notebook');
    expect(after.version).toBe(2);
    expect(after.stores.boards).toEqual({ keyPath: 'id', autoIncrement: false, indexes: [], rows: [['b', { id: 'b' }]] });
    expect(after.stores.pages.rows).toEqual([['p', 'page']]);
  });
  it("with no list of databases, opens an existing one as it is (an older backup's version is fine)", async () => {
    await makeDb('df-stickers', 3, { stickers: { keyPath: 'id' } });
    indexedDB.databases = undefined;
    await B.restoreJson(fileOf(suite({ stickers: part('df-stickers', { stickers: { meta: { keyPath: 'id' }, rows: [['s', { id: 's' }]] } }, { version: 1 }) })));
    // first a look to see whether it's new here (it isn't), then opened as it is
    expect(D.open.mock.calls.map(([n, v, up]) => [n, v, typeof up])).toEqual([['df-stickers', undefined, 'function'], ['df-stickers', undefined, 'object']]);
    expect(D.open.mock.calls[1][2]).toBe(null);
    const after = await readDb('df-stickers');
    expect(after.version).toBe(3);
    expect(after.stores.stickers.rows).toEqual([['s', { id: 's' }]]);
  });
  it('with no list of databases, a notebook never opened here is still made from the backup, at its version, with its rows', async () => {
    indexedDB.databases = undefined;
    await B.restoreJson(fileOf(suite({ rounds: part('rounds', { entries: { meta: { keyPath: 'id', indexes: [{ name: 'byDay', keyPath: 'day' }] }, rows: [['a', { id: 'a', day: 1 }]] } }, { version: 4 }) })));
    expect(D.open.mock.calls.map(([n, v]) => [n, v])).toEqual([['rounds', undefined], ['rounds', 4]]);
    delete indexedDB.databases; // back to the real list, to read it
    const after = await readDb('rounds');
    expect(after.version).toBe(4);
    expect(after.stores.entries).toEqual({ keyPath: 'id', autoIncrement: false, indexes: [{ name: 'byDay', keyPath: 'day', unique: false, multiEntry: false }], rows: [['a', { id: 'a', day: 1 }]] });
  });
  it('with no list of databases, the look to see whether a notebook is new leaves nothing behind when it is', async () => {
    indexedDB.databases = undefined;
    let made = 0;
    D.open.mockImplementationOnce(async (...a) => { try { return await open(...a); } catch (e) { made = e.name; throw e; } });
    await B.restoreJson(fileOf(suite({ rounds: part('rounds', { entries: { meta: { keyPath: 'id' }, rows: [] } }, { version: 2 }) })));
    expect(made).toBe('AbortError');
    delete indexedDB.databases;
    expect((await readDb('rounds')).version).toBe(2);
  });
  it('with no list of databases, a failure other than the database being new is passed on', async () => {
    indexedDB.databases = undefined;
    D.open.mockImplementationOnce(async () => { throw new Error('Blocked by another tab.'); });
    await rejectsWith(B.restoreJson(fileOf(suite({ rounds: part('rounds', {}) }))), 'Blocked by another tab.');
  });
  it('puts every part back in the same order, Eye last', async () => {
    const data = suite({
      'the-eye': eyePart({ shoots: [] }),
      people: part('df-people', {}),
      stickers: part('df-stickers', {}),
      links: part('df-links', {}),
      rounds: part('rounds', {}),
      overthoughts: part('overthoughts', {}),
      'contact-sheet': part('contact-sheet', {}),
      ref: part('ref-notebook', {}),
    });
    await B.restoreJson(fileOf(data));
    expect(D.open.mock.calls.map(([n]) => n)).toEqual([...DBS, EYE_DB]);
    expect(await exists('overthoughts')).toBe(false); // retired on 15 Nov: its part is skipped
  });
  it("rejects, writing nothing, when the rows break one of the store's rules", async () => {
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['keep', { id: 'keep', name: 'K' }]] } });
    const db = await open('ref-notebook', 2, (made, old, tx) => tx.objectStore('boards').createIndex('byName', 'name', { unique: true }));
    db.close();
    const data = suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a', name: 'same' }], ['b', { id: 'b', name: 'same' }]] } }) });
    await rejectsWith(B.restoreJson(fileOf(data)), "That wasn't restored.");
    expect((await readDb('ref-notebook')).stores.boards.rows).toEqual([['keep', { id: 'keep', name: 'K' }]]);
  });
  it('rejects a row the store cannot take at all, writing nothing: the notebook stays as it was', async () => {
    // A value with no key for a keyPath store throws while the write is still open.
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['keep', { id: 'keep' }]] } });
    const data = suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a' }], ['b', { noId: true }]] } }) });
    await rejectsWith(B.restoreJson(fileOf(data)), "That wasn't restored.");
    expect((await readDb('ref-notebook')).stores.boards.rows).toEqual([['keep', { id: 'keep' }]]);
  });
  it("rejects with \"That wasn't restored.\" when the write is cut short", async () => {
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['keep', { id: 'keep' }]] } });
    cutWritesTo('ref-notebook');
    const data = suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a' }]] } }, { extra: { book: 'x' } }) });
    await rejectsWith(B.restoreJson(fileOf(data)), "That wasn't restored.");
    expect((await readDb('ref-notebook')).stores.boards.rows).toEqual([['keep', { id: 'keep' }]]);
    expect(lsKeys()).toEqual([]);
  });
});

describe('restoreJson closes what it opens', () => {
  // Whether a later upgrade of that database goes ahead (a connection left open blocks it).
  async function canUpgrade(name) {
    const { version } = (await indexedDB.databases()).find((d) => d.name === name);
    return new Promise((ok) => {
      const r = indexedDB.open(name, version + 1);
      r.onblocked = () => ok(false);
      r.onerror = () => ok(false);
      r.onsuccess = () => { r.result.close(); ok(true); };
    });
  }
  beforeEach(() => {
    // an opener that doesn't close itself when another tab upgrades
    D.open.mockImplementation(async (...a) => { const db = await open(...a); db.onversionchange = null; return db; });
  });
  it('closes each notebook database after putting it back, written to or not', async () => {
    await makeDb('df-links', 1, { links: { keyPath: 'id' } });
    await B.restoreJson(fileOf(suite({ ref: part('ref-notebook', { s: { rows: [['k', 'v']] } }), links: part('df-links', { other: {} }) })));
    expect(await canUpgrade('ref-notebook')).toBe(true);
    expect(await canUpgrade('df-links')).toBe(true);
  });
  it("closes the look it takes at an existing notebook's database when the browser can't list them", async () => {
    await makeDb('df-stickers', 1, { stickers: { keyPath: 'id' } });
    const list = indexedDB.databases;
    indexedDB.databases = undefined;
    await B.restoreJson(fileOf(suite({ stickers: part('df-stickers', { stickers: { meta: { keyPath: 'id' }, rows: [] } }) })));
    indexedDB.databases = list;
    expect(D.open).toHaveBeenCalledTimes(2);
    expect(await canUpgrade('df-stickers')).toBe(true);
  });
  it("closes a notebook's database when its write fails", async () => {
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id' } });
    await rejectsWith(B.restoreJson(fileOf(suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['b', { noId: true }]] } }) }))), "That wasn't restored.");
    expect(await canUpgrade('ref-notebook')).toBe(true);
  });
  it("closes The Eye's photo database when its write fails", async () => {
    // cut short like cutWritesTo, with an opener that doesn't close itself
    D.open.mockImplementation(async (...a) => {
      const db = await open(...a);
      db.onversionchange = null;
      const tx0 = db.transaction.bind(db);
      db.transaction = (stores, mode) => { const tx = tx0(stores, mode); if (mode === 'readwrite') queueMicrotask(() => tx.abort()); return tx; };
      return db;
    });
    await rejectsWith(B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }, { p: 'x' }) }))), "The Eye's photos weren't restored.");
    expect(await canUpgrade(EYE_DB)).toBe(true);
  });
  it("closes The Eye's photo database after putting the photos back", async () => {
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }, { p: 'x' }) })));
    expect(await canUpgrade(EYE_DB)).toBe(true);
  });
  it('a connection left open does block the upgrade (the check above can fail)', async () => {
    const db = await D.open('left-open', 1, (made) => made.createObjectStore('s'));
    expect(await canUpgrade('left-open')).toBe(false);
    db.close();
  });
});

describe('restoreJson and the cover colours', () => {
  it("leaves a cover alone when the part has no colour (no extra, or extra with no book)", async () => {
    localStorage.setItem('ref-notebook-book', 'keep-ref');
    localStorage.setItem('contact-sheet-book', 'keep-cs');
    const { extra, ...noExtra } = part('ref-notebook', {});
    expect(extra).toEqual({});
    await B.restoreJson(fileOf(suite({ ref: noExtra, 'contact-sheet': part('contact-sheet', {}, { extra: { other: 1 } }) })));
    expect(localStorage.getItem('ref-notebook-book')).toBe('keep-ref');
    expect(localStorage.getItem('contact-sheet-book')).toBe('keep-cs');
    expect(lsKeys()).toEqual(['contact-sheet-book', 'ref-notebook-book']);
  });
  it('never sets a cover for links or stickers, which have none', async () => {
    await B.restoreJson(fileOf(suite({ links: part('df-links', {}, { extra: { book: 'a' } }), stickers: part('df-stickers', {}, { extra: { book: 'b' } }) })));
    expect(lsKeys()).toEqual([]);
  });
  it("is fine when a cover can't be saved (private mode)", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private'); });
    await expect(B.restoreJson(fileOf(suite({ rounds: part('rounds', {}, { extra: { book: 'b' } }) })))).resolves.toBeUndefined();
  });
});

// ---------- restoreJson: photos and other packed values ----------
describe('restoreJson unpacks what the backup packed', () => {
  const HI = 'data:text/plain;base64,aGk='; // "hi"
  const BYTES = 'data:application/octet-stream;base64,AQID'; // 1, 2, 3
  async function restoreRow(value, key = 'k') {
    const puts = vi.spyOn(IDBObjectStore.prototype, 'put');
    puts.mockClear();
    await B.restoreJson(fileOf(suite({ ref: part('ref-notebook', { things: { meta: { keyPath: null }, rows: [[key, value]] } }) })));
    const i = puts.mock.contexts.findIndex((os) => os.name === 'things');
    expect(i).toBeGreaterThan(-1);
    return puts.mock.calls[i];
  }
  it('turns a packed file back into a File with its name, type and date', async () => {
    const [f] = await restoreRow({ __blob: HI, type: 'image/png', name: 'a.png', lastModified: 1000 });
    expect(f).toBeInstanceOf(File);
    expect([f.name, f.type, f.lastModified, f.size]).toEqual(['a.png', 'image/png', 1000, 2]);
    expect(await f.text()).toBe('hi');
  });
  it("gives a File the data URL's type and now's date when the backup had none", async () => {
    vi.spyOn(Date, 'now').mockReturnValue(4242);
    const [f] = await restoreRow({ __blob: HI, type: '', name: 'b.txt' });
    expect([f.name, f.type, f.lastModified]).toEqual(['b.txt', 'text/plain', 4242]);
  });
  it('turns a packed photo with no name back into a Blob', async () => {
    const [b] = await restoreRow({ __blob: HI, type: 'image/jpeg' });
    expect(b).toBeInstanceOf(Blob);
    expect(b).not.toBeInstanceOf(File);
    expect(b.type).toBe('image/jpeg');
    expect(await b.text()).toBe('hi');
    const [b2] = await restoreRow({ __blob: HI });
    expect(b2.type).toBe('text/plain');
  });
  it('turns packed bytes back into their typed array, or a plain ArrayBuffer', async () => {
    const [v] = await restoreRow({ list: [{ __view: 'Uint8Array', __buf: BYTES }, { __buf: BYTES }, { __view: 'JSON', __buf: BYTES }, { __view: 'NoSuchArray', __buf: BYTES }] });
    const [typed, buf, notAView, unknown] = v.list;
    expect(typed).toBeInstanceOf(Uint8Array);
    expect([...typed]).toEqual([1, 2, 3]);
    for (const b of [buf, notAView, unknown]) {
      expect(b).toBeInstanceOf(ArrayBuffer);
      expect([...new Uint8Array(b)]).toEqual([1, 2, 3]);
    }
  });
  it('puts a cut-out sticker back with both its picture and its shape (round 5)', async () => {
    const [s] = await restoreRow({ id: 's', shape: 'cut', edge: 'outline', ratio: 0.9, type: 'image/jpeg', bytes: { __buf: BYTES }, mask: { __buf: BYTES } });
    expect(s).toMatchObject({ id: 's', shape: 'cut', edge: 'outline', ratio: 0.9, type: 'image/jpeg' });
    for (const b of [s.bytes, s.mask]) {
      expect(b).toBeInstanceOf(ArrayBuffer);
      expect([...new Uint8Array(b)]).toEqual([1, 2, 3]);
    }
  });
  it('turns packed dates back into Dates, in keys too', async () => {
    const [v, k] = await restoreRow({ when: { __date: '2026-11-12T10:00:00.000Z' } }, { __date: '2026-01-01T00:00:00.000Z' });
    expect(v.when).toBeInstanceOf(Date);
    expect(v.when.toISOString()).toBe('2026-11-12T10:00:00.000Z');
    expect(k).toBeInstanceOf(Date);
    expect(k.getTime()).toBe(Date.UTC(2026, 0, 1));
  });
  it('keeps plain values, lists and objects as they are, all the way down', async () => {
    const value = { n: 0, s: 'text', nil: null, f: false, list: [1, 'two', null, [true, { deep: 'x' }]], nested: { a: { b: 'c' } }, notPacked: { __blob: 5, __buf: null, __date: 7 } };
    const [v, k] = await restoreRow(value, ['compound', 2]);
    expect(v).toEqual(value);
    expect(Array.isArray(v.list)).toBe(true);
    expect(Array.isArray(v.list[3])).toBe(true);
    expect(k).toEqual(['compound', 2]);
    expect((await restoreRow('just text'))[0]).toBe('just text');
    expect((await restoreRow(12))[0]).toBe(12);
  });
  it('rejects when a packed photo cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('fetch failed'); }));
    await rejectsWith(B.restoreJson(fileOf(suite({ ref: part('ref-notebook', { s: { rows: [['k', { __blob: 'data:x' }]] } }) }))), 'fetch failed');
  });
});

// ---------- restoreJson: The Eye ----------
describe("restoreJson puts The Eye back", () => {
  it("makes The Eye's photo database, puts each photo under its key, and saves the shoots", async () => {
    const state = { shoots: [{ id: 's1' }], presentation: { color: '#abcdef' } };
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart(state, { p1: 'data:one', p2: { src: 'two' } }) })));
    expect(D.open.mock.calls[0][0]).toBe(EYE_DB);
    expect(D.open.mock.calls[0][1]).toBe(1);
    expect(await readDb(EYE_DB)).toEqual({ version: 1, stores: { images: { keyPath: null, autoIncrement: false, indexes: [], rows: [['p1', 'data:one'], ['p2', { src: 'two' }]] } } });
    expect(localStorage.getItem(EYE)).toBe(JSON.stringify(state));
    expect(localStorage.getItem('df-app-color')).toBe('#abcdef');
  });
  it("hands D.open an upgrade step that makes the images store only when it's missing", async () => {
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }) })));
    const upgrade = D.open.mock.calls[0][2];
    const made = (has) => ({ objectStoreNames: { contains: vi.fn((s) => has.includes(s)) }, createObjectStore: vi.fn() });
    const empty = made([]);
    upgrade(empty);
    expect(empty.objectStoreNames.contains).toHaveBeenCalledWith('images');
    expect(empty.createObjectStore.mock.calls).toEqual([['images']]);
    const already = made(['images']); // can't happen on a real version-1 upgrade, but the step allows for it
    upgrade(already);
    expect(already.createObjectStore).not.toHaveBeenCalled();
  });
  it('adds to the photos already here, replacing those with the same key', async () => {
    await makeDb(EYE_DB, 1, { images: { rows: [['old', 'kept'], ['p1', 'before']] } });
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }, { p1: 'after' }) })));
    expect((await readDb(EYE_DB)).stores.images.rows).toEqual([['old', 'kept'], ['p1', 'after']]);
  });
  it('is fine with no photos at all, and keeps the app colour when there is none', async () => {
    localStorage.setItem('df-app-color', 'green');
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }) })));
    await B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [], presentation: { color: '' } }, {}) })));
    expect((await readDb(EYE_DB)).stores.images.rows).toEqual([]);
    expect(localStorage.getItem('df-app-color')).toBe('green');
    expect(localStorage.getItem(EYE)).toBe('{"shoots":[],"presentation":{"color":""}}');
  });
  it("throws when the shoots don't fit in localStorage", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    await rejectsWith(B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }, { p: 'x' }) }))), 'QuotaExceededError');
  });
  it("rejects with \"The Eye's photos weren't restored.\" when the photo write is cut short", async () => {
    cutWritesTo(EYE_DB);
    await rejectsWith(B.restoreJson(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }, { p: 'x' }) }))), "The Eye's photos weren't restored.");
    expect(lsKeys()).toEqual([]);
  });
  it("checks The Eye's part again just before writing it", async () => {
    // The part is checked once up front; this changes it after that check to reach the second one.
    for (const spoil of [(eye) => { eye.state = null; }, (eye) => { eye.state.shoots = 'x'; }]) {
      const text = JSON.stringify(suite({ 'the-eye': eyePart({ shoots: [] }) }));
      const parse = JSON.parse;
      let parsed;
      const spy = vi.spyOn(JSON, 'parse').mockImplementation((s, r) => { const v = parse(s, r); if (s === text) parsed = v; return v; });
      indexedDB.databases = async () => { spoil(parsed.notebooks['the-eye']); return []; };
      await rejectsWith(B.restoreJson(fileOf(text)), /^The Eye's part of that file isn't right\.$/);
      spy.mockRestore();
    }
    expect(D.open).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
});

// ---------- Overthoughts, taken out on 15 Nov ----------
describe('restoreJson skips an Overthoughts part', () => {
  it('in a backup of all four: the rest goes back, nothing of it does', async () => {
    const ot = part('overthoughts', { entries: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a' }]] } }, { extra: { book: 'leaf' } });
    await B.restoreJson(fileOf(suite({ ref: part('ref-notebook', { s: { rows: [['k', 'v']] } }), overthoughts: ot })));
    expect((await readDb('ref-notebook')).stores.s.rows).toEqual([['k', 'v']]);
    expect(await exists('overthoughts')).toBe(false);
    expect(localStorage.getItem('overthoughts-book')).toBeNull();
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['ref-notebook']);
  });
  it('even one that is broken, or all there is', async () => {
    await expect(B.restoreJson(fileOf(suite({ overthoughts: { nope: true } })))).resolves.toBeUndefined();
    await expect(B.restoreJson(fileOf(suite({ overthoughts: part('ref-notebook', {}) })))).resolves.toBeUndefined();
    expect(D.open).not.toHaveBeenCalled();
  });
});

// ---------- one notebook's own .json ----------
describe("restoreJson puts back a notebook's own .json", () => {
  it('Ref, Layouts and Rounds, each with its cover colour', async () => {
    for (const [db, book] of [['ref-notebook', 'ref-notebook-book'], ['contact-sheet', 'contact-sheet-book'], ['rounds', 'rounds-book']]) {
      await B.restoreJson(fileOf(part(db, { s: { rows: [['k', db]] } }, { extra: { book: `${db}-colour` } })));
      expect((await readDb(db)).stores.s.rows).toEqual([['k', db]]);
      expect(localStorage.getItem(book)).toBe(`${db}-colour`);
    }
    expect(lsKeys()).toEqual(['contact-sheet-book', 'ref-notebook-book', 'rounds-book']);
  });
  it('swaps what was there, as a backup of all four does', async () => {
    await makeDb('ref-notebook', 3, { s: { rows: [['old', 'x']] } });
    await B.restoreJson(fileOf(part('ref-notebook', { s: { rows: [['new', 'y']] } })), 'ref');
    expect(await readDb('ref-notebook')).toMatchObject({ version: 3, stores: { s: { rows: [['new', 'y']] } } });
  });
  it("The Eye's: its photos and shoots", async () => {
    const state = { shoots: [{ id: 's1' }] };
    await B.restoreJson(fileOf({ version: 1, exportedAt: 'x', ...eyePart(state, { p: 'data:p' }) }), 'the-eye');
    expect((await readDb(EYE_DB)).stores.images.rows).toEqual([['p', 'data:p']]);
    expect(localStorage.getItem(EYE)).toBe(JSON.stringify(state));
  });
  it("refuses another notebook's, from inside one, writing nothing", async () => {
    await rejectsWith(B.restoreJson(fileOf(part('contact-sheet', { s: {} })), 'ref'), OTHER);
    await rejectsWith(B.restoreJson(fileOf(eyePart({ shoots: [] })), 'rounds'), OTHER);
    expect(D.open).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
});

// ---------- just one notebook from a backup of all four ----------
describe('restoreJson puts back just one notebook from a backup of all four', () => {
  const all = () => suite({
    ref: part('ref-notebook', { s: { rows: [['k', 'ref']] } }, { extra: { book: 'r' } }),
    'contact-sheet': part('contact-sheet', { s: { rows: [['k', 'cs']] } }, { extra: { book: 'c' } }),
    rounds: part('rounds', { s: { rows: [['k', 'rounds']] } }),
    links: part('df-links', { links: { rows: [['l', 'board']] } }),
    stickers: part('df-stickers', { s: { rows: [['k', 'sticker']] } }),
    'the-eye': eyePart({ shoots: [{ id: 'e' }] }, { p: 'photo' }),
  });
  it('Ref: its part and cover, the others left as they are', async () => {
    await makeDb('contact-sheet', 1, { s: { rows: [['mine', 'kept']] } });
    localStorage.setItem(EYE, 'mine');
    await B.restoreJson(fileOf(all()), 'ref');
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['ref-notebook']);
    expect((await readDb('ref-notebook')).stores.s.rows).toEqual([['k', 'ref']]);
    expect((await readDb('contact-sheet')).stores.s.rows).toEqual([['mine', 'kept']]);
    expect(lsKeys()).toEqual([EYE, 'ref-notebook-book']);
    expect(localStorage.getItem(EYE)).toBe('mine');
  });
  it('Layouts, and Rounds', async () => {
    await B.restoreJson(fileOf(all()), 'contact-sheet');
    await B.restoreJson(fileOf(all()), 'rounds');
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['contact-sheet', 'rounds']);
    expect(localStorage.getItem('contact-sheet-book')).toBe('c');
  });
  it("The Eye: its shoots, photos and the boards sent to them, as its own backup has them", async () => {
    await B.restoreJson(fileOf(all()), 'the-eye');
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['df-links', EYE_DB]);
    expect((await readDb('df-links')).stores.links.rows).toEqual([['l', 'board']]);
    expect(localStorage.getItem(EYE)).toBe('{"shoots":[{"id":"e"}]}');
    expect(await exists('ref-notebook')).toBe(false);
  });
  it("checks only that notebook's part: another's broken one doesn't stop it", async () => {
    const data = all();
    data.notebooks.ref = { broken: true };
    data.notebooks['the-eye'] = { state: null };
    await B.restoreJson(fileOf(data), 'rounds');
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['rounds']);
    await rejectsWith(B.restoreJson(fileOf(data), 'ref'), "The ref part of that file isn't right. Nothing was changed.");
    await rejectsWith(B.restoreJson(fileOf(data), 'the-eye'), EYE_BAD);
  });
  it('says so when the backup has nothing from it', async () => {
    await rejectsWith(B.restoreJson(fileOf(suite({ ref: part('ref-notebook', {}) })), 'rounds'), 'That backup has nothing from Rounds.');
    await rejectsWith(B.restoreJson(fileOf(suite({ ref: null })), 'ref'), 'That backup has nothing from Ref.');
    // The Eye's boards alone aren't The Eye.
    await rejectsWith(B.restoreJson(fileOf(suite({ links: part('df-links', {}) })), 'the-eye'), 'That backup has nothing from The Eye.');
    expect(D.open).not.toHaveBeenCalled();
  });
});

// ---------- reading a .json ----------
describe('readJson', () => {
  it('tells a backup of all four from a notebook\'s own', async () => {
    const s = suite({});
    expect(await B.readJson(fileOf(s))).toEqual({ data: s, all: true });
    for (const [db, app] of [['ref-notebook', 'ref'], ['contact-sheet', 'contact-sheet'], ['rounds', 'rounds']]) {
      expect(await B.readJson(fileOf(part(db, {})))).toEqual({ data: part(db, {}), app });
    }
    expect(await B.readJson(fileOf(eyePart({ shoots: [] })))).toEqual({ data: eyePart({ shoots: [] }), app: 'the-eye' });
  });
  it("throws for anything else, or a file that can't be read", async () => {
    await rejectsWith(B.readJson(fileOf('nope')), NOT_A_BACKUP);
    await rejectsWith(B.readJson(fileOf(part('df-stickers', {}))), NOT_A_BACKUP);
    await rejectsWith(B.readJson(undefined), NOT_A_BACKUP);
  });
});

describe('partFile', () => {
  it("is one notebook's part of a backup of all four, as a .json of its own", async () => {
    const ref = part('ref-notebook', { s: { rows: [['k', 'v']] } });
    const f = await B.partFile(fileOf(suite({ ref, rounds: null })), 'ref');
    expect(f).toBeInstanceOf(File);
    expect([f.name, f.type]).toEqual(['ref-backup.json', 'application/json']);
    expect(JSON.parse(await f.text())).toEqual(ref);
    const eye = await B.partFile(fileOf(suite({ 'the-eye': eyePart({ shoots: [] }) })), 'the-eye');
    expect(eye.name).toBe('the-eye-backup.json');
    expect(JSON.parse(await eye.text())).toEqual(eyePart({ shoots: [] }));
  });
  it("is the file itself when it's a notebook's own, or has nothing from that one", async () => {
    const own = fileOf(part('ref-notebook', {}));
    expect(await B.partFile(own, 'ref')).toBe(own);
    const none = fileOf(suite({ ref: part('ref-notebook', {}) }));
    expect(await B.partFile(none, 'rounds')).toBe(none);
  });
  it("throws for a file that isn't a backup", async () => {
    await rejectsWith(B.partFile(fileOf('{'), 'ref'), NOT_A_BACKUP);
  });
});
