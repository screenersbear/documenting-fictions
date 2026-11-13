// suite-backup.js: "Back up all four" on the shelf. makeBackup hands the
// right databases and localStorage keys to df-data.js's zipBackup; restoreZip
// puts a zip's cover colours and The Eye's shoots back; restoreJson puts a
// one-file (.json) backup of all four back into IndexedDB and localStorage.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { open, rows } from '../overthoughts/fake-df-data.mjs';

const DBS = ['ref-notebook', 'contact-sheet', 'overthoughts', 'df-links', 'df-stickers'];
const EYE_DB = 'starky-moodboards';
const BOOKS = ['ref-notebook-book', 'contact-sheet-book', 'overthoughts-book'];
const EYE = 'dailies_state_v1';
const EYE_BAD = "The Eye's part of that file isn't right. Nothing was changed.";
const NOT_SUITE = "That file isn't a backup of all four. A single notebook's backup goes back in from that notebook's options.";

let D;
let B;
async function load(dfData) {
  vi.resetModules(); // the script runs once per import: a fresh copy each time
  delete window.DFSuiteBackup;
  if (dfData === undefined) delete window.DFData;
  else window.DFData = dfData;
  await import('../../../suite-backup.js');
  return window.DFSuiteBackup;
}
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  D = {
    zipBackup: vi.fn(async () => ({ parts: ['zip'], size: 3 })),
    restoreZip: vi.fn(async () => ({ local: async () => null })),
    open: vi.fn(open), // df-data.js's opener, on fake-indexeddb
    todayStr: vi.fn(() => '2026-11-12'),
  };
  B = await load(D);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete window.DFData;
  delete window.DFSuiteBackup;
});

// ---------- helpers ----------
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
const lsKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).sort();
const exists = async (name) => (await indexedDB.databases()).some((d) => d.name === name);
// A database already on the device: `stores` is { name: { keyPath, autoIncrement, rows: [[key, value]] } }.
async function makeDb(name, version, stores) {
  const db = await open(name, version, (made) => {
    for (const [s, m] of Object.entries(stores)) made.createObjectStore(s, m.keyPath ? { keyPath: m.keyPath } : {});
  });
  for (const [s, m] of Object.entries(stores)) {
    if (!(m.rows || []).length) continue;
    const tx = db.transaction(s, 'readwrite');
    m.rows.forEach(([k, v]) => (m.keyPath ? tx.objectStore(s).put(v) : tx.objectStore(s).put(v, k)));
    await new Promise((ok, no) => { tx.oncomplete = ok; tx.onerror = () => no(tx.error); });
  }
  db.close();
}
// Everything in a database: its version, and each store's shape and rows.
async function readDb(name) {
  const db = await open(name);
  const out = { version: db.version, stores: {} };
  for (const s of [...db.objectStoreNames]) {
    const os = db.transaction(s).objectStore(s);
    const indexes = [...os.indexNames].map((n) => { const ix = os.index(n); return { name: n, keyPath: ix.keyPath, unique: ix.unique, multiEntry: ix.multiEntry }; });
    out.stores[s] = { keyPath: os.keyPath, autoIncrement: os.autoIncrement, indexes, rows: await rows(db, s) };
  }
  db.close();
  return out;
}
const fileOf = (data) => new File([typeof data === 'string' ? data : JSON.stringify(data)], 'backup.json', { type: 'application/json' });
const suite = (notebooks) => ({ app: 'documenting-fictions', kind: 'suite-backup', version: 1, exportedAt: '2026-11-01T00:00:00.000Z', notebooks });
const part = (database, stores, more = {}) => ({ app: database, database, version: 1, exportedAt: 'x', extra: {}, stores, ...more });
const eyePart = (state, images) => ({ state, ...(images === undefined ? {} : { images }) });
// Every readwrite transaction on that database is cut short (an abort has no error object).
function cutWritesTo(name) {
  D.open.mockImplementation(async (n, ...rest) => {
    const db = await open(n, ...rest);
    if (n === name) {
      const tx0 = db.transaction.bind(db);
      db.transaction = (stores, mode) => {
        const tx = tx0(stores, mode);
        if (mode === 'readwrite') queueMicrotask(() => tx.abort());
        return tx;
      };
    }
    return db;
  });
}
// A zip for restoreZip: what it holds for localStorage keys. Its check runs the way df-data.js runs it.
function zipHolding(local) {
  const read = async (k) => (k in local ? local[k] : null);
  const checkLocal = vi.fn(read);
  const rLocal = vi.fn(read);
  D.restoreZip.mockImplementation(async (files, opts) => {
    if (opts.check) await opts.check(checkLocal);
    return { manifest: {}, extra: {}, counts: {}, local: rLocal };
  });
  return { checkLocal, rLocal };
}

