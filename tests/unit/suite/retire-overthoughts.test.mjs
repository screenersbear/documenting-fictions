// data/retire-overthoughts.js: as the shelf starts, what Overthoughts kept
// on the phone goes (Starky, 15 Nov): its database, its localStorage keys,
// its offline copy and its service worker. Nothing of the other notebooks'.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { open } from '../shared/fake-idb.mjs';

let R;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  vi.resetModules();
  delete window.DFRetire;
  await import('../../../data/retire-overthoughts.js');
  R = window.DFRetire;
});
afterEach(() => { vi.restoreAllMocks(); delete window.DFRetire; });

const dbNames = async () => (await indexedDB.databases()).map((d) => d.name).sort();
async function makeDb(name) { (await open(name, 1, (db) => db.createObjectStore('entries'))).close(); }
// A phone's service workers and offline copies, as far as these use them.
function worker(scopes) {
  const regs = scopes.map((scope) => ({ scope, unregister: vi.fn(async () => true) }));
  return { regs, serviceWorker: { getRegistrations: async () => regs } };
}
function caches(names) {
  const have = new Set(names);
  return { have, keys: async () => [...have], delete: vi.fn(async (k) => have.delete(k)) };
}
const phone = (o = {}) => ({ localStorage, indexedDB, navigator: worker([]), caches: caches([]), ...o });

describe('itsKey', () => {
  it("is Overthoughts' own keys and the shelf's keys for it", () => {
    for (const k of ['overthoughts-book', 'overthoughts-start', 'overthoughts-journal-moved', 'df-suite-welcomed-overthoughts']) expect(R.itsKey(k)).toBe(true);
  });
  it("leaves every other notebook's keys", () => {
    for (const k of ['ref-notebook-book', 'rounds-book', 'df-suite-welcomed-rounds', 'dailies_state_v1', 'my-overthoughts-x', 'overthoughts', 'df-suite-in']) expect(R.itsKey(k)).toBe(false);
  });
});

describe('retireOverthoughts', () => {
  it("takes its database off the phone, and only its own", async () => {
    await makeDb('overthoughts');
    await makeDb('ref-notebook');
    await makeDb('rounds');
    await R.retireOverthoughts(phone());
    expect(await dbNames()).toEqual(['ref-notebook', 'rounds']);
  });
  it('takes its localStorage keys, and the shelf going back into it', () => {
    localStorage.setItem('overthoughts-book', 'leaf');
    localStorage.setItem('overthoughts-journal-moved', '2026-11-01');
    localStorage.setItem('df-suite-welcomed-overthoughts', '1');
    localStorage.setItem('df-suite-welcomed-rounds', '1');
    localStorage.setItem('ref-notebook-book', 'ocean');
    localStorage.setItem('df-suite-in', 'overthoughts');
    return R.retireOverthoughts(phone()).then(() => {
      expect(Object.keys(localStorage).sort()).toEqual(['df-suite-welcomed-rounds', 'ref-notebook-book']);
    });
  });
  it('leaves the shelf going back into another notebook', async () => {
    localStorage.setItem('df-suite-in', 'rounds');
    await R.retireOverthoughts(phone());
    expect(localStorage.getItem('df-suite-in')).toBe('rounds');
  });
  it('takes its service worker and offline copies, and no one else\'s', async () => {
    const w = worker(['https://x.io/documenting-fictions/', 'https://x.io/documenting-fictions/overthoughts/', 'https://x.io/documenting-fictions/rounds/']);
    const c = caches(['overthoughts-v18', 'overthoughts-v17', 'df-suite-v44', 'rounds-v14']);
    await R.retireOverthoughts(phone({ navigator: w, caches: c }));
    expect(w.regs.map((r) => r.unregister.mock.calls.length)).toEqual([0, 1, 0]);
    expect([...c.have].sort()).toEqual(['df-suite-v44', 'rounds-v14']);
  });
  it("does each part it can where another can't run", async () => {
    await makeDb('overthoughts');
    localStorage.setItem('overthoughts-book', 'leaf');
    const c = caches(['overthoughts-v18']);
    await R.retireOverthoughts({ localStorage, indexedDB, navigator: {}, caches: c });
    expect(await dbNames()).toEqual([]);
    expect(localStorage.getItem('overthoughts-book')).toBeNull();
    expect([...c.have]).toEqual([]);
    await expect(R.retireOverthoughts({ localStorage: null, indexedDB: null, navigator: null, caches: null })).resolves.toBeUndefined();
    const broken = { deleteDatabase: () => { throw new Error('denied'); } };
    await expect(R.retireOverthoughts(phone({ indexedDB: broken }))).resolves.toBeUndefined();
  });
  it('is done when another tab holds it open, or it was never there', async () => {
    await expect(R.retireOverthoughts(phone())).resolves.toBeUndefined();
    const req = {};
    const blocked = { deleteDatabase: () => { queueMicrotask(() => req.onblocked()); return req; } };
    await expect(R.retireOverthoughts(phone({ indexedDB: blocked }))).resolves.toBeUndefined();
    const failed = {};
    const fails = { deleteDatabase: () => { queueMicrotask(() => failed.onerror()); return failed; } };
    await expect(R.retireOverthoughts(phone({ indexedDB: fails }))).resolves.toBeUndefined();
  });
  it('runs by itself as the shelf starts', async () => {
    await makeDb('overthoughts');
    localStorage.setItem('overthoughts-book', 'leaf');
    vi.resetModules();
    await import('../../../data/retire-overthoughts.js');
    await vi.waitFor(async () => expect(await dbNames()).toEqual([]));
    expect(localStorage.getItem('overthoughts-book')).toBeNull();
  });
});
