// Storage. The only file that knows about Rounds' IndexedDB (the database 'rounds'):
//   people      one record per person (data/person.js)
//   moves       a line for each move done: { id, personId, kind, day, due, step, at }
//   photos      photos added for people, as plain bytes (never Blobs: Safari
//               keeps stored Blobs as files, and saving again can break them)
//   messages    the starter messages the user rewrote: { kind, text }
//   settings    small settings: { key, value }
//   passed      leads from Claude's inbox left unticked, never offered again:
//               { id, name, instagram }
//   tombstones  what was deleted (a move undone, a message back to the example),
//               so sync deletes it on the other devices: { id, store, deletedAt }
// What sync carries (everything but photos and the day's pick) is stamped
// createdAt/updatedAt when it changes, and sync (data/sync.js) hears of it.
// Back up (shared/data/backups.js) copies the whole database; the
// sync key and its bookkeeping are kept apart, in data/device.js.
import { sameContent } from './merge.js';
import { nowISO } from '../components/util.js';

const DB_NAME = 'rounds';
const KEYS = { people: 'id', moves: 'id', photos: 'id', messages: 'kind', settings: 'key', passed: 'id', tombstones: 'id' };
// The settings that go to the other devices (not the day's pick, nor what this phone has seen).
export const SYNCED_SETTINGS = ['perDay', 'workDays', 'daysOff', 'offer', 'city'];

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    // Version 2 (14 Nov) added passed and tombstones; every store missing is made.
    const req = indexedDB.open(DB_NAME, 2);
    req.onupgradeneeded = () => {
      for (const [s, keyPath] of Object.entries(KEYS)) if (!req.result.objectStoreNames.contains(s)) req.result.createObjectStore(s, { keyPath });
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); dbPromise = null; };
      resolve(req.result);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function tx(stores, mode, fn) {
  const db = await openDb();
  const names = [].concat(stores);
  return new Promise((resolve, reject) => {
    const t = db.transaction(names, mode);
    let out;
    t.oncomplete = () => resolve(out);
    // A failed write aborts the transaction, which then carries that write's error.
    t.onabort = () => reject(t.error || new Error("That wasn't saved. Your phone may be out of space."));
    fn(...names.map((n) => t.objectStore(n)), (v) => { out = v; });
  });
}
const all = (store) => tx(store, 'readonly', (s, set) => { s.getAll().onsuccess = (e) => set(e.target.result); });
const one = (store, key) => tx(store, 'readonly', (s, set) => { s.get(key).onsuccess = (e) => set(e.target.result); });
const put = (store, value) => tx(store, 'readwrite', (s) => { s.put(value); });
const drop = (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); });

// Sync hears of every change of yours (a few seconds later it sends them);
// its own writes (applySync) are quiet.
let heard = () => {};
export const onSyncedChange = (fn) => { heard = fn; };
// Anything else that hears of your changes (the one list of people,
// data/people-out.js): photos too, which sync doesn't carry.
const others = [];
export const onChange = (fn) => { others.push(fn); };
const tellOthers = () => others.forEach((fn) => fn());

// Saves records that changed, stamped (when first made, when last changed);
// one saved as it was is left alone, so nothing is sent for nothing. A
// deletion of the same record is forgotten: it's back.
async function putStamped(store, list) {
  const now = nowISO();
  const changed = await tx([store, 'tombstones'], 'readwrite', (s, tombs, set) => {
    let n = 0;
    set(n);
    for (const r of list) {
      const key = r[s.keyPath];
      s.get(key).onsuccess = (e) => {
        const old = e.target.result;
        if (old && sameContent(old, r)) return;
        s.put({ ...r, createdAt: (old && old.createdAt) || r.createdAt || now, updatedAt: now });
        tombs.delete(key);
        set(++n);
      };
    }
  });
  if (changed) { heard(); tellOthers(); }
}
// Deletes a record (or a list of them), and keeps that it was deleted.
async function dropStamped(store, keys) {
  const now = nowISO();
  await tx([store, 'tombstones'], 'readwrite', (s, tombs) => {
    for (const key of [].concat(keys)) {
      s.delete(key);
      tombs.put({ id: key, store, deletedAt: now, createdAt: now, updatedAt: now });
    }
  });
  heard();
  tellOthers();
}

export const listPeople = () => all('people');
export const getPerson = (id) => one('people', id);
export const savePeople = (list) => putStamped('people', list);
export const savePerson = (p) => putStamped('people', [p]);
export const dropPerson = (id) => dropStamped('people', id);

export const logMove = (m) => putStamped('moves', [m]);
export const logMoves = (list) => putStamped('moves', list);
export const listMoves = () => all('moves');
export const dropMove = (id) => dropStamped('moves', id);
export const dropMoves = (ids) => dropStamped('moves', ids);

// A photo as a Blob, fresh each time (null if there's none).
export async function getPhoto(id) {
  const r = await one('photos', id);
  return r ? new Blob([r.bytes], { type: r.type }) : null;
}
export const savePhoto = (id, bytes, type) => put('photos', { id, bytes, type }).then(tellOthers);
export const dropPhoto = (id) => drop('photos', id).then(tellOthers);
// Whose photos there are (their ids), without reading the photos.
export const photoIds = () => tx('photos', 'readonly', (s, set) => { s.getAllKeys().onsuccess = (e) => set(e.target.result); });

// The rewritten starter messages, { kind: text }.
export async function getMessages() {
  return Object.fromEntries((await all('messages')).map((r) => [r.kind, r.text]));
}
export const saveMessage = (kind, text) => putStamped('messages', [{ kind, text }]);
export const resetMessage = (kind) => dropStamped('messages', kind);

export async function getSetting(key, fallback) {
  const r = await one('settings', key);
  return r === undefined ? fallback : r.value;
}
export const setSetting = (key, value) => (SYNCED_SETTINGS.includes(key) ? putStamped('settings', [{ key, value }]) : put('settings', { key, value }));

export const listPassed = () => all('passed');
export const addPassed = (list) => putStamped('passed', list);

// ---- For sync (data/sync.js) ----
// Everything sync carries, each record by an id: a message by its kind, a setting by its key.
const SYNCED = ['people', 'moves', 'messages', 'settings', 'passed', 'tombstones'];
const AS_ID = { messages: 'kind', settings: 'key' };
const toFile = (s, r) => {
  if (!AS_ID[s]) return r;
  const { [AS_ID[s]]: id, ...rest } = r;
  return { id, ...rest };
};
const fromFile = (s, r) => {
  if (!AS_ID[s]) return r;
  const { id, ...rest } = r;
  return { [AS_ID[s]]: id, ...rest };
};

export async function exportData() {
  const lists = await Promise.all(SYNCED.map((s) => all(s)));
  const out = Object.fromEntries(SYNCED.map((s, i) => [s, lists[i].map((r) => toFile(s, r))]));
  out.settings = out.settings.filter((r) => SYNCED_SETTINGS.includes(r.id));
  return out;
}

// What sync takes in from the other devices: puts and dels as { store: [...] }.
// Quiet (sync isn't told of its own writes). True when anything changed here.
export async function applySync(puts, dels) {
  const stores = SYNCED.filter((s) => (puts[s] || []).length || (dels[s] || []).length);
  if (!stores.length) return false;
  await tx(stores, 'readwrite', (...os) => {
    stores.forEach((s, i) => {
      for (const r of puts[s] || []) os[i].put(fromFile(s, r));
      for (const id of dels[s] || []) os[i].delete(id);
    });
  });
  return true;
}
