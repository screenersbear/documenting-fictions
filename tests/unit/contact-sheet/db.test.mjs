// contact-sheet/data/db.js: the only file that knows about IndexedDB. Normal
// behaviour runs on fake-indexeddb (a fresh database per test); failures it
// can't produce on cue (blocked upgrades, failed reads, aborted writes) use a
// small hand-driven stand-in.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const T0 = '2026-11-12T10:00:00.000Z';
const T1 = '2026-11-12T23:59:59.000Z';
const T2 = '2026-11-13T00:00:01.000Z';

let idb;
let db;

const at = (iso) => vi.setSystemTime(new Date(iso));
// What a promise rejected with (or what it resolved to, which then fails the
// Error checks): `rejects.toThrow` alone also passes for null or false.
const reason = (p) => p.then((v) => v, (e) => e);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(T0);
  idb = new IDBFactory();
  globalThis.indexedDB = idb;
  vi.resetModules(); // db.js keeps its open connection in the module
  db = await import('../../../contact-sheet/data/db.js');
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

// ---------- Raw access, to check what was really stored ----------

function rawOpen(version) {
  return new Promise((resolve, reject) => {
    const r = version ? idb.open('contact-sheet', version) : idb.open('contact-sheet');
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function raw(store, mode, fn) {
  await db.listProjects(); // the app creates the database first
  const d = await rawOpen();
  try {
    return await new Promise((resolve, reject) => {
      const t = d.transaction(store, mode);
      const req = fn(t.objectStore(store), t);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
    });
  } finally {
    d.close();
  }
}
const rawPut = (store, rec) => raw(store, 'readwrite', (s) => s.put(rec));
const rawGet = (store, key) => raw(store, 'readonly', (s) => s.get(key));
const rawKeys = (store) => raw(store, 'readonly', (s) => s.getAllKeys());

// ---------- A hand-driven stand-in for failures ----------

const later = (fn) => setTimeout(fn, 0);
const tooLong = (p) => Promise.race([p, new Promise((r) => setTimeout(() => r('still waiting'), 50))]);

// `store(t, name)` returns what t.objectStore(name) should.
function standIn(store) {
  const database = {
    transaction: vi.fn(() => {
      const t = { error: null };
      t.objectStore = (name) => store(t, name);
      return t;
    }),
  };
  globalThis.indexedDB = {
    open: vi.fn(() => {
      const req = {};
      later(() => {
        req.result = database;
        req.onsuccess();
      });
      return req;
    }),
  };
  return database;
}

// ---------- Opening ----------

describe('opening the database', () => {
  it('creates contact-sheet v1 with its four stores, keys and photo index', async () => {
    await db.listProjects();
    expect(await idb.databases()).toEqual([{ name: 'contact-sheet', version: 1 }]);
    const d = await rawOpen();
    expect([...d.objectStoreNames].sort()).toEqual(['meta', 'photos', 'projects', 'templates']);
    const t = d.transaction(['projects', 'templates', 'photos', 'meta'], 'readonly');
    expect(t.objectStore('projects').keyPath).toBe('id');
    expect(t.objectStore('templates').keyPath).toBe('id');
    expect(t.objectStore('photos').keyPath).toBe('id');
    expect(t.objectStore('meta').keyPath).toBe('key');
    expect([...t.objectStore('photos').indexNames]).toEqual(['projectId']);
    expect(t.objectStore('photos').index('projectId').keyPath).toBe('projectId');
    expect([...t.objectStore('projects').indexNames]).toEqual([]);
    d.close();
  });

  it('opens once and reuses the connection for every later call', async () => {
    const open = vi.spyOn(idb, 'open');
    await Promise.all([db.listProjects(), db.listTemplates(), db.getMeta('x')]);
    await db.saveProject({ name: 'a' });
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('contact-sheet', 1);
  });

  it('keeps stores (and what is in them) that already exist during an upgrade', async () => {
    const realOpen = idb.open.bind(idb);
    vi.spyOn(idb, 'open').mockImplementation((name, version) => {
      const req = realOpen(name, version);
      // Runs before the app's own onupgradeneeded handler.
      req.addEventListener('upgradeneeded', () => {
        const d = req.result;
        d.createObjectStore('projects', { keyPath: 'id' }).put({ id: 'old', name: 'Old', updatedAt: '2020-01-01' });
        d.createObjectStore('templates', { keyPath: 'id' });
        d.createObjectStore('photos', { keyPath: 'id' }).createIndex('projectId', 'projectId');
        d.createObjectStore('meta', { keyPath: 'key' }).put({ key: 'seen', value: 1 });
      });
      return req;
    });
    expect(await db.getProject('old')).toEqual({ id: 'old', name: 'Old', updatedAt: '2020-01-01' });
    expect(await db.getMeta('seen')).toBe(1);
    await db.addPhoto({ id: 'ph', projectId: 'old' });
    expect((await db.photosForProject('old')).map((p) => p.id)).toEqual(['ph']);
  });

  it('adds only the stores that are missing', async () => {
    const realOpen = idb.open.bind(idb);
    vi.spyOn(idb, 'open').mockImplementation((name, version) => {
      const req = realOpen(name, version);
      req.addEventListener('upgradeneeded', () => {
        req.result.createObjectStore('projects', { keyPath: 'id' });
        req.result.createObjectStore('meta', { keyPath: 'key' });
      });
      return req;
    });
    await db.saveTemplate({ id: 't' });
    await db.addPhoto({ id: 'p', projectId: 'x' });
    expect((await db.getTemplate('t')).id).toBe('t');
    expect((await db.photosForProject('x')).map((p) => p.id)).toEqual(['p']);
  });

  it('steps aside when another tab upgrades the database', async () => {
    await db.listProjects();
    const upgraded = await new Promise((resolve, reject) => {
      const r = idb.open('contact-sheet', 2);
      r.onsuccess = () => resolve(r.result);
      r.onblocked = () => reject(new Error('blocked by the open connection'));
      r.onerror = () => reject(r.error);
    });
    expect(upgraded.version).toBe(2);
    upgraded.close();
  });

  it('rejects with the open error when the stored database is newer', async () => {
    (await rawOpen(2)).close();
    await expect(tooLong(db.listProjects())).rejects.toMatchObject({ name: 'VersionError' });
  });

  it('asks to close other tabs when the upgrade is blocked', async () => {
    globalThis.indexedDB = {
      open: vi.fn(() => {
        const req = {};
        later(() => req.onblocked());
        return req;
      }),
    };
    const e = await reason(tooLong(db.getMeta('k')));
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Close Contact Sheet in your other tabs, then try again.');
  });

  it('really can try again: once the other tabs are closed, the next call opens', async () => {
    globalThis.indexedDB = { open: vi.fn(() => { const req = {}; later(() => req.onblocked()); return req; }) };
    await reason(tooLong(db.getMeta('k')));
    globalThis.indexedDB = idb;
    await db.setMeta('k', 'v');
    expect(await tooLong(db.getMeta('k'))).toBe('v');
  });

  it('opens again after stepping aside for another tab, rather than using the closed connection', async () => {
    await db.setMeta('k', 'v');
    await new Promise((resolve, reject) => {
      const r = idb.deleteDatabase('contact-sheet');
      r.onsuccess = resolve;
      r.onerror = () => reject(r.error);
      r.onblocked = () => reject(new Error('blocked by the open connection'));
    });
    expect(await tooLong(db.listProjects())).toEqual([]);
    expect(await tooLong(db.getMeta('k'))).toBeNull(); // a new, empty database
  });
});

// ---------- Failures inside a transaction ----------

describe('failed storage', () => {
  it('rejects with a failed read’s own error', async () => {
    const err = new Error('read failed');
    standIn((t) => ({
      getAll: () => {
        const req = {};
        later(() => {
          req.error = err;
          req.onerror();
          // Then, as in a browser, the error reaches the transaction (whose
          // error is still unset) and the transaction aborts.
          later(() => {
            t.onerror();
            t.error = err;
            t.onabort();
          });
        });
        return req;
      },
    }));
    await expect(tooLong(db.listProjects())).rejects.toBe(err);
  });

  it('rejects a single-record read the same way', async () => {
    const err = new Error('get failed');
    standIn((t) => ({
      get: () => {
        const req = {};
        later(() => {
          req.error = err;
          req.onerror();
          later(() => t.onerror());
        });
        return req;
      },
    }));
    await expect(tooLong(db.getProject('x'))).rejects.toBe(err);
  });

  it('rejects with the transaction’s error as soon as it reports one', async () => {
    const err = new Error('constraint');
    standIn((t) => ({
      put: () => {
        later(() => {
          t.error = err;
          t.onerror();
        });
        return {};
      },
    }));
    await expect(tooLong(db.setMeta('k', 1))).rejects.toBe(err);
  });

  it('rejects with the transaction’s error when a write is aborted, e.g. when storage is full', async () => {
    const quota = new Error('QuotaExceededError');
    standIn((t) => ({
      put: () => {
        later(() => {
          t.error = quota;
          t.onabort();
        });
        return {};
      },
    }));
    await expect(tooLong(db.saveProject({ name: 'big' }))).rejects.toBe(quota);
  });

  it('rejects with a plain message when a write is aborted without an error', async () => {
    standIn((t) => ({
      delete: () => {
        later(() => t.onabort());
        return {};
      },
    }));
    const e = await reason(tooLong(db.deleteTemplate('t')));
    expect(e).toBeInstanceOf(Error);
    expect(e.message).toBe('Storage was interrupted');
  });

  it('resolves with what the work returned once the transaction completes', async () => {
    const database = standIn((t) => ({
      getAll: () => {
        const req = {};
        later(() => {
          req.result = [{ id: 'b', sortOrder: 2 }, { id: 'a', sortOrder: 1 }];
          req.onsuccess();
          later(() => t.oncomplete());
        });
        return req;
      },
    }));
    await expect(tooLong(db.listTemplates())).resolves.toEqual([{ id: 'a', sortOrder: 1 }, { id: 'b', sortOrder: 2 }]);
    expect(database.transaction).toHaveBeenCalledWith(['templates'], 'readonly');
  });
});

// ---------- Projects ----------

describe('saveProject / getProject', () => {
  it('gives a new project an id and both timestamps, and stores it', async () => {
    const rec = await db.saveProject({ name: 'Beach', frames: [] });
    expect(rec).toEqual({ name: 'Beach', frames: [], id: expect.stringMatching(UUID), createdAt: T0, updatedAt: T0 });
    expect(await db.getProject(rec.id)).toEqual(rec);
    expect(await rawGet('projects', rec.id)).toEqual(rec);
  });
  it('keeps the id and creation time of an existing project and refreshes updatedAt', async () => {
    const first = await db.saveProject({ id: 'p1', name: 'A' });
    at(T1);
    const second = await db.saveProject({ ...first, name: 'B' });
    expect(second).toEqual({ id: 'p1', name: 'B', createdAt: T0, updatedAt: T1 });
    expect(await rawKeys('projects')).toEqual(['p1']);
  });
  it('does not change the object it was given', async () => {
    const input = { name: 'x' };
    await db.saveProject(input);
    expect(input).toEqual({ name: 'x' });
  });
  it('returns undefined for a project that is not there', async () => {
    expect(await db.getProject('missing')).toBeUndefined();
  });
  it('rejects a project that cannot be stored', async () => {
    await expect(db.saveProject({ name: 'x', run: () => 1 })).rejects.toMatchObject({ name: 'DataCloneError' });
  });
  it('rejects a lookup with no id', async () => {
    await expect(db.getProject(undefined)).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('listProjects', () => {
  it('returns nothing for a new database', async () => {
    expect(await db.listProjects()).toEqual([]);
  });
  it('lists the most recently edited first', async () => {
    at('2026-01-03T00:00:00.000Z');
    await db.saveProject({ id: 'a' });
    at('2026-01-01T00:00:00.000Z');
    await db.saveProject({ id: 'b' });
    at('2026-01-02T00:00:00.000Z');
    await db.saveProject({ id: 'c' });
    expect((await db.listProjects()).map((p) => p.id)).toEqual(['a', 'c', 'b']);
  });
  it('puts projects with no edit time last', async () => {
    await rawPut('projects', { id: '0' });
    await db.saveProject({ id: 'm' });
    at(T1);
    await db.saveProject({ id: 'z' });
    await rawPut('projects', { id: 'zz' });
    expect((await db.listProjects()).map((p) => p.id)).toEqual(['z', 'm', '0', 'zz']);
  });
});

describe('saveProjectThumb', () => {
  it('sets the thumb without moving the project in the list', async () => {
    await db.saveProject({ id: 'p', name: 'A' });
    at(T1);
    await db.saveProjectThumb('p', 'thumb-bytes');
    expect(await db.getProject('p')).toEqual({ id: 'p', name: 'A', createdAt: T0, updatedAt: T0, thumb: 'thumb-bytes' });
  });
  it('replaces an old thumb, even with nothing', async () => {
    await db.saveProject({ id: 'p', thumb: 'old' });
    await db.saveProjectThumb('p', null);
    expect((await db.getProject('p')).thumb).toBeNull();
  });
  it('does nothing for a project that is not there', async () => {
    await expect(db.saveProjectThumb('ghost', 'x')).resolves.toBeUndefined();
    expect(await db.getProject('ghost')).toBeUndefined();
    expect(await rawKeys('projects')).toEqual([]);
  });
  it('rejects a thumb with no project id', async () => {
    await expect(db.saveProjectThumb(undefined, 'x')).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('deleteProject', () => {
  it('deletes the project and only its photos', async () => {
    await db.saveProject({ id: 'p1' });
    await db.saveProject({ id: 'p2' });
    await db.addPhoto({ id: 'a', projectId: 'p1' });
    await db.addPhoto({ id: 'b', projectId: 'p1' });
    await db.addPhoto({ id: 'c', projectId: 'p2' });
    await db.deleteProject('p1');
    expect(await rawKeys('projects')).toEqual(['p2']);
    expect(await rawKeys('photos')).toEqual(['c']);
  });
  it('deletes a project with no photos', async () => {
    await db.saveProject({ id: 'p1' });
    await db.deleteProject('p1');
    expect(await db.listProjects()).toEqual([]);
  });
  it('does nothing for a project that is not there', async () => {
    await db.saveProject({ id: 'p1' });
    await db.addPhoto({ id: 'a', projectId: 'p1' });
    await expect(db.deleteProject('ghost')).resolves.toBeUndefined();
    expect(await rawKeys('projects')).toEqual(['p1']);
    expect(await rawKeys('photos')).toEqual(['a']);
  });
  it('rejects a delete with no id and deletes nothing', async () => {
    await db.addPhoto({ id: 'a', projectId: 'p1' });
    await expect(db.deleteProject(undefined)).rejects.toMatchObject({ name: 'DataError' });
    expect(await rawKeys('photos')).toEqual(['a']);
  });
});

describe('duplicateProject', () => {
  const seed = async () => {
    await db.saveProject({
      id: 'p1',
      name: 'Beach',
      ratio: '3:4',
      photoIds: ['ph1', 'ph2', 'ghost'],
      frames: [
        { id: 'f1', x: 0, photoId: 'ph1' },
        { id: 'f2', x: 1, photoId: null },
        { id: 'f3', x: 2, photoId: 'ghost' },
        { id: 'f4', x: 3, photoId: 'ph2' },
      ],
    });
    await db.addPhoto({ id: 'ph1', projectId: 'p1', name: 'one.jpg', original: 'bytes-1' });
    await db.addPhoto({ id: 'ph2', projectId: 'p1', name: 'two.jpg', original: 'bytes-2' });
    await db.addPhoto({ id: 'ph3', projectId: 'p2', name: 'other.jpg' });
  };

  it('copies the project and gives it its own copies of the photos', async () => {
    await seed();
    at(T2);
    const copy = await db.duplicateProject('p1', 'Beach copy');
    expect(copy.id).toMatch(UUID);
    expect(copy).toMatchObject({ name: 'Beach copy', ratio: '3:4', createdAt: T2, updatedAt: T2 });
    const photos = await db.photosForProject(copy.id);
    const byName = Object.fromEntries(photos.map((p) => [p.name, p]));
    expect(photos).toHaveLength(2);
    expect(byName['one.jpg']).toMatchObject({ projectId: copy.id, original: 'bytes-1', createdAt: T0 });
    expect(byName['two.jpg'].original).toBe('bytes-2');
    expect(byName['one.jpg'].id).not.toBe('ph1');
    expect(byName['one.jpg'].id).not.toBe(byName['two.jpg'].id);
    expect(copy.photoIds).toEqual([byName['one.jpg'].id, byName['two.jpg'].id]);
    expect(copy.frames).toEqual([
      { id: 'f1', x: 0, photoId: byName['one.jpg'].id },
      { id: 'f2', x: 1, photoId: null },
      { id: 'f3', x: 2, photoId: null },
      { id: 'f4', x: 3, photoId: byName['two.jpg'].id },
    ]);
    expect(await db.getProject(copy.id)).toEqual(copy);
  });

  it('leaves the original and its photos untouched, and survives the original being deleted', async () => {
    await seed();
    const copy = await db.duplicateProject('p1', 'Copy');
    const original = await db.getProject('p1');
    expect(original.name).toBe('Beach');
    expect(original.photoIds).toEqual(['ph1', 'ph2', 'ghost']);
    expect((await db.photosForProject('p1')).map((p) => p.id)).toEqual(['ph1', 'ph2']);
    await db.deleteProject('p1');
    expect(await db.photosForProject(copy.id)).toHaveLength(2);
    expect((await db.photosForProject('p2')).map((p) => p.id)).toEqual(['ph3']);
  });

  it('copies a project with no photo tray or photos', async () => {
    await db.saveProject({ id: 'bare', frames: [{ id: 'f', photoId: null }] });
    const copy = await db.duplicateProject('bare', 'Bare copy');
    expect(copy.photoIds).toEqual([]);
    expect(copy.frames).toEqual([{ id: 'f', photoId: null }]);
    expect(await rawKeys('photos')).toEqual([]);
  });

  it('returns null for a project that is not there', async () => {
    await expect(db.duplicateProject('ghost', 'x')).resolves.toBeNull();
    expect(await rawKeys('projects')).toEqual([]);
  });

  it('rejects a copy with no id', async () => {
    await expect(db.duplicateProject(undefined, 'x')).rejects.toMatchObject({ name: 'DataError' });
  });
});

// ---------- Photos ----------

describe('addPhoto / getPhoto', () => {
  it('stamps and stores a new photo', async () => {
    const rec = await db.addPhoto({ projectId: 'p', name: 'a.jpg' });
    expect(rec).toEqual({ projectId: 'p', name: 'a.jpg', id: expect.stringMatching(UUID), createdAt: T0, updatedAt: T0 });
    expect(await db.getPhoto(rec.id)).toEqual(rec);
  });
  it('keeps a photo’s own id and creation time', async () => {
    const rec = await db.addPhoto({ id: 'ph', projectId: 'p', createdAt: '2020-05-05T00:00:00.000Z' });
    expect(rec).toMatchObject({ id: 'ph', createdAt: '2020-05-05T00:00:00.000Z', updatedAt: T0 });
  });
  it('returns undefined for a photo that is not there', async () => {
    expect(await db.getPhoto('nope')).toBeUndefined();
  });
  it('rejects a photo that cannot be stored, and a lookup with no id', async () => {
    await expect(db.addPhoto({ projectId: 'p', bad: Symbol('s') })).rejects.toMatchObject({ name: 'DataCloneError' });
    await expect(db.getPhoto(undefined)).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('photosForProject', () => {
  it('returns only that project’s photos', async () => {
    await db.addPhoto({ id: 'b', projectId: 'p1' });
    await db.addPhoto({ id: 'a', projectId: 'p1' });
    await db.addPhoto({ id: 'c', projectId: 'p2' });
    expect((await db.photosForProject('p1')).map((p) => p.id)).toEqual(['a', 'b']);
    expect((await db.photosForProject('p2')).map((p) => p.id)).toEqual(['c']);
  });
  it('returns nothing for a project with no photos', async () => {
    expect(await db.photosForProject('none')).toEqual([]);
  });
  it('rejects a project id that is not a valid key', async () => {
    await expect(db.photosForProject(NaN)).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('deleteUnlistedPhotos', () => {
  const seed = async () => {
    for (const [id, projectId] of [['a', 'p1'], ['b', 'p1'], ['c', 'p1'], ['d', 'p2']]) await db.addPhoto({ id, projectId });
  };
  it('deletes the project’s photos not in the keep list, and no one else’s', async () => {
    await seed();
    await db.deleteUnlistedPhotos('p1', ['b', 'd']);
    expect(await rawKeys('photos')).toEqual(['b', 'd']);
  });
  it('deletes all of the project’s photos for an empty keep list', async () => {
    await seed();
    await db.deleteUnlistedPhotos('p1', []);
    expect(await rawKeys('photos')).toEqual(['d']);
  });
  it('keeps everything when every photo is listed, ignoring unknown ids', async () => {
    await seed();
    await db.deleteUnlistedPhotos('p1', ['a', 'b', 'c', 'zzz']);
    expect(await rawKeys('photos')).toEqual(['a', 'b', 'c', 'd']);
  });
  it('does nothing for a project with no photos', async () => {
    await seed();
    await db.deleteUnlistedPhotos('p9', []);
    expect(await rawKeys('photos')).toEqual(['a', 'b', 'c', 'd']);
  });
  it('rejects a keep list that is not a list, deleting nothing', async () => {
    await seed();
    expect(await reason(db.deleteUnlistedPhotos('p1', 5))).toBeInstanceOf(TypeError);
    await expect(db.deleteUnlistedPhotos(NaN, [])).rejects.toMatchObject({ name: 'DataError' });
    expect(await rawKeys('photos')).toEqual(['a', 'b', 'c', 'd']);
  });
});

// ---------- Templates ----------

describe('saveTemplate / getTemplate / deleteTemplate', () => {
  it('stamps, stores and finds a template', async () => {
    const rec = await db.saveTemplate({ name: 'Grid', ratio: '1:1' });
    expect(rec).toEqual({ name: 'Grid', ratio: '1:1', id: expect.stringMatching(UUID), createdAt: T0, updatedAt: T0 });
    expect(await db.getTemplate(rec.id)).toEqual(rec);
  });
  it('updates a template in place', async () => {
    await db.saveTemplate({ id: 't', name: 'A' });
    at(T1);
    await db.saveTemplate({ id: 't', name: 'B', createdAt: T0 });
    expect(await db.getTemplate('t')).toEqual({ id: 't', name: 'B', createdAt: T0, updatedAt: T1 });
  });
  it('deletes a template, and does nothing for one that is not there', async () => {
    await db.saveTemplate({ id: 't1' });
    await db.saveTemplate({ id: 't2' });
    await db.deleteTemplate('t1');
    await db.deleteTemplate('ghost');
    expect(await rawKeys('templates')).toEqual(['t2']);
    expect(await db.getTemplate('t1')).toBeUndefined();
  });
  it('rejects bad input', async () => {
    await expect(db.saveTemplate({ fn() {} })).rejects.toMatchObject({ name: 'DataCloneError' });
    await expect(db.getTemplate(undefined)).rejects.toMatchObject({ name: 'DataError' });
    await expect(db.deleteTemplate(undefined)).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('saveTemplates', () => {
  it('stamps and stores every template in one go', async () => {
    const recs = await db.saveTemplates([{ name: 'A', sortOrder: 0 }, { id: 'keep', name: 'B', sortOrder: 1 }]);
    expect(recs).toEqual([
      { name: 'A', sortOrder: 0, id: expect.stringMatching(UUID), createdAt: T0, updatedAt: T0 },
      { id: 'keep', name: 'B', sortOrder: 1, createdAt: T0, updatedAt: T0 },
    ]);
    expect(await db.listTemplates()).toEqual(recs);
  });
  it('stores nothing for an empty list', async () => {
    await expect(db.saveTemplates([])).resolves.toEqual([]);
    expect(await rawKeys('templates')).toEqual([]);
  });
  it('rejects something that is not a list', async () => {
    expect(await reason(db.saveTemplates(undefined))).toBeInstanceOf(TypeError);
  });
});

describe('listTemplates', () => {
  it('returns nothing for a new database', async () => {
    expect(await db.listTemplates()).toEqual([]);
  });
  it('orders by sortOrder (missing counts as 0), then by when they were made', async () => {
    await db.saveTemplate({ id: 'a', sortOrder: 2, createdAt: '2026-01-01' });
    await db.saveTemplate({ id: 'b', createdAt: '2026-02-01' });
    await db.saveTemplate({ id: 'c', sortOrder: -1, createdAt: '2026-03-01' });
    await db.saveTemplate({ id: 'd', sortOrder: 0, createdAt: '2026-01-15' });
    await rawPut('templates', { id: 'e', sortOrder: 0 });
    await db.saveTemplate({ id: 'f', sortOrder: 1, createdAt: '2026-05-01' });
    expect((await db.listTemplates()).map((t) => t.id)).toEqual(['c', 'e', 'd', 'b', 'f', 'a']);
  });
  it('keeps two templates with no order or date in stored order', async () => {
    await rawPut('templates', { id: 'y' });
    await rawPut('templates', { id: 'x' });
    expect((await db.listTemplates()).map((t) => t.id)).toEqual(['x', 'y']);
  });
});

// ---------- Settings ----------

describe('getMeta / setMeta', () => {
  it('stores a setting under its key and reads it back', async () => {
    await db.setMeta('view', 'grid');
    expect(await db.getMeta('view')).toBe('grid');
    expect(await rawGet('meta', 'view')).toEqual({ key: 'view', value: 'grid' });
  });
  it('returns the fallback, null by default, for a missing setting', async () => {
    expect(await db.getMeta('nope')).toBeNull();
    expect(await db.getMeta('nope', 'list')).toBe('list');
  });
  it('returns stored falsy values rather than the fallback', async () => {
    await db.setMeta('zero', 0);
    await db.setMeta('off', false);
    await db.setMeta('empty', '');
    expect(await db.getMeta('zero', 9)).toBe(0);
    expect(await db.getMeta('off', true)).toBe(false);
    expect(await db.getMeta('empty', 'x')).toBe('');
  });
  it('overwrites a setting', async () => {
    await db.setMeta('n', 1);
    await db.setMeta('n', { a: [1, 2] });
    expect(await db.getMeta('n')).toEqual({ a: [1, 2] });
    expect(await rawKeys('meta')).toEqual(['n']);
  });
  it('rejects a setting with no key', async () => {
    await expect(db.getMeta(undefined)).rejects.toMatchObject({ name: 'DataError' });
    await expect(db.setMeta(undefined, 1)).rejects.toMatchObject({ name: 'DataError' });
  });
});

// ---------- askToPersist ----------

describe('askToPersist', () => {
  const setStorage = (value) => Object.defineProperty(navigator, 'storage', { value, configurable: true });
  afterEach(() => {
    delete navigator.storage;
  });

  it('asks the browser to keep stored photos', () => {
    const persist = vi.fn(() => Promise.resolve(true));
    setStorage({ persist });
    expect(db.askToPersist()).toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(1);
  });
  it('ignores a refusal', async () => {
    const refused = Promise.reject(new Error('denied'));
    const caught = vi.spyOn(refused, 'catch');
    setStorage({ persist: () => refused });
    expect(() => db.askToPersist()).not.toThrow();
    expect(caught).toHaveBeenCalledTimes(1);
    await Promise.resolve();
  });
  it('does nothing where the browser has no storage manager or no persist', () => {
    expect(navigator.storage).toBeUndefined();
    expect(() => db.askToPersist()).not.toThrow();
    setStorage({});
    expect(() => db.askToPersist()).not.toThrow();
  });
  it('swallows a persist that throws', () => {
    const persist = vi.fn(() => {
      throw new Error('not allowed');
    });
    setStorage({ persist });
    expect(() => db.askToPersist()).not.toThrow();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
