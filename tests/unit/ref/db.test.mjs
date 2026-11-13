// @vitest-environment node
// ref/js/db.js: Ref's IndexedDB storage (photos, thumbs, files, folders, boards,
// stickers, meta), run against fake-indexeddb. The node environment gives the
// real Blob class, which IndexedDB can store, so old Blob-backed records can be tested.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory, IDBDatabase } from 'fake-indexeddb';

const NAME = 'ref-notebook';
const STORES = ['boards', 'files', 'folders', 'meta', 'photos', 'stickers', 'thumbs'];
const T1 = '2026-11-12T10:00:00.000Z', T2 = '2026-11-13T09:30:00.000Z', T3 = '2026-12-01T00:00:00.000Z';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let db;
const at = (iso) => vi.setSystemTime(new Date(iso));

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory(); // a brand new, empty IndexedDB per test
  vi.useFakeTimers({ toFake: ['Date'] }); // only the clock: fake-indexeddb needs real timers
  at(T1);
  vi.resetModules(); // the open connection is cached in the module
  db = await import('../../../ref/js/db.js');
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// A second connection, the way another tab (or the test) sees the database.
const open = (version, upgrade) => new Promise((resolve, reject) => {
  const r = version === undefined ? indexedDB.open(NAME) : indexedDB.open(NAME, version);
  r.onupgradeneeded = () => upgrade?.(r.result);
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
  r.onblocked = () => reject(new Error('blocked'));
});
const raw = async (store, mode, fn) => {
  const d = await open();
  try {
    return await new Promise((resolve, reject) => {
      const t = d.transaction([store], mode);
      const r = fn(t.objectStore(store));
      t.oncomplete = () => resolve(r.result);
      t.onabort = () => reject(t.error);
    });
  } finally { d.close(); }
};
const read = (store, key) => raw(store, 'readonly', (s) => (key === undefined ? s.getAll() : s.get(key)));
const write = (store, value) => raw(store, 'readwrite', (s) => s.put(value));
const bytes = async (blob) => Array.from(new Uint8Array(await blob.arrayBuffer()));
// The value a promise rejects with (fails the test if it resolves instead).
const errorOf = (p) => p.then(() => { throw new Error('expected a rejection'); }, (e) => e);
const failed = async (p) => { try { await p; return false; } catch { return true; } };
// Every transaction the app starts (of the given mode) is aborted right after it is set up.
const abortTransactions = (mode) => {
  const real = IDBDatabase.prototype.transaction;
  vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (...args) {
    const t = real.apply(this, args);
    if (!mode || t.mode === mode) queueMicrotask(() => t.abort());
    return t;
  });
};

const photo = (id, extra = {}) => ({ id, name: `${id}.jpg`, folderIds: [], favorite: false, ...extra });
const board = (id, images, extra = {}) => ({ id, name: id, pages: [{ template: 'lp-grid-4', images }], ...extra });

describe('opening the database', () => {
  it('creates the seven stores at version 3, keyed by id (meta by key)', async () => {
    await db.listPhotos();
    const d = await open();
    expect(d.version).toBe(3);
    expect([...d.objectStoreNames].sort()).toEqual(STORES);
    const t = d.transaction(STORES, 'readonly');
    for (const s of STORES) expect(t.objectStore(s).keyPath, s).toBe(s === 'meta' ? 'key' : 'id');
    d.close();
  });
  it('opens the database once and reuses the connection', async () => {
    const spy = vi.spyOn(indexedDB, 'open');
    await Promise.all([db.listPhotos(), db.listFolders()]);
    await db.listBoards();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(NAME, 3);
  });
  it('adds missing stores to an older database and keeps what was in it', async () => {
    const old = await open(2, (d) => { d.createObjectStore('photos', { keyPath: 'id' }).put(photo('p1')); });
    old.close();
    expect(await db.listPhotos()).toEqual([photo('p1')]);
    expect(await db.listStickers()).toEqual([]);
    const d = await open();
    expect([...d.objectStoreNames].sort()).toEqual(STORES);
    d.close();
  });
  it('fails when the database is newer than the app', async () => {
    (await open(5)).close();
    expect((await errorOf(db.listPhotos())).name).toBe('VersionError');
  });
  it('closes its connection when another tab needs to upgrade', async () => {
    await db.listPhotos();
    const newer = await open(4);
    expect(newer.version).toBe(4);
    newer.close();
  });
});

