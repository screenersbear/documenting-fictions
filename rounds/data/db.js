// Storage. The only file that knows about IndexedDB (the database 'rounds'):
//   people    one record per person (data/person.js)
//   moves     a line for each move done: { id, personId, kind, day }
//   photos    photos added for people, as plain bytes (never Blobs: Safari
//             keeps stored Blobs as files, and saving again can break them)
//   messages  the starter messages the user rewrote: { kind, text }
//   settings  small settings: { key, value }
// The suite's backup (data/suite-backup.js) copies the whole database.
const DB_NAME = 'rounds';
const KEYS = { people: 'id', moves: 'id', photos: 'id', messages: 'kind', settings: 'key' };

let dbPromise = null;
function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    // Version 1: the upgrade only runs when the database is first made.
    req.onupgradeneeded = () => {
      for (const [s, keyPath] of Object.entries(KEYS)) req.result.createObjectStore(s, { keyPath });
    };
    req.onsuccess = () => {
      req.result.onversionchange = () => { req.result.close(); dbPromise = null; };
      resolve(req.result);
    };
    req.onerror = () => { dbPromise = null; reject(req.error); };
  });
  return dbPromise;
}

async function tx(store, mode, fn) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction([store], mode);
    let out;
    t.oncomplete = () => resolve(out);
    // A failed write aborts the transaction, which then carries that write's error.
    t.onabort = () => reject(t.error || new Error("That wasn't saved. Your phone may be out of space."));
    fn(t.objectStore(store), (v) => { out = v; });
  });
}
const all = (store) => tx(store, 'readonly', (s, set) => { s.getAll().onsuccess = (e) => set(e.target.result); });
const one = (store, key) => tx(store, 'readonly', (s, set) => { s.get(key).onsuccess = (e) => set(e.target.result); });
const put = (store, value) => tx(store, 'readwrite', (s) => { s.put(value); });
const drop = (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); });

export const listPeople = () => all('people');
export const getPerson = (id) => one('people', id);
export const savePeople = (list) => tx('people', 'readwrite', (s) => { list.forEach((p) => s.put(p)); });
export const savePerson = (p) => put('people', p);

export const logMove = (m) => put('moves', m);
export const listMoves = () => all('moves');
export const dropMove = (id) => drop('moves', id);

// A photo as a Blob, fresh each time (null if there's none).
export async function getPhoto(id) {
  const r = await one('photos', id);
  return r ? new Blob([r.bytes], { type: r.type }) : null;
}
export const savePhoto = (id, bytes, type) => put('photos', { id, bytes, type });
export const dropPhoto = (id) => drop('photos', id);

// The rewritten starter messages, { kind: text }.
export async function getMessages() {
  return Object.fromEntries((await all('messages')).map((r) => [r.kind, r.text]));
}
export const saveMessage = (kind, text) => put('messages', { kind, text });
export const resetMessage = (kind) => drop('messages', kind);

export async function getSetting(key, fallback) {
  const r = await one('settings', key);
  return r === undefined ? fallback : r.value;
}
export const setSetting = (key, value) => put('settings', { key, value });