// ---------- loading ----------
describe('loading the script', () => {
  it('does nothing without df-data.js', async () => {
    expect(await load(undefined)).toBeUndefined();
  });
  it('sets window.DFSuiteBackup with its three jobs and The Eye\'s last-backup key', () => {
    expect(Object.keys(B).sort()).toEqual(['EYE_LAST_BACKUP', 'makeBackup', 'restoreJson', 'restoreZip']);
    expect(typeof B.makeBackup).toBe('function');
    expect(typeof B.restoreZip).toBe('function');
    expect(typeof B.restoreJson).toBe('function');
    expect(B.EYE_LAST_BACKUP).toBe('dailies_last_backup_v1');
  });
  it('reads df-data.js once, when it loads', async () => {
    const later = { ...D, zipBackup: vi.fn() };
    window.DFData = later;
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    expect(D.zipBackup).toHaveBeenCalledTimes(1);
    expect(later.zipBackup).not.toHaveBeenCalled();
  });
});

// ---------- makeBackup ----------
describe('makeBackup', () => {
  it('is null with nothing to back up, and makes no zip', async () => {
    await makeDb('someone-else', 1, { s: {} });
    expect(await B.makeBackup()).toBeNull();
    expect(D.zipBackup).not.toHaveBeenCalled();
  });
  it('zips only the databases that are there, with every cover colour', async () => {
    await makeDb('df-stickers', 1, { s: {} });
    await makeDb('ref-notebook', 1, { s: {} });
    await makeDb('someone-else', 1, { s: {} });
    const onProgress = () => {};
    const out = await B.makeBackup(onProgress);
    expect(out).toBe(await D.zipBackup.mock.results[0].value);
    expect(D.zipBackup).toHaveBeenCalledTimes(1);
    expect(D.zipBackup).toHaveBeenCalledWith({
      app: 'documenting-fictions',
      kind: 'suite',
      databases: ['ref-notebook', 'df-stickers'],
      local: BOOKS,
      filename: 'documenting-fictions-backup-2026-11-12.zip',
      onProgress,
    });
  });
  it("adds The Eye's photos and shoots when The Eye has been used", async () => {
    for (const n of DBS) await makeDb(n, 1, { s: {} });
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    const opts = D.zipBackup.mock.calls[0][0];
    expect(opts.databases).toEqual([...DBS, EYE_DB]);
    expect(opts.local).toEqual([EYE, ...BOOKS]);
    expect(opts.onProgress).toBeUndefined();
  });
  it('backs up The Eye on its own', async () => {
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual([EYE_DB]);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual([EYE, ...BOOKS]);
  });
  it("counts an empty Eye state as no Eye", async () => {
    localStorage.setItem(EYE, '');
    expect(await B.makeBackup()).toBeNull();
  });
  it("tries every notebook's database when the browser can't list them", async () => {
    indexedDB.databases = undefined;
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual(DBS);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual(BOOKS);
  });
  it("leaves The Eye out when localStorage can't be read", async () => {
    await makeDb('overthoughts', 1, { s: {} });
    localStorage.setItem(EYE, '{"shoots":[]}');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual(['overthoughts']);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual(BOOKS);
  });
  it("passes on zipBackup's failure", async () => {
    await makeDb('ref-notebook', 1, { s: {} });
    D.zipBackup.mockRejectedValue(new Error('disk full'));
    await rejectsWith(B.makeBackup(), 'disk full');
  });
});