describe('addPhoto and listPhotos', () => {
  it('lists nothing in a new notebook', async () => {
    expect(await db.listPhotos()).toEqual([]);
  });
  it('saves the record, thumbnail and big picture, and returns the stamped record', async () => {
    const rec = { name: 'a.jpg', folderIds: [] };
    const r = await db.addPhoto(rec, new Uint8Array([9, 8, 7]), new Uint8Array([1, 2]));
    expect(r.id).toMatch(UUID_RE);
    expect(r).toEqual({ name: 'a.jpg', folderIds: [], id: r.id, createdAt: T1, updatedAt: T1 });
    expect(rec).toEqual({ name: 'a.jpg', folderIds: [] });
    expect(await read('photos', r.id)).toEqual(r);
    expect(await read('thumbs', r.id)).toEqual({ id: r.id, bytes: new Uint8Array([1, 2]) });
    expect(await read('files', r.id)).toEqual({ id: r.id, full: new Uint8Array([9, 8, 7]) });
    expect(await db.listPhotos()).toEqual([r]);
  });
  it('keeps an id and creation time that are already set', async () => {
    const r = await db.addPhoto({ id: 'p1', createdAt: '2020-05-05T00:00:00.000Z', folderIds: [] }, new Uint8Array([1]), new Uint8Array([2]));
    expect(r).toEqual({ id: 'p1', createdAt: '2020-05-05T00:00:00.000Z', updatedAt: T1, folderIds: [] });
  });
  it('gives each new photo its own id', async () => {
    const a = await db.addPhoto({ folderIds: [] }, new Uint8Array([1]), new Uint8Array([1]));
    const b = await db.addPhoto({ folderIds: [] }, new Uint8Array([1]), new Uint8Array([1]));
    expect(a.id).not.toBe(b.id);
    expect(await db.listPhotos()).toHaveLength(2);
  });
  it('fails for a record that cannot be stored', async () => {
    expect((await errorOf(db.addPhoto({ folderIds: [], bad: () => {} }, new Uint8Array([1]), new Uint8Array([1])))).name).toBe('DataCloneError');
    expect(await db.listPhotos()).toEqual([]);
  });
});

describe('getFile', () => {
  it('is null for a photo with no big picture', async () => {
    await db.listPhotos();
    expect(await db.getFile('nope')).toBeNull();
  });
  it('is null when the stored picture is empty', async () => {
    await db.listPhotos();
    await write('files', { id: 'e', full: null });
    expect(await db.getFile('e')).toBeNull();
  });
  it('gives a JPEG blob of the stored bytes', async () => {
    const r = await db.addPhoto({ folderIds: [] }, new Uint8Array([255, 216, 255]), new Uint8Array([1]));
    const blob = await db.getFile(r.id);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(await bytes(blob)).toEqual([255, 216, 255]);
  });
  it('reads an old record that kept the picture as a Blob', async () => {
    await db.listPhotos();
    await write('files', { id: 'old', full: new Blob([new Uint8Array([4, 5, 6])], { type: 'image/png' }) });
    const blob = await db.getFile('old');
    expect(blob.type).toBe('image/jpeg');
    expect(await bytes(blob)).toEqual([4, 5, 6]);
  });
  it('reads a picture stored as an ArrayBuffer', async () => {
    await db.listPhotos();
    await write('files', { id: 'ab', full: new Uint8Array([7, 7]).buffer });
    expect(await bytes(await db.getFile('ab'))).toEqual([7, 7]);
  });
});

