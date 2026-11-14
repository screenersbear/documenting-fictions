// @vitest-environment node
// rounds/data/db.js: Rounds' IndexedDB storage (people, moves, photos,
// messages, settings), run against fake-indexeddb. The node environment
// gives the real Blob class.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

let db;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory(); // a brand new, empty IndexedDB per test
  vi.resetModules(); // the open connection is cached in the module
  vi.restoreAllMocks();
  db = await import('../../../rounds/data/db.js');
});

const open = () => new Promise((resolve, reject) => {
  const r = indexedDB.open('rounds');
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

describe('the database', () => {
  it('is called rounds, with its five stores and their keys', async () => {
    await db.listPeople();
    const d = await open();
    expect([...d.objectStoreNames].sort()).toEqual(['messages', 'moves', 'people', 'photos', 'settings']);
    const t = d.transaction([...d.objectStoreNames]);
    expect(['people', 'moves', 'photos', 'messages', 'settings'].map((s) => t.objectStore(s).keyPath)).toEqual(['id', 'id', 'id', 'kind', 'key']);
    expect(d.version).toBe(1);
    d.close();
  });
  it('keeps its stores when opened again', async () => {
    await db.savePerson({ id: 'a', name: 'Ana' });
    vi.resetModules();
    const again = await import('../../../rounds/data/db.js');
    expect(await again.listPeople()).toEqual([{ id: 'a', name: 'Ana' }]);
  });
  it('lets go of its connection when asked (a newer version, a restore), and opens again after', async () => {
    await db.savePerson({ id: 'a', name: 'Ana' });
    await new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase('rounds');
      r.onsuccess = resolve;
      r.onblocked = () => reject(new Error('still open'));
    });
    expect(await db.listPeople()).toEqual([]);
  });
  it('says plainly when it can\'t open, and tries again next time', async () => {
    const real = indexedDB.open.bind(indexedDB);
    const spy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      const r = {};
      setTimeout(() => { r.error = new Error('blocked'); r.onerror(); });
      return r;
    });
    await expect(db.listPeople()).rejects.toThrow('blocked');
    spy.mockImplementation(real);
    expect(await db.listPeople()).toEqual([]);
  });
});

describe('people and moves', () => {
  it('saves, reads and replaces people', async () => {
    expect(await db.getPerson('a')).toBe(undefined);
    await db.savePeople([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }]);
    await db.savePerson({ id: 'a', name: 'Ana L.' });
    expect(await db.getPerson('a')).toEqual({ id: 'a', name: 'Ana L.' });
    expect((await db.listPeople()).map((p) => p.name)).toEqual(['Ana L.', 'Bo']);
  });
  it('logs moves', async () => {
    await db.logMove({ id: 'm1', personId: 'a', kind: 'thanks', day: '2026-11-14' });
    expect(await db.listMoves()).toEqual([{ id: 'm1', personId: 'a', kind: 'thanks', day: '2026-11-14' }]);
  });
  it('takes a move back off the log (undo)', async () => {
    await db.logMove({ id: 'm1', personId: 'a' });
    await db.logMove({ id: 'm2', personId: 'b' });
    await db.dropMove('m1');
    expect(await db.listMoves()).toEqual([{ id: 'm2', personId: 'b' }]);
  });
  it('says plainly when a save fails', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function () { this.transaction.abort(); });
    await expect(db.savePerson({ id: 'a' })).rejects.toThrow("That wasn't saved. Your phone may be out of space.");
  });
  it('passes on the error a failed save carries', async () => {
    await db.savePerson({ id: 'a' });
    await expect(db.savePerson({ name: 'no id' })).rejects.toThrow();
  });
});

describe('photos', () => {
  it('keeps a photo as bytes and gives it back as a Blob', async () => {
    expect(await db.getPhoto('a')).toBe(null);
    const bytes = new Uint8Array([1, 2, 3]).buffer;
    await db.savePhoto('a', bytes, 'image/jpeg');
    const blob = await db.getPhoto('a');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2, 3]);
    await db.dropPhoto('a');
    expect(await db.getPhoto('a')).toBe(null);
  });
});

describe('messages and settings', () => {
  it('keeps the messages rewritten, and drops one back to the example', async () => {
    expect(await db.getMessages()).toEqual({});
    await db.saveMessage('thanks', 'Thanks, [name]!');
    await db.saveMessage('pitch', 'Hi');
    expect(await db.getMessages()).toEqual({ thanks: 'Thanks, [name]!', pitch: 'Hi' });
    await db.resetMessage('pitch');
    expect(await db.getMessages()).toEqual({ thanks: 'Thanks, [name]!' });
  });
  it('keeps settings, with a fallback for one never set', async () => {
    expect(await db.getSetting('perDay', 3)).toBe(3);
    await db.setSetting('perDay', 5);
    await db.setSetting('pick', null);
    expect(await db.getSetting('perDay', 3)).toBe(5);
    expect(await db.getSetting('pick', 'x')).toBe(null);
  });
});
