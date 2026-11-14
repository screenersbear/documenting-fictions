// @vitest-environment node
// rounds/data/db.js: Rounds' IndexedDB storage (people, moves, photos,
// messages, settings, passed, tombstones), run against fake-indexeddb. The
// node environment gives the real Blob class. Times are faked (Date only),
// so each change's stamp is known.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';

let db;
const T1 = '2026-11-14T10:00:00.000Z';
const T2 = '2026-11-14T11:00:00.000Z';
const at = (r, made = T1, changed = made) => ({ ...r, createdAt: made, updatedAt: changed });
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory(); // a brand new, empty IndexedDB per test
  vi.resetModules(); // the open connection is cached in the module
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(T1));
  db = await import('../../../rounds/data/db.js');
});

const open = () => new Promise((resolve, reject) => {
  const r = indexedDB.open('rounds');
  r.onsuccess = () => resolve(r.result);
  r.onerror = () => reject(r.error);
});

describe('the database', () => {
  it('is called rounds, with its seven stores and their keys', async () => {
    await db.listPeople();
    const d = await open();
    expect([...d.objectStoreNames].sort()).toEqual(['messages', 'moves', 'passed', 'people', 'photos', 'settings', 'tombstones']);
    const t = d.transaction([...d.objectStoreNames]);
    expect(['people', 'moves', 'photos', 'messages', 'settings', 'passed', 'tombstones'].map((s) => t.objectStore(s).keyPath)).toEqual(['id', 'id', 'id', 'kind', 'key', 'id', 'id']);
    expect(d.version).toBe(2);
    d.close();
  });
  it('from version 1 (before 14 Nov), keeps everything and adds the two new stores', async () => {
    await new Promise((resolve, reject) => {
      const r = indexedDB.open('rounds', 1);
      r.onupgradeneeded = () => {
        for (const [s, keyPath] of Object.entries({ people: 'id', moves: 'id', photos: 'id', messages: 'kind', settings: 'key' })) r.result.createObjectStore(s, { keyPath });
        r.transaction.objectStore('people').put({ id: 'a', name: 'Ana' });
        r.transaction.objectStore('settings').put({ key: 'perDay', value: 4 });
      };
      r.onsuccess = () => { r.result.close(); resolve(); };
      r.onerror = () => reject(r.error);
    });
    expect(await db.listPeople()).toEqual([{ id: 'a', name: 'Ana' }]);
    expect(await db.getSetting('perDay', 3)).toBe(4);
    expect(await db.listPassed()).toEqual([]);
    const d = await open();
    expect(d.version).toBe(2);
    expect([...d.objectStoreNames]).toContain('tombstones');
    d.close();
  });
  it('keeps its stores when opened again', async () => {
    await db.savePerson({ id: 'a', name: 'Ana' });
    vi.resetModules();
    const again = await import('../../../rounds/data/db.js');
    expect(await again.listPeople()).toEqual([at({ id: 'a', name: 'Ana' })]);
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
  it('saves, reads and replaces people, stamped when made and when changed', async () => {
    expect(await db.getPerson('a')).toBe(undefined);
    await db.savePeople([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }]);
    vi.setSystemTime(new Date(T2));
    await db.savePerson({ ...(await db.getPerson('a')), name: 'Ana L.' });
    expect(await db.getPerson('a')).toEqual(at({ id: 'a', name: 'Ana L.' }, T1, T2));
    expect(await db.getPerson('b')).toEqual(at({ id: 'b', name: 'Bo' }));
    expect((await db.listPeople()).map((p) => p.name)).toEqual(['Ana L.', 'Bo']);
  });
  it('saved as it was, a person is left alone (no new stamp, nothing for sync)', async () => {
    const heard = vi.fn();
    db.onSyncedChange(heard);
    await db.savePerson({ id: 'a', name: 'Ana' });
    expect(heard).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date(T2));
    await db.savePerson({ id: 'a', name: 'Ana', updatedAt: 'old' });
    await db.savePeople([]);
    expect(await db.getPerson('a')).toEqual(at({ id: 'a', name: 'Ana' }));
    expect(heard).toHaveBeenCalledTimes(1);
    await db.savePeople([{ id: 'a', name: 'Ana' }, { id: 'b', name: 'Bo' }]);
    expect(heard).toHaveBeenCalledTimes(2);
  });
  it('keeps a first-made time a record brings with it', async () => {
    await db.savePerson({ id: 'a', name: 'Ana', createdAt: '2026-01-01T00:00:00.000Z' });
    expect((await db.getPerson('a')).createdAt).toBe('2026-01-01T00:00:00.000Z');
  });
  it('logs moves', async () => {
    await db.logMove({ id: 'm1', personId: 'a', kind: 'thanks', day: '2026-11-14' });
    expect(await db.listMoves()).toEqual([at({ id: 'm1', personId: 'a', kind: 'thanks', day: '2026-11-14' })]);
  });
  it('takes a move back off the log (undo), and keeps that it was', async () => {
    const heard = vi.fn();
    db.onSyncedChange(heard);
    await db.logMove({ id: 'm1', personId: 'a' });
    await db.logMove({ id: 'm2', personId: 'b' });
    vi.setSystemTime(new Date(T2));
    await db.dropMove('m1');
    expect(await db.listMoves()).toEqual([at({ id: 'm2', personId: 'b' })]);
    expect((await db.exportData()).tombstones).toEqual([{ id: 'm1', store: 'moves', deletedAt: T2, createdAt: T2, updatedAt: T2 }]);
    expect(heard).toHaveBeenCalledTimes(3);
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
    expect((await db.exportData()).tombstones.map((t) => [t.id, t.store])).toEqual([['pitch', 'messages']]);
  });
  it('a message written again after going back to the example forgets the deletion', async () => {
    await db.saveMessage('pitch', 'Hi');
    await db.resetMessage('pitch');
    await db.saveMessage('pitch', 'Hello again');
    expect(await db.getMessages()).toEqual({ pitch: 'Hello again' });
    expect((await db.exportData()).tombstones).toEqual([]);
  });
  it('keeps settings, with a fallback for one never set', async () => {
    expect(await db.getSetting('perDay', 3)).toBe(3);
    await db.setSetting('perDay', 5);
    await db.setSetting('pick', null);
    expect(await db.getSetting('perDay', 3)).toBe(5);
    expect(await db.getSetting('pick', 'x')).toBe(null);
  });
  it("stamps the settings that sync carries, and tells sync; not the day's pick", async () => {
    const heard = vi.fn();
    db.onSyncedChange(heard);
    await db.setSetting('pick', { date: 'x' });
    await db.setSetting('eyeSeen', ['s1']);
    expect(heard).not.toHaveBeenCalled();
    for (const k of ['perDay', 'workDays', 'offer', 'city']) await db.setSetting(k, 1);
    expect(heard).toHaveBeenCalledTimes(4);
    expect(db.SYNCED_SETTINGS).toEqual(['perDay', 'workDays', 'offer', 'city']);
  });
});