describe('getThumb and getThumbs', () => {
  it('getThumb gives the stored bytes, or undefined', async () => {
    const r = await db.addPhoto({ folderIds: [] }, new Uint8Array([1]), new Uint8Array([3, 4]));
    expect(await db.getThumb(r.id)).toEqual(new Uint8Array([3, 4]));
    expect(await db.getThumb('nope')).toBeUndefined();
  });
  it('getThumbs gives a map of the thumbnails it found', async () => {
    const a = await db.addPhoto({ id: 'a', folderIds: [] }, new Uint8Array([1]), new Uint8Array([10]));
    const b = await db.addPhoto({ id: 'b', folderIds: [] }, new Uint8Array([1]), new Uint8Array([20]));
    const got = await db.getThumbs([b.id, 'missing', a.id]);
    expect(got).toBeInstanceOf(Map);
    expect([...got.keys()].sort()).toEqual(['a', 'b']);
    expect(got.get('a')).toEqual(new Uint8Array([10]));
    expect(got.get('b')).toEqual(new Uint8Array([20]));
  });
  it('getThumbs of no ids is an empty map', async () => {
    const got = await db.getThumbs([]);
    expect(got).toBeInstanceOf(Map);
    expect(got.size).toBe(0);
  });
  it('getThumbs fails for an id that is not a valid key', async () => {
    expect((await errorOf(db.getThumbs([{}]))).name).toBe('DataError');
  });
});

describe('moveThumbOff', () => {
  it('moves an old record\'s thumb into the thumbs store and returns the record without it', async () => {
    await db.listPhotos();
    const old = photo('p1', { thumb: 'old-blob', createdAt: T1, updatedAt: T1 });
    await write('photos', old);
    at(T2);
    const rest = await db.moveThumbOff(old, new Uint8Array([5]));
    expect(rest).toEqual(photo('p1', { createdAt: T1, updatedAt: T1 }));
    expect('thumb' in rest).toBe(false);
    expect(old.thumb).toBe('old-blob');
    expect(await read('photos', 'p1')).toEqual(rest);
    expect(await read('thumbs', 'p1')).toEqual({ id: 'p1', bytes: new Uint8Array([5]) });
  });
  it('works for a record that had no thumb field', async () => {
    const rest = await db.moveThumbOff(photo('p2'), new Uint8Array([1]));
    expect(rest).toEqual(photo('p2'));
    expect(await db.getThumb('p2')).toEqual(new Uint8Array([1]));
  });
  it('fails for a record with no id', async () => {
    expect((await errorOf(db.moveThumbOff({ name: 'x' }, new Uint8Array([1])))).name).toBe('DataError');
  });
});

describe('patchPhoto', () => {
  it('changes only the given fields', async () => {
    await db.savePhotos([photo('p1', { tags: ['dog'] })]);
    expect(await db.patchPhoto('p1', { favorite: true, folderIds: ['f1'] })).toBeUndefined();
    expect(await read('photos', 'p1')).toEqual({ ...photo('p1', { tags: ['dog'] }), favorite: true, folderIds: ['f1'], createdAt: T1, updatedAt: T1 });
  });
  it('does nothing for a photo that is not there', async () => {
    await db.patchPhoto('ghost', { favorite: true });
    expect(await db.listPhotos()).toEqual([]);
  });
  it('with no fields leaves the photo as it was', async () => {
    const [p] = await db.savePhotos([photo('p1')]);
    await db.patchPhoto('p1', {});
    expect(await read('photos', 'p1')).toEqual(p);
  });
  it('fails, changing nothing, when a field cannot be stored', async () => {
    const [p] = await db.savePhotos([photo('p1')]);
    expect((await errorOf(db.patchPhoto('p1', { favorite: true, bad: () => {} }))).name).toBe('AbortError');
    expect(await read('photos', 'p1')).toEqual(p);
  });
});

describe('savePhotos', () => {
  it('stamps and saves each photo, and returns them', async () => {
    const out = await db.savePhotos([photo('a'), { name: 'new', folderIds: [] }]);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ ...photo('a'), createdAt: T1, updatedAt: T1 });
    expect(out[1].id).toMatch(UUID_RE);
    expect(await db.listPhotos()).toHaveLength(2);
  });
  it('updates the change time but keeps the creation time', async () => {
    const [p] = await db.savePhotos([photo('a')]);
    at(T2);
    const [again] = await db.savePhotos([{ ...p, name: 'renamed' }]);
    expect(again.createdAt).toBe(T1);
    expect(again.updatedAt).toBe(T2);
    expect((await read('photos', 'a')).name).toBe('renamed');
  });
  it('saves nothing for an empty list', async () => {
    expect(await db.savePhotos([])).toEqual([]);
    expect(await db.listPhotos()).toEqual([]);
  });
  it('fails for a photo that cannot be stored', async () => {
    expect((await errorOf(db.savePhotos([photo('a', { bad: Symbol('x') })]))).name).toBe('DataCloneError');
  });
});

