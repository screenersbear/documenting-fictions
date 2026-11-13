// A stand-in for df-data.js (window.DFData) for Overthoughts' store tests:
// the same small IndexedDB helpers, run on fake-indexeddb, with a fixed clock
// and fixed ids so results can be checked exactly. Not a test file itself.
import { vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

// A brand-new, empty IndexedDB for each test.
export function freshIndexedDB() {
  globalThis.indexedDB = new IDBFactory();
  return globalThis.indexedDB;
}

// The same shape as df-data.js's helpers.
export function open(name, version, upgrade) {
  return new Promise((ok, no) => {
    const r = indexedDB.open(name, version);
    if (upgrade) r.onupgradeneeded = (e) => upgrade(r.result, e.oldVersion, r.transaction);
    r.onsuccess = () => { const db = r.result; db.onversionchange = () => db.close(); ok(db); };
    r.onerror = () => no(r.error);
    r.onblocked = () => no(new Error("Close this app's other tabs and try again."));
  });
}
const finish = (tx) => new Promise((ok, no) => {
  tx.oncomplete = () => ok();
  tx.onabort = tx.onerror = () => no(tx.error || new Error("That wasn't saved."));
});
export function rows(db, store) {
  return new Promise((ok, no) => {
    const out = [];
    const r = db.transaction(store).objectStore(store).openCursor();
    r.onsuccess = () => { const c = r.result; if (!c) { ok(out); return; } out.push([c.key, c.value]); c.continue(); };
    r.onerror = () => no(r.error);
  });
}
export const getOne = (db, store, key) => new Promise((ok, no) => {
  const r = db.transaction(store).objectStore(store).get(key);
  r.onsuccess = () => ok(r.result);
  r.onerror = () => no(r.error);
});
export async function putMany(db, store, list) {
  const tx = db.transaction(store, 'readwrite');
  const os = tx.objectStore(store);
  list.forEach((v) => { if (os.keyPath) os.put(v); else os.put(v[1], v[0]); });
  return finish(tx);
}
export async function deleteOne(db, store, key) {
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  return finish(tx);
}

// Overthoughts' database, as df-data.js makes it.
export function overthoughtsSchema(db) {
  const entries = db.createObjectStore('entries', { keyPath: 'id' });
  entries.createIndex('kind', 'kind');
  entries.createIndex('shootId', 'shootId');
  db.createObjectStore('images');
  db.createObjectStore('reviews', { keyPath: 'id' });
  const links = db.createObjectStore('links', { keyPath: 'id' });
  links.createIndex('from', ['fromApp', 'fromId']);
  links.createIndex('to', ['toApp', 'toId']);
}

export const NOW = '2026-11-12T10:00:00.000Z';
export const TODAY = '2026-11-12';

export function fakeDFData() {
  return {
    open: vi.fn(open),
    rows: vi.fn(rows),
    getOne: vi.fn(getOne),
    putMany: vi.fn(putMany),
    deleteOne: vi.fn(deleteOne),
    hasText: (v) => typeof v === 'string' && v.trim() !== '',
    nowIso: vi.fn(() => NOW),
    todayStr: vi.fn(() => TODAY),
    uid: vi.fn(() => 'uid-1'),
    overthoughts: vi.fn(() => open('overthoughts', 1, overthoughtsSchema)),
  };
}