describe('the passed list', () => {
  it('keeps the leads passed on', async () => {
    expect(await db.listPassed()).toEqual([]);
    await db.addPassed([{ id: 'x', name: 'Abrams', instagram: '' }, { id: 'y', name: 'Bloc', instagram: 'bloc' }]);
    expect(await db.listPassed()).toEqual([at({ id: 'x', name: 'Abrams', instagram: '' }), at({ id: 'y', name: 'Bloc', instagram: 'bloc' })]);
  });
});

describe('for sync', () => {
  it('exportData: what sync carries, a message by its kind and a setting by its key, never photos or the pick', async () => {
    await db.savePerson({ id: 'a', name: 'Ana' });
    await db.logMove({ id: 'm1', personId: 'a', kind: 'thanks' });
    await db.saveMessage('thanks', 'Hi');
    await db.setSetting('city', 'Hoboken');
    await db.setSetting('pick', { date: 'x' });
    await db.savePhoto('a', new Uint8Array([1]).buffer, 'image/jpeg');
    await db.addPassed([{ id: 'p', name: 'Bloc' }]);
    expect(await db.exportData()).toEqual({
      people: [at({ id: 'a', name: 'Ana' })],
      moves: [at({ id: 'm1', personId: 'a', kind: 'thanks' })],
      messages: [at({ id: 'thanks', text: 'Hi' })],
      settings: [at({ id: 'city', value: 'Hoboken' })],
      passed: [at({ id: 'p', name: 'Bloc' })],
      tombstones: [],
    });
  });
  it('applySync puts and deletes what came from the other devices, quietly', async () => {
    const heard = vi.fn();
    await db.savePerson({ id: 'gone', name: 'X' });
    await db.logMove({ id: 'm1', personId: 'a' });
    await db.saveMessage('pitch', 'old');
    db.onSyncedChange(heard);
    const changed = await db.applySync(
      { people: [{ id: 'a', name: 'Ana' }], messages: [{ id: 'thanks', text: 'Hi', updatedAt: T2 }], settings: [{ id: 'city', value: 'Hoboken' }], tombstones: [{ id: 'pitch', store: 'messages' }] },
      { moves: ['m1'], messages: ['pitch'] },
    );
    expect(changed).toBe(true);
    expect(heard).not.toHaveBeenCalled();
    expect((await db.listPeople()).map((p) => p.id)).toEqual(['a', 'gone']);
    expect(await db.listMoves()).toEqual([]);
    expect(await db.getMessages()).toEqual({ thanks: 'Hi' });
    expect(await db.getSetting('city', '')).toBe('Hoboken');
    expect((await db.exportData()).tombstones).toEqual([{ id: 'pitch', store: 'messages' }]);
  });
  it('applySync with nothing to do changes nothing', async () => {
    expect(await db.applySync({}, {})).toBe(false);
    expect(await db.applySync({ people: [] }, { moves: [] })).toBe(false);
  });
});