describe('deletePhotos', () => {
  const seed = async () => {
    await db.addPhoto(photo('a'), new Uint8Array([1]), new Uint8Array([11]));
    await db.addPhoto(photo('b'), new Uint8Array([2]), new Uint8Array([22]));
    await db.saveBoard(board('withA', [{ id: 'a' }, null, { id: 'b' }]));
    await db.saveBoard(board('withoutA', [{ id: 'b' }]));
  };
  it('removes the photos, their thumbnails and big pictures', async () => {
    await seed();
    await db.deletePhotos(['a']);
    expect((await db.listPhotos()).map((p) => p.id)).toEqual(['b']);
    expect(await db.getThumb('a')).toBeUndefined();
    expect(await db.getFile('a')).toBeNull();
    expect(await db.getThumb('b')).toEqual(new Uint8Array([22]));
  });
  it('takes them off board pages, and re-stamps only the boards that changed', async () => {
    await seed();
    at(T2);
    await db.deletePhotos(['a']);
    const withA = await db.getBoard('withA'), withoutA = await db.getBoard('withoutA');
    expect(withA.pages[0].images).toEqual([null, null, { id: 'b' }]);
    expect(withA.updatedAt).toBe(T2);
    expect(withA.createdAt).toBe(T1);
    expect(withoutA.pages[0].images).toEqual([{ id: 'b' }]);
    expect(withoutA.updatedAt).toBe(T1);
  });
  it('removes several at once', async () => {
    await seed();
    await db.deletePhotos(['a', 'b']);
    expect(await db.listPhotos()).toEqual([]);
    expect((await db.getBoard('withoutA')).pages[0].images).toEqual([null]);
  });
  it('does nothing for no ids or unknown ids', async () => {
    await seed();
    await db.deletePhotos([]);
    await db.deletePhotos(['zzz']);
    expect(await db.listPhotos()).toHaveLength(2);
    expect((await db.getBoard('withA')).updatedAt).toBe(T1);
  });
});

describe('keepForUndo and putBack', () => {
  it('keeps everything needed to put deleted photos back', async () => {
    await db.addPhoto(photo('a'), new Uint8Array([1, 1]), new Uint8Array([11]));
    await db.addPhoto(photo('b'), new Uint8Array([2]), new Uint8Array([22]));
    await db.saveBoard(board('withA', [null, { id: 'a' }]));
    await db.saveBoard(board('other', [{ id: 'b' }, null]));
    const kept = await db.keepForUndo(['a', 'missing']);
    expect(kept.items).toHaveLength(1);
    expect(kept.items[0].p).toEqual(await read('photos', 'a'));
    expect(kept.items[0].thumb).toEqual(new Uint8Array([11]));
    expect(kept.items[0].full).toEqual(new Uint8Array([1, 1]));
    expect(kept.boards.map((b) => b.id)).toEqual(['withA']);
  });
  it('turns a picture kept as a Blob into an ArrayBuffer', async () => {
    await db.savePhotos([photo('old')]);
    await write('files', { id: 'old', full: new Blob([new Uint8Array([3, 4])]) });
    const { items } = await db.keepForUndo(['old']);
    expect(items[0].full).toBeInstanceOf(ArrayBuffer);
    expect(Array.from(new Uint8Array(items[0].full))).toEqual([3, 4]);
    expect(items[0].thumb).toBeUndefined();
  });
  it('keeps a board whose photo is on any of its pages', async () => {
    await db.savePhotos([photo('a'), photo('b')]);
    await db.saveBoard({ id: 'two-pages', name: 'x', pages: [{ images: [{ id: 'b' }] }, { images: [null, { id: 'a' }] }] });
    await db.saveBoard({ id: 'empty', name: 'y', pages: [] });
    const { boards } = await db.keepForUndo(['a']);
    expect(boards.map((b) => b.id)).toEqual(['two-pages']);
  });
  it('keeps a photo whose big picture is missing', async () => {
    await db.savePhotos([photo('a')]);
    const { items } = await db.keepForUndo(['a']);
    expect(items).toHaveLength(1);
    expect(items[0].full).toBeUndefined();
    expect(items[0].thumb).toBeUndefined();
  });
  it('keeps nothing for no ids', async () => {
    await db.savePhotos([photo('a')]);
    expect(await db.keepForUndo([])).toEqual({ items: [], boards: [] });
  });
  it('puts deleted photos, thumbnails, pictures and boards back as they were', async () => {
    await db.addPhoto(photo('a'), new Uint8Array([1, 1]), new Uint8Array([11]));
    await db.saveBoard(board('withA', [{ id: 'a' }]));
    const before = { photos: await read('photos'), thumbs: await read('thumbs'), files: await read('files'), boards: await read('boards') };
    const kept = await db.keepForUndo(['a']);
    at(T2);
    await db.deletePhotos(['a']);
    await db.putBack(kept);
    expect({ photos: await read('photos'), thumbs: await read('thumbs'), files: await read('files'), boards: await read('boards') }).toEqual(before);
  });
  it('skips a missing thumbnail or picture', async () => {
    await db.listPhotos();
    await db.putBack({ items: [{ p: photo('a'), thumb: undefined, full: null }], boards: [] });
    expect(await read('photos', 'a')).toEqual(photo('a'));
    expect(await read('thumbs', 'a')).toBeUndefined();
    expect(await read('files', 'a')).toBeUndefined();
  });
  it('puts back nothing for empty lists', async () => {
    await db.putBack({ items: [], boards: [] });
    expect(await db.listPhotos()).toEqual([]);
  });
  it('fails without the kept lists', async () => {
    expect(await errorOf(db.putBack({}))).toBeInstanceOf(TypeError);
  });
});

