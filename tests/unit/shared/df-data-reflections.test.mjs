// shared/df-data.js: Overthoughts' own database and the reflection helpers
// (overthoughts, reflectionId, linkId, saveReflections, dropReflections, reflections).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { forceCloseDatabase, IDBDatabase } from 'fake-indexeddb';
import { loadDFData, makeDb, rawAll } from './_env.mjs';

let D;
const NOW = Date.UTC(2026, 10, 12, 10, 0, 0);
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const iso = (t) => new Date(t).toISOString();

describe('overthoughts', () => {
  it('makes the database with its stores and indexes', async () => {
    const db = await D.overthoughts();
    expect(db.name).toBe('overthoughts');
    expect(db.version).toBe(1);
    expect([...db.objectStoreNames].sort()).toEqual(['entries', 'images', 'links', 'reviews']);
    const tx = db.transaction(['entries', 'images', 'links', 'reviews']);
    const entries = tx.objectStore('entries');
    expect(entries.keyPath).toBe('id');
    expect([...entries.indexNames].sort()).toEqual(['kind', 'shootId']);
    expect(entries.index('kind').keyPath).toBe('kind');
    expect(entries.index('shootId').keyPath).toBe('shootId');
    expect(tx.objectStore('images').keyPath).toBeNull();
    expect(tx.objectStore('reviews').keyPath).toBe('id');
    const links = tx.objectStore('links');
    expect(links.keyPath).toBe('id');
    expect(links.index('from').keyPath).toEqual(['fromApp', 'fromId']);
    expect(links.index('to').keyPath).toEqual(['toApp', 'toId']);
  });
  it('hands back the same connection while it stays open', async () => {
    const a = D.overthoughts();
    const b = D.overthoughts();
    expect(a).toBe(b);
    expect(await a).toBe(await b);
  });
  it('opens again once the browser closes the connection', async () => {
    const first = await D.overthoughts();
    forceCloseDatabase(first);
    const second = await D.overthoughts();
    expect(second).not.toBe(first);
    expect(await D.overthoughts()).toBe(second);
  });
  it('tries again on the next call after opening failed', async () => {
    (await makeDb('overthoughts', { other: {} }, 7)).close();
    await expect(D.overthoughts()).rejects.toMatchObject({ name: 'VersionError' });
    await new Promise((r) => indexedDB.deleteDatabase('overthoughts').onsuccess = r);
    const db = await D.overthoughts();
    expect(db.version).toBe(1);
  });
});

describe('reflectionId and linkId', () => {
  it('names a reflection after its shoot', () => {
    expect(D.reflectionId('s1')).toBe('reflection-s1');
    expect(D.reflectionId(42)).toBe('reflection-42');
    expect(D.reflectionId('')).toBe('reflection-');
  });
  it('names a link from where it came from and where it went', () => {
    expect(D.linkId('the-eye', 's1', 'overthoughts', 'reflection-s1')).toBe('the-eye:s1>overthoughts:reflection-s1');
    expect(D.linkId('ref', 1, 'the-eye', 2)).toBe('ref:1>the-eye:2');
  });
  it('keeps odd characters as they are', () => {
    expect(D.linkId('a:b', 'c>d', '', undefined)).toBe('a:b:c>d>:undefined');
  });
});

const shoot = (over = {}) => ({ id: 's1', date: '2026-11-01', status: 'delivered', whatWentRight: 'light', couldBeBetter: 'sound', lessonsLearned: 'plan', ...over });

