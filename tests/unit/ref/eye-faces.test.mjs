// @vitest-environment node
// ref/data/eye-faces.js: people's photos from The Eye's own database
// (Starky, 21 Nov: someone added in The Eye showed in Ref without their photo).
import { describe, it, expect, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { talentKeys, readEyePhotos, eyeFaces } from '../../../ref/data/eye-faces.js';

const put = (idb, values) => new Promise((done, fail) => {
  const req = idb.open('starky-moodboards', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('images');
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('images', 'readwrite');
    for (const [k, v] of Object.entries(values)) tx.objectStore('images').put(v, k);
    tx.oncomplete = () => { db.close(); done(); };
    tx.onerror = fail;
  };
  req.onerror = fail;
});

const shoots = [
  { id: 's1', date: '2026-10-01', talents: [{ id: 't1', name: ' Maya ', socialHandles: [{ platform: 'instagram', handle: '@maya.rr' }] }, { id: 't2', name: '' }, null, { name: 'No id' }] },
  { id: 's2', updatedAt: '2026-11-01', talents: [{ id: 't3', name: 'Jules', socialHandles: [{ platform: 'tiktok', handle: 'jules' }, null] }] },
  { id: 's3', talents: [{ id: 't4', name: 'Undated' }] },
  { id: '', talents: [{ id: 't5', name: 'Lost' }] },
  { id: 's4' },
  null,
];

describe('talentKeys', () => {
  it('lists each talent with a name or handle, newest shoot first, with its photo key', () => {
    expect(talentKeys(shoots)).toEqual([
      { who: { name: 'Jules', instagram: '', tiktok: 'jules' }, key: 's2__talent_t3' },
      { who: { name: 'Maya', instagram: 'maya.rr', tiktok: '' }, key: 's1__talent_t1' },
      { who: { name: 'Undated', instagram: '', tiktok: '' }, key: 's3__talent_t4' },
    ]);
  });
  it('is empty with no shoots', () => {
    expect(talentKeys(undefined)).toEqual([]);
    expect(talentKeys('nope')).toEqual([]);
  });
});

describe('readEyePhotos', () => {
  let idb;
  beforeEach(() => { idb = new IDBFactory(); });
  it('reads the pictures kept under the keys, as The Eye keeps them', async () => {
    await put(idb, { k1: ['data:one'], k2: [{ src: 'data:two' }], k3: [], k4: [{ nope: 1 }], k5: 'plain' });
    const got = await readEyePhotos(['k1', 'k2', 'k3', 'k4', 'k5', 'missing', 'k1', ''], idb);
    expect([...got]).toEqual([['k1', 'data:one'], ['k2', 'data:two']]);
  });
  it("makes The Eye's store if Ref opens it first", async () => {
    expect([...(await readEyePhotos(['k1'], idb))]).toEqual([]);
    await put(idb, { k1: ['data:one'] });
    expect([...(await readEyePhotos(['k1'], idb))]).toEqual([['k1', 'data:one']]);
  });
  it('is empty with no keys or no database', async () => {
    expect((await readEyePhotos([], idb)).size).toBe(0);
    expect((await readEyePhotos(undefined, idb)).size).toBe(0);
    expect((await readEyePhotos(['k1'], null)).size).toBe(0);
  });
  it('is empty when the database will not open', async () => {
    const throws = { open() { throw new Error('no'); } };
    expect((await readEyePhotos(['k1'], throws)).size).toBe(0);
    const fails = { open() { const r = {}; setTimeout(() => r.onerror && r.onerror()); return r; } };
    expect((await readEyePhotos(['k1'], fails)).size).toBe(0);
    const blocked = { open() { const r = {}; setTimeout(() => r.onblocked && r.onblocked()); return r; } };
    expect((await readEyePhotos(['k1'], blocked)).size).toBe(0);
  });
  it('is empty when the store cannot be read', async () => {
    let closed = false;
    const odd = { open() { const r = { result: { transaction() { throw new Error('no store'); }, close() { closed = true; } } }; setTimeout(() => r.onsuccess()); return r; } };
    expect((await readEyePhotos(['k1'], odd)).size).toBe(0);
    expect(closed).toBe(true);
  });
  it('carries on past a key it cannot read', async () => {
    const reqs = [];
    const store = { get(k) { const g = {}; reqs.push([k, g]); return g; } };
    const odd = { open() { const r = { result: { transaction: () => ({ objectStore: () => store }), close() {} } }; setTimeout(() => { r.onsuccess(); reqs[0][1].onerror(); reqs[1][1].result = ['data:b']; reqs[1][1].onsuccess(); }); return r; } };
    expect([...(await readEyePhotos(['a', 'b'], odd))]).toEqual([['b', 'data:b']]);
  });
});

describe('eyeFaces', () => {
  const records = [{ id: 'p1', name: 'Maya' }, { id: 'p2', name: 'Jules' }, { id: 'p3', name: 'Undated' }];
  const find = (list, who) => list.find((r) => r.name === who.name) || null;
  it("gives each person their photo from The Eye, the newest shoot's", async () => {
    const asked = [];
    const read = async (keys) => { asked.push(...keys); return new Map([['s2__talent_t3', 'data:jules'], ['s1__talent_t1', 'data:maya']]); };
    const two = [...shoots, { id: 's0', date: '2025-01-01', talents: [{ id: 't9', name: 'Maya' }] }];
    const got = await eyeFaces(records, two, find, new Map(), read);
    expect([...got]).toEqual([['p2', 'data:jules'], ['p1', 'data:maya']]);
    expect(asked).toEqual(['s2__talent_t3', 's1__talent_t1', 's3__talent_t4']);
  });
  it('leaves out people with a photo already, or no one to match', async () => {
    const read = async (keys) => new Map(keys.map((k) => [k, `data:${k}`]));
    const got = await eyeFaces(records, shoots, (list, who) => (who.name === 'Maya' ? null : find(list, who)), new Map([['p2', 'x']]), read);
    expect([...got]).toEqual([['p3', 'data:s3__talent_t4']]);
  });
  it('reads The Eye by default', async () => {
    globalThis.indexedDB = new IDBFactory();
    await put(globalThis.indexedDB, { s2__talent_t3: ['data:jules'] });
    expect([...(await eyeFaces(records, shoots, find))]).toEqual([['p2', 'data:jules']]);
  });
});