// ---------- restoreZip ----------
describe('restoreZip', () => {
  it("asks df-data.js for the suite's databases, with a check of The Eye's part", async () => {
    zipHolding({});
    const files = [new File(['a'], 'a.zip'), new File(['b'], 'b.zip')];
    const onProgress = () => {};
    await expect(B.restoreZip(files, onProgress)).resolves.toBeUndefined();
    expect(D.restoreZip).toHaveBeenCalledTimes(1);
    expect(D.restoreZip.mock.calls[0][0]).toBe(files);
    expect(D.restoreZip.mock.calls[0][1]).toEqual({ kind: 'suite', databases: [...DBS, EYE_DB], onProgress, check: expect.any(Function) });
  });
  it('puts the cover colours back, keeping a cover the file has nothing for', async () => {
    localStorage.setItem('contact-sheet-book', 'keep');
    const { rLocal } = zipHolding({ 'ref-notebook-book': '{"c":1}', 'overthoughts-book': '{"c":3}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('ref-notebook-book')).toBe('{"c":1}');
    expect(localStorage.getItem('contact-sheet-book')).toBe('keep');
    expect(localStorage.getItem('overthoughts-book')).toBe('{"c":3}');
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual([...BOOKS, EYE]);
    expect(lsKeys()).toEqual([...BOOKS].sort());
  });
  it("puts The Eye's shoots back as they are, with its colour", async () => {
    const st = JSON.stringify({ shoots: [{ id: 's1' }], presentation: { color: '#123456' } });
    const { checkLocal } = zipHolding({ [EYE]: st });
    await B.restoreZip([]);
    expect(localStorage.getItem(EYE)).toBe(st);
    expect(localStorage.getItem('df-app-color')).toBe('#123456');
    expect(checkLocal.mock.calls.map(([k]) => k)).toEqual([EYE]);
  });
  it("keeps the app colour when The Eye's part has none", async () => {
    localStorage.setItem('df-app-color', 'blue');
    zipHolding({ [EYE]: '{"shoots":[]}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('df-app-color')).toBe('blue');
    zipHolding({ [EYE]: '{"shoots":[],"presentation":{"color":""}}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('df-app-color')).toBe('blue');
    expect(localStorage.getItem(EYE)).toBe('{"shoots":[],"presentation":{"color":""}}');
  });
  it('leaves The Eye alone when the file has no Eye part (null or missing)', async () => {
    localStorage.setItem(EYE, 'mine');
    zipHolding({ [EYE]: null });
    await B.restoreZip([]);
    zipHolding({ [EYE]: undefined });
    await B.restoreZip([]);
    expect(localStorage.getItem(EYE)).toBe('mine');
    expect(lsKeys()).toEqual([EYE]);
  });
  it("refuses an Eye part that isn't JSON, before anything is changed", async () => {
    const { rLocal } = zipHolding({ [EYE]: 'not json', 'ref-notebook-book': 'x' });
    await rejectsWith(B.restoreZip([]), EYE_BAD);
    expect(rLocal).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
  it('refuses an Eye part with no list of shoots', async () => {
    for (const st of ['{}', '{"shoots":{}}', '{"shoots":"a"}', 'null', '[]']) {
      zipHolding({ [EYE]: st });
      await rejectsWith(B.restoreZip([]), EYE_BAD);
    }
    expect(lsKeys()).toEqual([]);
  });
  it("throws when The Eye's shoots don't fit in localStorage, after the covers were tried", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const { rLocal } = zipHolding({ 'ref-notebook-book': 'x', [EYE]: '{"shoots":[]}' });
    await rejectsWith(B.restoreZip([]), 'QuotaExceededError');
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual([...BOOKS, EYE]);
  });
  it("is fine when a cover can't be saved (private mode)", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private'); });
    zipHolding({ 'overthoughts-book': 'x' });
    await expect(B.restoreZip([])).resolves.toBeUndefined();
  });
  it("passes on df-data.js's failure", async () => {
    D.restoreZip.mockRejectedValue(new Error("That file isn't a backup of all four."));
    await rejectsWith(B.restoreZip([]), "That file isn't a backup of all four.");
  });
});

// ---------- restoreJson: refusing a file ----------
describe('restoreJson refuses', () => {
  it("a file that isn't JSON", async () => {
    await rejectsWith(B.restoreJson(fileOf('{ nope')), "That file isn't a Documenting Fictions backup.");
  });
  it("a file that can't be read", async () => {
    await rejectsWith(B.restoreJson({ text: () => Promise.reject(new Error('gone')) }), "That file isn't a Documenting Fictions backup.");
  });
  it('JSON that is not a backup of all four', async () => {
    for (const data of [null, 0, '"text"', {}, { kind: 'notebook', notebooks: {} }, part('ref-notebook', {}), { kind: 'suite-backup' }, { kind: 'suite-backup', notebooks: null }]) {
      await rejectsWith(B.restoreJson(fileOf(data)), NOT_SUITE);
    }
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
    const data2 = suite({ stickers: part('df-stickers', {}), overthoughts: part('ref-notebook', {}) });
    await rejectsWith(B.restoreJson(fileOf(data2)), "The overthoughts part of that file isn't right. Nothing was changed.");
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
    await makeDb('overthoughts', 1, { entries: { keyPath: 'id', rows: [['a', { id: 'a' }]] } });
    await B.restoreJson(fileOf(suite({ overthoughts: part('overthoughts', { entries: { meta: { keyPath: 'id' } } }) })));
    expect((await readDb('overthoughts')).stores.entries.rows).toEqual([]);
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
    expect(D.open.mock.calls[0]).toEqual(['df-stickers', undefined, null]);
    const after = await readDb('df-stickers');
    expect(after.version).toBe(3);
    expect(after.stores.stickers.rows).toEqual([['s', { id: 's' }]]);
  });
  it('with no list of databases, a notebook never opened here gets an empty database and none of its rows', async () => {
    // Known gap (see the report): without indexedDB.databases the database can't be made from the backup.
    indexedDB.databases = undefined;
    await B.restoreJson(fileOf(suite({ overthoughts: part('overthoughts', { entries: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a' }]] } }, { version: 1 }) })));
    expect(D.open.mock.calls[0]).toEqual(['overthoughts', undefined, null]);
    expect(await readDb('overthoughts')).toEqual({ version: 1, stores: {} });
  });
  it('puts every part back in the same order, Eye last', async () => {
    const data = suite({
      'the-eye': eyePart({ shoots: [] }),
      stickers: part('df-stickers', {}),
      links: part('df-links', {}),
      overthoughts: part('overthoughts', {}),
      'contact-sheet': part('contact-sheet', {}),
      ref: part('ref-notebook', {}),
    });
    await B.restoreJson(fileOf(data));
    expect(D.open.mock.calls.map(([n]) => n)).toEqual([...DBS, EYE_DB]);
  });
  it("rejects, writing nothing, when the rows break one of the store's rules", async () => {
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['keep', { id: 'keep', name: 'K' }]] } });
    const db = await open('ref-notebook', 2, (made, old, tx) => tx.objectStore('boards').createIndex('byName', 'name', { unique: true }));
    db.close();
    const data = suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a', name: 'same' }], ['b', { id: 'b', name: 'same' }]] } }) });
    await rejectsWith(B.restoreJson(fileOf(data)), "That wasn't restored.");
    expect((await readDb('ref-notebook')).stores.boards.rows).toEqual([['keep', { id: 'keep', name: 'K' }]]);
  });
  it('rejects a row the store cannot take at all (known gap: the rows before it are already in)', async () => {
    // A value with no key for a keyPath store throws while the write is still open,
    // so the clear and the rows before it go in (see the report).
    await makeDb('ref-notebook', 1, { boards: { keyPath: 'id', rows: [['keep', { id: 'keep' }]] } });
    const data = suite({ ref: part('ref-notebook', { boards: { meta: { keyPath: 'id' }, rows: [['a', { id: 'a' }], ['b', { noId: true }]] } }) });
    expect((await rejectsWith(B.restoreJson(fileOf(data)))).name).toBe('DataError');
    expect((await readDb('ref-notebook')).stores.boards.rows).toEqual([['a', { id: 'a' }]]);
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
    await expect(B.restoreJson(fileOf(suite({ overthoughts: part('overthoughts', {}, { extra: { book: 'b' } }) })))).resolves.toBeUndefined();
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