describe('folders', () => {
  it('saveFolder stamps and saves a folder, and listFolders lists it', async () => {
    const f = await db.saveFolder({ name: 'Beach' });
    expect(f).toEqual({ name: 'Beach', id: f.id, createdAt: T1, updatedAt: T1 });
    expect(f.id).toMatch(UUID_RE);
    expect(await db.listFolders()).toEqual([f]);
  });
  it('saveFolder keeps an existing id and creation time', async () => {
    const f = await db.saveFolder({ name: 'Beach' });
    at(T2);
    const again = await db.saveFolder({ ...f, name: 'Shore' });
    expect(again).toEqual({ name: 'Shore', id: f.id, createdAt: T1, updatedAt: T2 });
    expect(await db.listFolders()).toEqual([again]);
  });
  it('deleteFolder removes the folder but keeps its photos, taking the folder off them', async () => {
    const f = await db.saveFolder({ id: 'f1', name: 'Beach' });
    await db.savePhotos([photo('a', { folderIds: ['f1', 'f2'] }), photo('b', { folderIds: ['f1'] }), photo('c', { folderIds: ['f2'] })]);
    at(T2);
    await db.deleteFolder(f.id);
    expect(await db.listFolders()).toEqual([]);
    const byId = Object.fromEntries((await db.listPhotos()).map((p) => [p.id, p]));
    expect(byId.a.folderIds).toEqual(['f2']);
    expect(byId.b.folderIds).toEqual([]);
    expect(byId.c.folderIds).toEqual(['f2']);
    expect(byId.a.updatedAt).toBe(T2);
    expect(byId.b.updatedAt).toBe(T2);
    expect(byId.c.updatedAt).toBe(T1);
  });
  it('deleteFolder of an unknown folder changes nothing', async () => {
    await db.saveFolder({ id: 'f1', name: 'Beach' });
    await db.savePhotos([photo('a', { folderIds: ['f1'] })]);
    await db.deleteFolder('nope');
    expect(await db.listFolders()).toHaveLength(1);
    expect((await read('photos', 'a')).folderIds).toEqual(['f1']);
  });
  it('restoreFolder puts the folder back as it was and its photos in it', async () => {
    const f = { id: 'f1', name: 'Beach', createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-02T00:00:00.000Z' };
    await db.savePhotos([photo('a', { folderIds: ['f2'] }), photo('b', { folderIds: ['f1'] }), photo('c')]);
    await db.restoreFolder(f, ['a', 'b', 'gone']);
    expect(await db.listFolders()).toEqual([f]);
    const byId = Object.fromEntries((await db.listPhotos()).map((p) => [p.id, p]));
    expect(byId.a.folderIds).toEqual(['f2', 'f1']);
    expect(byId.b.folderIds).toEqual(['f1']);
    expect(byId.c.folderIds).toEqual([]);
  });
  it('restoreFolder with no photos just puts the folder back', async () => {
    await db.restoreFolder({ id: 'f1', name: 'Beach' }, []);
    expect(await db.listFolders()).toEqual([{ id: 'f1', name: 'Beach' }]);
  });
  it('restoreFolder fails, changing nothing, when a photo has no folder list', async () => {
    await db.listPhotos();
    await write('photos', { id: 'odd' });
    expect((await errorOf(db.restoreFolder({ id: 'f1', name: 'Beach' }, ['odd']))).name).toBe('AbortError');
    expect(await db.listFolders()).toEqual([]);
  });
});

describe('boards', () => {
  it('saveBoard stamps and saves a board, and getBoard reads it', async () => {
    const b = await db.saveBoard(board(undefined, []));
    expect(b.id).toMatch(UUID_RE);
    expect(b.createdAt).toBe(T1);
    expect(b.updatedAt).toBe(T1);
    expect(await db.getBoard(b.id)).toEqual(b);
  });
  it('getBoard is undefined for an unknown board', async () => {
    expect(await db.getBoard('nope')).toBeUndefined();
  });
  it('listBoards puts the most recently changed first', async () => {
    await db.saveBoard(board('old', []));
    at(T3);
    await db.saveBoard(board('newest', []));
    at(T2);
    await db.saveBoard(board('middle', []));
    expect((await db.listBoards()).map((b) => b.id)).toEqual(['newest', 'middle', 'old']);
  });
  it('listBoards is empty with no boards', async () => {
    expect(await db.listBoards()).toEqual([]);
  });
  it('deleteBoard removes only that board', async () => {
    await db.saveBoard(board('a', []));
    await db.saveBoard(board('b', []));
    expect(await db.deleteBoard('a')).toBeUndefined();
    expect((await db.listBoards()).map((b) => b.id)).toEqual(['b']);
    await db.deleteBoard('not-there');
    expect(await db.listBoards()).toHaveLength(1);
  });
});

describe('stickers', () => {
  it('saveSticker stamps and saves a sticker, and listStickers lists it', async () => {
    const s = await db.saveSticker({ kind: 'star', x: 0.2, y: 0.3 });
    expect(s).toEqual({ kind: 'star', x: 0.2, y: 0.3, id: s.id, createdAt: T1, updatedAt: T1 });
    expect(await db.listStickers()).toEqual([s]);
  });
  it('saveSticker updates a sticker in place', async () => {
    const s = await db.saveSticker({ kind: 'star' });
    at(T2);
    await db.saveSticker({ ...s, kind: 'heart' });
    expect(await db.listStickers()).toEqual([{ ...s, kind: 'heart', updatedAt: T2 }]);
  });
  it('deleteSticker removes it, and an unknown id is harmless', async () => {
    const s = await db.saveSticker({ kind: 'star' });
    await db.deleteSticker('nope');
    expect(await db.listStickers()).toHaveLength(1);
    await db.deleteSticker(s.id);
    expect(await db.listStickers()).toEqual([]);
  });
});

describe('failed saves', () => {
  it('a save stopped by the browser before it finishes fails, and nothing is saved', async () => {
    await db.listPhotos();
    abortTransactions('readwrite');
    expect(await failed(db.saveFolder({ name: 'Beach' }))).toBe(true);
    vi.restoreAllMocks();
    expect(await db.listFolders()).toEqual([]);
  });
  it('a save aborted with no reason says the phone may be out of space', async () => {
    await db.listPhotos();
    abortTransactions('readwrite');
    const e = await errorOf(db.putBack({ items: [], boards: [] }));
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Could not save. Your phone may be out of space.');
  });
  it('a read stopped before it finishes fails too', async () => {
    await db.listPhotos();
    abortTransactions('readonly');
    expect(await failed(db.listBoards())).toBe(true);
  });
});