describe('saveReflections', () => {
  it('does nothing (opens nothing) for an empty list', async () => {
    expect(await D.saveReflections([])).toBeUndefined();
    expect((await indexedDB.databases()).length).toBe(0);
  });
  it("writes a shoot's reflection and the link from The Eye to it", async () => {
    await D.saveReflections([{ shoot: shoot({ archived: 1, capturedAt: '2026-11-01T08:00:00.000Z' }), name: 'Ana', at: '2026-11-02T00:00:00.000Z' }]);
    const db = await D.overthoughts();
    expect(await rawAll(db, 'entries')).toEqual([['reflection-s1', {
      id: 'reflection-s1', kind: 'reflection', shootId: 's1', shootName: 'Ana', date: '2026-11-01', shootStatus: 'delivered', archived: true,
      wentRight: 'light', couldBeBetter: 'sound', takeaway: 'plan', tags: [], from: 'the-eye', editedIn: 'the-eye',
      createdAt: '2026-11-01T08:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z',
    }]]);
    expect(await rawAll(db, 'links')).toEqual([['the-eye:s1>overthoughts:reflection-s1', {
      id: 'the-eye:s1>overthoughts:reflection-s1', fromApp: 'the-eye', fromId: 's1', toApp: 'overthoughts', toId: 'reflection-s1', type: 'reflection', createdAt: iso(NOW),
    }]]);
  });
  it('fills in what a bare shoot leaves out', async () => {
    vi.setSystemTime(new Date(2026, 2, 4, 15, 0));
    await D.saveReflections([{ shoot: { id: 'bare' } }]);
    const [[, e]] = await rawAll(await D.overthoughts(), 'entries');
    expect(e).toEqual({
      id: 'reflection-bare', kind: 'reflection', shootId: 'bare', shootName: 'Untitled shoot', date: '2026-03-04', shootStatus: '', archived: false,
      wentRight: '', couldBeBetter: '', takeaway: '', tags: [], from: 'the-eye', editedIn: 'the-eye', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  });
  it('keeps what an earlier save had (tags, name, date, when it was made) and takes the new words', async () => {
    await D.saveReflections([{ shoot: shoot({ capturedAt: '2026-10-01T00:00:00.000Z' }), name: 'First name' }]);
    const db = await D.overthoughts();
    const [[, first]] = await rawAll(db, 'entries');
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put({ ...first, tags: ['mine'], extra: 'kept' });
    await new Promise((r) => { tx.oncomplete = r; });
    expect((await rawAll(db, 'links'))[0][1].createdAt).toBe(iso(NOW));
    vi.setSystemTime(NOW + 86400000);
    await D.saveReflections([{ shoot: { id: 's1', lessonsLearned: 'new', reflectionUpdatedAt: '2026-11-20T00:00:00.000Z' } }]);
    const [[, e]] = await rawAll(db, 'entries');
    expect(e).toMatchObject({ shootName: 'First name', date: '2026-11-01', tags: ['mine'], extra: 'kept', takeaway: 'new', wentRight: '', createdAt: '2026-10-01T00:00:00.000Z', updatedAt: '2026-11-20T00:00:00.000Z' });
    // The link, saved again, takes the entry's own createdAt.
    expect((await rawAll(db, 'links'))[0][1].createdAt).toBe('2026-10-01T00:00:00.000Z');
  });
  it("uses the earlier save's updatedAt when nothing newer is given", async () => {
    await D.saveReflections([{ shoot: shoot(), at: '2026-01-01T00:00:00.000Z' }]);
    await D.saveReflections([{ shoot: shoot() }]);
    const [[, e]] = await rawAll(await D.overthoughts(), 'entries');
    expect(e.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });
  it('gives the link the time now when the earlier entry had no createdAt', async () => {
    const db = await D.overthoughts();
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put({ id: 'reflection-s1', kind: 'reflection' });
    await new Promise((r) => { tx.oncomplete = r; });
    await D.saveReflections([{ shoot: shoot() }]);
    expect((await rawAll(db, 'links'))[0][1].createdAt).toBe(iso(NOW));
    expect((await rawAll(db, 'entries'))[0][1].createdAt).toBe(iso(NOW));
  });
  it('does not take over a free entry that happens to have the same id', async () => {
    const db = await D.overthoughts();
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put({ id: 'reflection-s1', kind: 'free', tags: ['x'], createdAt: '2000-01-01T00:00:00.000Z' });
    await new Promise((r) => { tx.oncomplete = r; });
    await D.saveReflections([{ shoot: shoot() }]);
    const [[, e]] = await rawAll(db, 'entries');
    expect(e.kind).toBe('reflection');
    expect(e.tags).toEqual([]);
    expect(e.createdAt).toBe(iso(NOW));
  });
  it('saves many at once', async () => {
    await D.saveReflections([{ shoot: shoot({ id: 'a' }) }, { shoot: shoot({ id: 'b' }) }, { shoot: shoot({ id: 'c' }) }]);
    const db = await D.overthoughts();
    expect((await rawAll(db, 'entries')).map(([k]) => k)).toEqual(['reflection-a', 'reflection-b', 'reflection-c']);
    expect((await rawAll(db, 'links')).length).toBe(3);
  });
});

describe('dropReflections', () => {
  async function seed() {
    await D.saveReflections([
      { shoot: { id: 'empty' } },
      { shoot: { id: 'right', whatWentRight: 'x' } },
      { shoot: { id: 'better', couldBeBetter: 'y' } },
      { shoot: { id: 'take', lessonsLearned: 'z' } },
      { shoot: { id: 'blank', whatWentRight: '  ', couldBeBetter: '\n', lessonsLearned: '' } },
      { shoot: { id: 'other' } },
    ]);
    return D.overthoughts();
  }
  it('removes the empty reflections of deleted shoots and their links, keeping any with words in', async () => {
    const db = await seed();
    await D.dropReflections(['empty', 'right', 'better', 'take', 'blank']);
    expect((await rawAll(db, 'entries')).map(([k]) => k)).toEqual(['reflection-better', 'reflection-other', 'reflection-right', 'reflection-take']);
    expect((await rawAll(db, 'links')).map(([, l]) => l.fromId).sort()).toEqual(['better', 'other', 'right', 'take']);
  });
  it('does nothing for shoots it has no reflection for, or an empty list (not even an empty save)', async () => {
    const db = await seed();
    const real = IDBDatabase.prototype.transaction;
    const saves = vi.spyOn(IDBDatabase.prototype, 'transaction').mockImplementation(function (names, mode) { return real.call(this, names, mode); });
    expect(await D.dropReflections(['nope'])).toBeUndefined();
    expect(await D.dropReflections([])).toBeUndefined();
    expect(saves.mock.calls.filter(([, mode]) => mode === 'readwrite')).toEqual([]);
    expect((await rawAll(db, 'entries')).length).toBe(6);
    expect((await rawAll(db, 'links')).length).toBe(6);
  });
  it('leaves links that point elsewhere', async () => {
    const db = await seed();
    const tx = db.transaction('links', 'readwrite');
    tx.objectStore('links').put({ id: 'ref:b>overthoughts:x', toId: 'reflection-zzz' });
    await new Promise((r) => { tx.oncomplete = r; });
    await D.dropReflections(['empty']);
    const ids = (await rawAll(db, 'links')).map(([k]) => k);
    expect(ids).toContain('ref:b>overthoughts:x');
    expect(ids).not.toContain('the-eye:empty>overthoughts:reflection-empty');
    expect(ids.length).toBe(6);
  });
});

describe('reflections', () => {
  it('lists only the reflection entries', async () => {
    await D.saveReflections([{ shoot: { id: 'a' } }, { shoot: { id: 'b' } }]);
    const db = await D.overthoughts();
    const tx = db.transaction('entries', 'readwrite');
    tx.objectStore('entries').put({ id: 'free-1', kind: 'free' });
    await new Promise((r) => { tx.oncomplete = r; });
    expect((await D.reflections()).map((e) => e.id)).toEqual(['reflection-a', 'reflection-b']);
  });
  it('is empty with nothing saved', async () => {
    expect(await D.reflections()).toEqual([]);
  });
  it('gives the whole entries', async () => {
    await D.saveReflections([{ shoot: shoot(), name: 'N' }]);
    const [e] = await D.reflections();
    expect(e).toMatchObject({ id: 'reflection-s1', shootName: 'N', takeaway: 'plan' });
  });
});
